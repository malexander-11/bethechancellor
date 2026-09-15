import {
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseSources,
  parseVintage,
  validateDataset,
  type Lever,
  type SourceDoc,
} from '@btc/engine';
import householdsJson from '@data/reference/uk-households.json';
import presetsJson from '@data/presets/presets.json';
import rulesJson from '@data/rules/charter-2026-02.json';
import sourcesJson from '@data/sources/sources.json';
import vintageJson from '@data/vintages/obr-2026-03/vintage.json';

const leverModules = import.meta.glob('../../../../data/levers/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export const sources = parseSources(sourcesJson);
export const vintage = parseVintage(vintageJson);
export const rules = parseRules(rulesJson);
export const presets = parsePresets(presetsJson);
export const households = parseHouseholds(householdsJson);
export const levers: Lever[] = Object.keys(leverModules)
  .sort()
  .map((key) => parseLever(leverModules[key]))
  .filter((lever) => lever.status === 'reviewed' && !lever.deprecated);

export const sourcesById: ReadonlyMap<string, SourceDoc> = new Map(
  sources.sources.map((s) => [s.id, s] as const),
);

const problems = validateDataset({ sources, vintage, rules, levers, presets, households });
if (problems.length > 0) {
  throw new Error(`data set is inconsistent:\n - ${problems.join('\n - ')}`);
}

export const leversByCategory = {
  tax: levers.filter((l) => l.category === 'tax'),
  spend: levers.filter((l) => l.category === 'spend' || l.category === 'welfare'),
  macro: levers.filter((l) => l.category === 'macro'),
};
