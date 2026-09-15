import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAdvisers,
  parseBriefings,
  parseContext,
  parseHmrcExtract,
  parseHouseholds,
  parseLever,
  parsePresets,
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
    contexts: listJsonFiles(path.join(DATA_DIR, 'context')).map((f) =>
      parseContext(JSON.parse(readFileSync(f, 'utf8'))),
    ),
    advisers: parseAdvisers(readJson('journey/advisers.json')),
    briefings: parseBriefings(readJson('journey/briefings.json')),
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
    reliefs: parseReliefExtract(readJson('derived/hmrc-tax-reliefs-2026-01.raw.json')),
    pesa: parsePesaExtract(readJson('derived/hmt-pesa-2025-functions.raw.json')),
    dwp: parseDwpBenefitExtract(readJson('derived/dwp-benefit-expenditure-2026-table-1a.raw.json')),
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
