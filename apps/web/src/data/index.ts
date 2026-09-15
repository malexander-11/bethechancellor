import {
  parseAdvisers,
  parseBriefings,
  parseContext,
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseSources,
  parseVintage,
  validateDataset,
  type Adviser,
  type Briefing,
  type JourneyStep,
  type Lever,
  type SourceDoc,
} from '@btc/engine';
import advisersJson from '@data/journey/advisers.json';
import briefingsJson from '@data/journey/briefings.json';
import contextJson from '@data/context/2026-09.json';
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
export const context = parseContext(contextJson);
export const advisers = parseAdvisers(advisersJson);
export const briefings = parseBriefings(briefingsJson);
export const levers: Lever[] = Object.keys(leverModules)
  .sort()
  .map((key) => parseLever(leverModules[key]))
  .filter((lever) => lever.status === 'reviewed' && !lever.deprecated);

export const sourcesById: ReadonlyMap<string, SourceDoc> = new Map(
  sources.sources.map((s) => [s.id, s] as const),
);

const problems = validateDataset({
  sources,
  vintage,
  rules,
  levers,
  presets,
  households,
  contexts: [context],
  advisers,
  briefings,
});
if (problems.length > 0) {
  throw new Error(`data set is inconsistent:\n - ${problems.join('\n - ')}`);
}

export const adviserById: ReadonlyMap<string, Adviser> = new Map(
  advisers.advisers.map((a) => [a.id, a] as const),
);

/** Briefings for a step: the step's overviews (no group) or the briefings for one lever group. */
export function briefingsFor(step: JourneyStep, group?: string): Briefing[] {
  return briefings.briefings.filter((b) => b.step === step && (b.group ?? undefined) === group);
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
    'Budget 2025 decisions',
    'Income tax',
    'National Insurance',
    'Business',
    'VAT',
    'Capital taxes',
    'Duties',
    'Budget 2025 spending decisions',
    'Day-to-day departmental budgets',
    'Public investment',
    'Welfare',
  ];
  return groups.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.name);
    const ib = GROUP_ORDER.indexOf(b.name);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return rank(a) - rank(b);
  });
}
