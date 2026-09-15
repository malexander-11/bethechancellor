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

export interface LeverGroup {
  name: string;
  levers: Lever[];
}

/** Group levers by their authored `group`, ordering groups and levers by `order`. */
export function groupLevers(items: Lever[]): LeverGroup[] {
  const byGroup = new Map<string, Lever[]>();
  for (const lever of items) {
    const name = lever.group ?? 'Other';
    const list = byGroup.get(name) ?? [];
    list.push(lever);
    byGroup.set(name, list);
  }
  const groups = [...byGroup.entries()].map(([name, levers]) => ({
    name,
    levers: [...levers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }));
  const rank = (g: LeverGroup) => Math.min(...g.levers.map((l) => l.order ?? 0));
  const GROUP_ORDER = [
    'Income tax',
    'National Insurance',
    'Business',
    'VAT',
    'Capital taxes',
    'Duties',
    'Reverse Budget 2025 measures',
  ];
  return groups.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.name);
    const ib = GROUP_ORDER.indexOf(b.name);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return rank(a) - rank(b);
  });
}
