import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeOutcome,
  parseAdvisers,
  parseContext,
  parsePm,
  parseMinisters,
  parseInterventions,
  parseOptions,
  parseFinetune,
  parseHouseholdsFile,
  parseSpeech,
  parseIncidence,
  parseVerdicts,
  parseGuide,
  parseGlossary,
  parseReception,
  parseHmrcExtract,
  parseHouseholds,
  parseLever,
  parseRules,
  parseDwpBenefitExtract,
  parsePesaExtract,
  parseReliefExtract,
  parseScorecardExtract,
  parseSources,
  parseSr25Extract,
  parseVintage,
  type Dataset,
  type ExtractedSources,
  type Lever,
  type LeverControl,
  type OutcomeOf,
  type Settings,
} from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, '../../../data');

export function readJson(relative: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, relative), 'utf8')) as unknown;
}

export function listJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

export function loadDataset(): Required<Dataset> {
  const levers = listJsonFiles(path.join(DATA_DIR, 'levers')).map((f) =>
    parseLever(JSON.parse(readFileSync(f, 'utf8'))),
  );
  return {
    sources: parseSources(readJson('sources/sources.json')),
    vintage: parseVintage(readJson('vintages/obr-2026-03/vintage.json')),
    rules: parseRules(readJson('rules/charter-2026-02.json')),
    levers,
    households: parseHouseholds(readJson('reference/uk-households.json')),
    contexts: listJsonFiles(path.join(DATA_DIR, 'context')).map((f) =>
      parseContext(JSON.parse(readFileSync(f, 'utf8'))),
    ),
    advisers: parseAdvisers(readJson('journey/advisers.json')),
    pm: parsePm(readJson('journey/pm.json')),
    ministers: parseMinisters(readJson('journey/ministers.json')),
    interventions: parseInterventions(readJson('journey/interventions.json')),
    options: parseOptions(readJson('journey/options.json')),
    finetune: parseFinetune(readJson('journey/finetune.json')),
    electorate: parseHouseholdsFile(readJson('journey/households.json')),
    speech: parseSpeech(readJson('journey/speech.json')),
    incidence: parseIncidence(readJson('journey/incidence.json')),
    verdicts: parseVerdicts(readJson('journey/verdicts.json')),
    guide: parseGuide(readJson('journey/guide.json')),
    glossary: parseGlossary(readJson('journey/glossary.json')),
    reception: parseReception(readJson('journey/reception.json')),
  };
}

export function loadExtracts(): ExtractedSources {
  const budget2025 = parseScorecardExtract(readJson('derived/hmt-budget-2025-table-4-1.raw.json'));
  const autumn2024 = parseScorecardExtract(
    readJson('derived/hmt-autumn-budget-2024-table-5-1.raw.json'),
  );
  return {
    hmrc: parseHmrcExtract(readJson('derived/hmrc-trr-2025-06.raw.json')),
    scorecard: budget2025,
    scorecards: { [budget2025.sourceId]: budget2025, [autumn2024.sourceId]: autumn2024 },
    sr25: parseSr25Extract(readJson('derived/hmt-sr25-del.raw.json')),
    reliefs: Object.fromEntries(
      [
        parseReliefExtract(readJson('derived/hmrc-tax-reliefs-2026-01.raw.json')),
        parseReliefExtract(readJson('derived/hmrc-private-pensions-2026-07.raw.json')),
      ].map((r) => [r.sourceId, r] as const),
    ),
    pesa: parsePesaExtract(readJson('derived/hmt-pesa-2025-functions.raw.json')),
    dwp: parseDwpBenefitExtract(readJson('derived/dwp-benefit-expenditure-2026-table-1a.raw.json')),
  };
}

/** The parts of a lever a test of the arithmetic is about; `syntheticLever` fills in the rest. */
export interface SyntheticLeverParts {
  code: string;
  /** The costing as a lever file would write it; the schema fills in its defaults. */
  costing: Record<string, unknown>;
  category?: Lever['category'];
  badge?: Lever['badge'];
  control?: Partial<LeverControl>;
  classification?: Partial<NonNullable<Lever['classification']>>;
  earliestStart?: Lever['earliestStart'];
}

/**
 * A lever made up for a test of the arithmetic, with round numbers of its own, so re-costing a
 * real lever can never move the test. It is parsed, so it is valid against the schema: a slider
 * of whole points on the receipts side, unless the parts say otherwise.
 */
export function syntheticLever(parts: SyntheticLeverParts): Lever {
  const { code, category = 'tax', badge = 'assumption', control, classification, ...rest } = parts;
  return parseLever({
    schemaVersion: 1,
    id: `synthetic-${code}`,
    code,
    category,
    badge,
    group: 'Synthetic',
    title: `Synthetic lever ${code}`,
    shortTitle: `Synthetic ${code}`,
    headline: 'Made up for a test of the arithmetic.',
    description: 'A lever made up for a test of the arithmetic, with round numbers of its own.',
    baselinePolicy: { text: 'As planned.', source: { sourceId: 'obr-efo-2026-03' } },
    control: { kind: 'slider', unit: 'pp', min: -10, max: 10, step: 1, default: 0, ...control },
    classification: {
      side: category === 'tax' ? 'receipts' : 'spending',
      currentOrCapital: 'current',
      ...classification,
    },
    considerations: [],
    status: 'reviewed',
    reviewedOn: '2026-09-30',
    ...rest,
  });
}

/**
 * A generated sentence as its words, for a snapshot: every sum the engine formats (£6.8bn,
 * −£3.3bn, +£15bn) reads £…bn, so a snapshot moves when the wording does, not when a figure does.
 * A test that cares about a figure checks it against the engine's own.
 */
export function wording(text: string | undefined): string | undefined {
  return text?.replace(/[+−-]?£\d[\d,]*(?:\.\d+)?bn/g, '£…bn');
}

/**
 * Whether a sentence is a data template filled in, each {placeholder} standing for any words: which
 * fragment or band a sentence came from, read so that rewording the data moves a snapshot, not
 * this.
 */
export function filledFrom(template: string | undefined, text: string | undefined): boolean {
  if (template === undefined || text === undefined) return false;
  const pattern = template
    .split(/\{\w+\}/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*?');
  return new RegExp(`^${pattern}$`).test(text);
}

/** A toggle's control: off at 0, on at 1. */
export const TOGGLE: Partial<LeverControl> = { kind: 'toggle', unit: 'bool', min: 0, max: 1 };

export const FORECAST_YEARS = [
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30',
  '2030-31',
] as const;

/**
 * The engine re-run for a set of lever values (Phase 25): what the web's useOutcomeOf gives the
 * pages, for the engine functions that price a choice. The settings other than the lever values
 * are the caller's, so a test prices against the same conditions it runs the Budget under.
 */
export function outcomeOfFor(
  ds: Pick<Dataset, 'vintage' | 'rules' | 'levers'>,
  settings: Omit<Partial<Settings>, 'leverValues'> = {},
): OutcomeOf {
  const cache = new Map<string, ReturnType<OutcomeOf>>();
  return (leverValues) => {
    const key = JSON.stringify(Object.entries(leverValues).sort(([a], [b]) => a.localeCompare(b)));
    const hit = cache.get(key);
    if (hit) return hit;
    const outcome = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: { ...settings, leverValues },
    });
    cache.set(key, outcome);
    return outcome;
  };
}
