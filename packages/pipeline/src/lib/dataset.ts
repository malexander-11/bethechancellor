import path from 'node:path';
import {
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
  parseGuide,
  parseGlossary,
  parseReception,
  parseHouseholds,
  parseLever,
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
  const households = parseHouseholds(
    readJson(path.join(DATA_DIR, 'reference', 'uk-households.json')),
  );
  const contexts = listFiles(path.join(DATA_DIR, 'context'), isJson).map((f) =>
    parseContext(readJson(f)),
  );
  const advisers = parseAdvisers(readJson(path.join(DATA_DIR, 'journey', 'advisers.json')));
  const pm = parsePm(readJson(path.join(DATA_DIR, 'journey', 'pm.json')));
  const ministers = parseMinisters(readJson(path.join(DATA_DIR, 'journey', 'ministers.json')));
  const interventions = parseInterventions(
    readJson(path.join(DATA_DIR, 'journey', 'interventions.json')),
  );
  const options = parseOptions(readJson(path.join(DATA_DIR, 'journey', 'options.json')));
  const finetune = parseFinetune(readJson(path.join(DATA_DIR, 'journey', 'finetune.json')));
  const electorate = parseHouseholdsFile(
    readJson(path.join(DATA_DIR, 'journey', 'households.json')),
  );
  const speech = parseSpeech(readJson(path.join(DATA_DIR, 'journey', 'speech.json')));
  const incidence = parseIncidence(readJson(path.join(DATA_DIR, 'journey', 'incidence.json')));
  const guide = parseGuide(readJson(path.join(DATA_DIR, 'journey', 'guide.json')));
  const glossary = parseGlossary(readJson(path.join(DATA_DIR, 'journey', 'glossary.json')));
  const reception = parseReception(readJson(path.join(DATA_DIR, 'journey', 'reception.json')));
  const vintage = vintages.find((v) => v.id === defaultVintageId);
  const rules = ruleSets.find((r) => r.id === defaultRulesId);
  if (!vintage) throw new Error(`default vintage ${defaultVintageId} not found`);
  if (!rules) throw new Error(`default rule set ${defaultRulesId} not found`);
  return {
    sources,
    vintage,
    rules,
    levers,
    households,
    contexts,
    advisers,
    pm,
    ministers,
    interventions,
    options,
    finetune,
    electorate,
    speech,
    incidence,
    guide,
    glossary,
    reception,
    vintages,
    ruleSets,
  };
}
