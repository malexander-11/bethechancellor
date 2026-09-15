import type { ZodType } from 'zod';
import { DataError } from './errors.js';
import {
  householdsReferenceSchema,
  leverSchema,
  presetsFileSchema,
  ruleSetSchema,
  sourcesFileSchema,
  vintageSchema,
} from './schema/index.js';
import type {
  HouseholdsReference,
  Lever,
  PresetsFile,
  RuleSet,
  SourcesFile,
  Vintage,
} from './types/data.js';
import { validateVintage } from './validate/validateVintage.js';

function parseWith<T>(schema: ZodType<T>, json: unknown, label: string): T {
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`,
    );
    throw new DataError(`${label} failed schema validation`, issues);
  }
  return result.data;
}

export function parseVintage(json: unknown): Vintage {
  const vintage = parseWith(vintageSchema, json, 'vintage');
  const problems = validateVintage(vintage);
  if (problems.length > 0)
    throw new DataError(`vintage ${vintage.id} failed consistency checks`, problems);
  return vintage;
}

export function parseRules(json: unknown): RuleSet {
  return parseWith(ruleSetSchema, json, 'rules');
}

export function parseLever(json: unknown): Lever {
  return parseWith(leverSchema, json, 'lever');
}

export function parseSources(json: unknown): SourcesFile {
  const file = parseWith(sourcesFileSchema, json, 'sources');
  const ids = new Set<string>();
  const dupes: string[] = [];
  for (const s of file.sources) {
    if (ids.has(s.id)) dupes.push(`duplicate source id ${s.id}`);
    ids.add(s.id);
  }
  if (dupes.length > 0) throw new DataError('sources registry has duplicates', dupes);
  return file;
}

export function parsePresets(json: unknown): PresetsFile {
  return parseWith(presetsFileSchema, json, 'presets');
}

export function parseHouseholds(json: unknown): HouseholdsReference {
  return parseWith(householdsReferenceSchema, json, 'households reference');
}

export interface Dataset {
  sources: SourcesFile;
  vintage: Vintage;
  rules: RuleSet;
  levers: Lever[];
  presets?: PresetsFile;
  households?: HouseholdsReference;
}

function collectSourceIds(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectSourceIds(v, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'sourceId' && typeof v === 'string') out.add(v);
      else collectSourceIds(v, out);
    }
  }
}

/** Cross-file checks: every source reference resolves, lever codes are unique, presets name real levers. */
export function validateDataset(ds: Dataset): string[] {
  const problems: string[] = [];
  const known = new Set(ds.sources.sources.map((s) => s.id));
  const referenced = new Set<string>();
  collectSourceIds(
    [ds.vintage, ds.rules, ds.levers, ds.presets ?? null, ds.households ?? null],
    referenced,
  );
  for (const id of referenced) {
    if (!known.has(id)) problems.push(`source id "${id}" is referenced but not in the registry`);
  }
  const codes = new Set<string>();
  const ids = new Set<string>();
  for (const lever of ds.levers) {
    if (codes.has(lever.code)) problems.push(`duplicate lever code ${lever.code}`);
    if (ids.has(lever.id)) problems.push(`duplicate lever id ${lever.id}`);
    codes.add(lever.code);
    ids.add(lever.id);
    if (lever.costing.kind === 'sensitivity') {
      const id = lever.costing.sensitivityId;
      if (!ds.vintage.sensitivities.some((s) => s.id === id)) {
        problems.push(
          `lever ${lever.id} refers to sensitivity "${id}" missing from vintage ${ds.vintage.id}`,
        );
      }
    }
    for (const interaction of lever.interactions ?? []) {
      if (!ds.levers.some((l) => l.id === interaction.withLever)) {
        problems.push(`lever ${lever.id} interacts with unknown lever ${interaction.withLever}`);
      }
    }
  }
  for (const preset of ds.presets?.presets ?? []) {
    for (const code of Object.keys(preset.leverValues)) {
      if (!codes.has(code)) problems.push(`preset ${preset.id} sets unknown lever code ${code}`);
    }
  }
  return problems;
}
