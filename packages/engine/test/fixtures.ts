import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseHmrcExtract,
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseScorecardExtract,
  parseSources,
  parseSr25Extract,
  parseVintage,
  type Dataset,
  type ExtractedSources,
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
    presets: parsePresets(readJson('presets/presets.json')),
    households: parseHouseholds(readJson('reference/uk-households.json')),
  };
}

export function loadExtracts(): ExtractedSources {
  return {
    hmrc: parseHmrcExtract(readJson('derived/hmrc-trr-2025-06.raw.json')),
    scorecard: parseScorecardExtract(readJson('derived/hmt-budget-2025-table-4-1.raw.json')),
    sr25: parseSr25Extract(readJson('derived/hmt-sr25-del.raw.json')),
  };
}

export const FORECAST_YEARS = [
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30',
  '2030-31',
] as const;
