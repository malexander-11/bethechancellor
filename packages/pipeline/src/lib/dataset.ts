import path from 'node:path';
import {
  parseAdvisers,
  parseBriefings,
  parseCalendar,
  parseContext,
  parseDraws,
  parsePm,
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseSources,
  parseVintage,
  type Dataset,
} from '@btc/engine';
import { DATA_DIR } from './paths.js';
import { listFiles, readJson } from './io.js';

export interface LoadedDataset extends Required<Dataset> {
  vintages: Dataset['vintage'][];
  ruleSets: Dataset['rules'][];
}

/** Load and schema-validate everything under data/. Throws DataError on the first bad file. */
export function loadDataset(
  defaultVintageId = 'obr-2026-03',
  defaultRulesId = 'charter-2026-02',
): LoadedDataset {
  const isJson = (f: string) => f.endsWith('.json');
  const sources = parseSources(readJson(path.join(DATA_DIR, 'sources', 'sources.json')));
  const vintages = listFiles(path.join(DATA_DIR, 'vintages'), isJson).map((f) =>
    parseVintage(readJson(f)),
  );
  const ruleSets = listFiles(path.join(DATA_DIR, 'rules'), isJson).map((f) =>
    parseRules(readJson(f)),
  );
  const levers = listFiles(path.join(DATA_DIR, 'levers'), isJson).map((f) =>
    parseLever(readJson(f)),
  );
  const presets = parsePresets(readJson(path.join(DATA_DIR, 'presets', 'presets.json')));
  const households = parseHouseholds(
    readJson(path.join(DATA_DIR, 'reference', 'uk-households.json')),
  );
  const contexts = listFiles(path.join(DATA_DIR, 'context'), isJson).map((f) =>
    parseContext(readJson(f)),
  );
  const advisers = parseAdvisers(readJson(path.join(DATA_DIR, 'journey', 'advisers.json')));
  const briefings = parseBriefings(readJson(path.join(DATA_DIR, 'journey', 'briefings.json')));
  const draws = parseDraws(readJson(path.join(DATA_DIR, 'journey', 'draws.json')));
  const calendar = parseCalendar(readJson(path.join(DATA_DIR, 'journey', 'calendar.json')));
  const pm = parsePm(readJson(path.join(DATA_DIR, 'journey', 'pm.json')));
  const vintage = vintages.find((v) => v.id === defaultVintageId);
  const rules = ruleSets.find((r) => r.id === defaultRulesId);
  if (!vintage) throw new Error(`default vintage ${defaultVintageId} not found`);
  if (!rules) throw new Error(`default rule set ${defaultRulesId} not found`);
  return {
    sources,
    vintage,
    rules,
    levers,
    presets,
    households,
    contexts,
    advisers,
    briefings,
    draws,
    calendar,
    pm,
    vintages,
    ruleSets,
  };
}
