import { fyStart } from '../calc/years.js';
import type { Lever } from '../types/data.js';
import type {
  AffordOption,
  DeliverOption,
  IncidenceFile,
  OptionsFile,
  PmFile,
  Priority,
  Promise_,
} from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';
import { deliversTarget, promiseBreaks } from './promises.js';

/**
 * The options (Phase 18, ADR-0022): bundles of lever settings that advisers propose and the
 * Chancellor chooses among. Nothing here prices anything; the page runs the engine. What lives
 * here is the reading of an option against the Budget as it stands: on, adjusted or off; which
 * red lines it crosses; the latest of its levers' earliest starts; which other options it
 * overlaps or counts the same money as; and which who-pays tab a way to afford belongs to. No
 * two options anywhere share a lever (the schema forbids it), so every reading is unambiguous.
 */

export type OptionState = 'on' | 'adjusted' | 'off';

interface Bundle {
  id: string;
  values: Record<string, number>;
}

function leverMap(levers: readonly Lever[]): Map<string, Lever> {
  return new Map(levers.map((l) => [l.code, l] as const));
}

/**
 * On when every lever in the bundle is at, or beyond, the option's value in its direction (a
 * player who went further on the desk has still chosen it); adjusted when some lever has moved
 * but not to there; off when nothing has moved.
 */
export function optionState(
  option: Bundle,
  values: Record<string, number>,
  levers: readonly Lever[],
): OptionState {
  const byCode = leverMap(levers);
  let delivered = 0;
  let moved = 0;
  const codes = Object.keys(option.values);
  for (const code of codes) {
    const lever = byCode.get(code);
    const base = lever?.control.default ?? 0;
    const current = values[code] ?? base;
    if (current !== base) moved += 1;
    if (deliversTarget(lever, current, option.values[code] ?? base)) delivered += 1;
  }
  if (codes.length > 0 && delivered === codes.length) return 'on';
  return moved > 0 ? 'adjusted' : 'off';
}

/** The lever values that switch an option off: each of its levers back at its default. */
export function optionOff(option: Bundle, levers: readonly Lever[]): Record<string, number> {
  const byCode = leverMap(levers);
  return Object.fromEntries(
    Object.keys(option.values).map((code) => [code, byCode.get(code)?.control.default ?? 0]),
  );
}

export type OptionScreen = 'deliver' | 'afford' | 'addOns';

/** One option, whichever screen offers it, with the names a card would use for it. */
export interface OptionRef {
  id: string;
  screen: OptionScreen;
  /** The option's title; a way to afford has none of its own and wears its lever's title. */
  title: string;
  /** A shorter name for a note on another card: the lever's short title for a way to afford. */
  shortTitle: string;
  values: Record<string, number>;
  conflicts: readonly { with: string; text: string }[];
}

/** Every option on every screen. */
export function allOptions(options: OptionsFile, levers: readonly Lever[]): OptionRef[] {
  const byCode = leverMap(levers);
  const leverOf = (o: AffordOption) => byCode.get(Object.keys(o.values)[0] ?? '');
  return [
    ...options.deliver.map((o) => ({
      id: o.id,
      screen: 'deliver' as const,
      title: o.title,
      shortTitle: o.title,
      values: o.values,
      conflicts: o.conflicts ?? [],
    })),
    ...options.afford.map((o) => ({
      id: o.id,
      screen: 'afford' as const,
      title: leverOf(o)?.title ?? o.id,
      shortTitle: leverOf(o)?.shortTitle ?? o.id,
      values: o.values,
      conflicts: o.conflicts ?? [],
    })),
    ...options.addOns.map((o) => ({
      id: o.id,
      screen: 'addOns' as const,
      title: o.title,
      shortTitle: o.title,
      values: o.values,
      conflicts: o.conflicts ?? [],
    })),
  ];
}

/** The option that moves each lever, by code; one at most, because no two options share a lever. */
export function optionByLever(
  options: OptionsFile,
  levers: readonly Lever[],
): Map<string, OptionRef> {
  const out = new Map<string, OptionRef>();
  for (const ref of allOptions(options, levers)) {
    for (const code of Object.keys(ref.values)) out.set(code, ref);
  }
  return out;
}

export interface OptionConflict {
  /** The other option. */
  option: OptionRef;
  /** Why the two count the same money, as authored. */
  text: string;
  /** How the other option stands in the Budget. */
  partner: OptionState;
}

/**
 * The options authored to count the same money as this one, read from either side of the pair,
 * each with how it stands in the Budget as given.
 */
export function optionConflicts(
  option: { id: string },
  options: OptionsFile,
  levers: readonly Lever[],
  values: Record<string, number>,
): OptionConflict[] {
  const all = allOptions(options, levers);
  const byId = new Map(all.map((o) => [o.id, o] as const));
  const self = byId.get(option.id);
  if (!self) return [];
  const out: OptionConflict[] = [];
  const seen = new Set<string>();
  const push = (other: OptionRef | undefined, text: string) => {
    if (!other || other.id === self.id || seen.has(other.id)) return;
    seen.add(other.id);
    out.push({ option: other, text, partner: optionState(other, values, levers) });
  };
  for (const c of self.conflicts) push(byId.get(c.with), c.text);
  for (const other of all) {
    for (const c of other.conflicts) if (c.with === self.id) push(other, c.text);
  }
  return out;
}

/**
 * The conflict that blocks this option: it is not on, and the other side of the pair is in the
 * Budget, on or adjusted on the desk. An option already on is never blocked; it can be put back.
 */
export function blockedBy(
  option: Bundle,
  options: OptionsFile,
  levers: readonly Lever[],
  values: Record<string, number>,
): OptionConflict | undefined {
  if (optionState(option, values, levers) === 'on') return undefined;
  return optionConflicts(option, options, levers, values).find((c) => c.partner !== 'off');
}

/** How many priorities a Chancellor may rank with the Prime Minister. */
export const MAX_PRIORITIES = 3;

/**
 * The priorities the game has ranked, in rank order, first three only; an id the data no longer
 * carries (a Phase 9 flagship id in an old link) is dropped.
 */
export function rankedPriorities(game: GamePermalink, pm: PmFile): Priority[] {
  const byId = new Map(pm.priorities.map((p) => [p.id, p] as const));
  return game.priorities
    .map((id) => byId.get(id))
    .filter((p): p is Priority => p !== undefined)
    .slice(0, MAX_PRIORITIES);
}

/**
 * A Phase 9 link ranked themes rather than priorities (`th=`). Each reads as the priority that
 * took its place, so an old link opens with a sensible ranking.
 */
export const LEGACY_THEME_PRIORITY: Record<string, string> = {
  'cost-of-living': 'cost-of-living',
  security: 'defence',
  'public-services': 'nhs',
  'every-postcode': 'homes-growth',
};

/** The ways to deliver one priority, in the file's order. */
export function deliverOptionsFor(priorityId: string, options: OptionsFile): DeliverOption[] {
  return options.deliver.filter((o) => o.priority === priorityId);
}

/** The latest earliest start among the option's levers (ADR-0021), if any carries one. */
export function optionEarliestStart(option: Bundle, levers: readonly Lever[]): string | undefined {
  const byCode = leverMap(levers);
  let latest: string | undefined;
  for (const code of Object.keys(option.values)) {
    const year = byCode.get(code)?.earliestStart?.year;
    if (year && (!latest || fyStart(year) > fyStart(latest))) latest = year;
  }
  return latest;
}

export interface OptionRedLine {
  promise: string;
  when: 'above' | 'below' | 'on';
  /** Whether the Budget with this option in it crosses the line. */
  broken: boolean;
}

/**
 * The manifesto red lines that watch any of the option's levers, and whether choosing it would
 * cross them given the rest of the Budget.
 */
export function optionRedLines(
  option: Bundle,
  promises: readonly Promise_[],
  levers: readonly Lever[],
  current: Record<string, number>,
): OptionRedLine[] {
  const codes = new Set(Object.keys(option.values));
  const watching = promises.filter((p) => p.breaks.some((rule) => codes.has(rule.code)));
  if (watching.length === 0) return [];
  const reports = promiseBreaks({ ...current, ...option.values }, watching, levers);
  return watching.map((promise) => {
    const rule = promise.breaks.find((r) => codes.has(r.code));
    const report = reports.find((r) => r.promise.id === promise.id);
    return {
      promise: promise.title,
      when: rule?.when ?? 'on',
      broken: report ? report.brokenBy.some((b) => codes.has(b.code)) : false,
    };
  });
}

export interface OptionOverlap {
  /** The lever this option's lever interacts with. */
  withLever: Lever;
  /** The option that offers that lever, when one does. */
  option?: OptionRef;
  text: string;
  severity: 'info' | 'warn';
  /** True once the partner lever has moved: the card then shows the text, not only the name. */
  active: boolean;
}

/**
 * The authored interactions between the option's levers and other levers, read from either side
 * of the pair. With the options file, every partner another option offers is listed, so a card can
 * say "Overlaps with …" before either is chosen, and a partner no option offers is listed once it
 * has moved on the desk; a pair authored as a conflict is left out, because the conflict says it.
 * Without the file, only the partners already moved, as the desk read them.
 */
export function optionOverlaps(
  option: Bundle,
  levers: readonly Lever[],
  moved: ReadonlySet<string>,
  options?: OptionsFile,
): OptionOverlap[] {
  const byCode = leverMap(levers);
  const byId = new Map(levers.map((l) => [l.id, l] as const));
  const codes = new Set(Object.keys(option.values));
  const own = [...codes].map((c) => byCode.get(c)).filter((l): l is Lever => l !== undefined);
  const ownIds = new Set(own.map((l) => l.id));
  const offering = options ? optionByLever(options, levers) : undefined;
  const conflicting = new Set(
    options ? optionConflicts(option, options, levers, {}).map((c) => c.option.id) : [],
  );
  const found = new Map<string, OptionOverlap>();
  for (const lever of own) {
    for (const i of lever.interactions ?? []) {
      const other = byId.get(i.withLever);
      if (!other || codes.has(other.code) || found.has(other.code)) continue;
      found.set(other.code, {
        withLever: other,
        text: i.text,
        severity: i.severity,
        active: moved.has(other.code),
      });
    }
  }
  if (options) {
    // The other side: a lever whose own interactions name one of ours.
    for (const other of levers) {
      if (codes.has(other.code) || found.has(other.code)) continue;
      const i = (other.interactions ?? []).find((x) => ownIds.has(x.withLever));
      if (!i) continue;
      found.set(other.code, {
        withLever: other,
        text: i.text,
        severity: i.severity,
        active: moved.has(other.code),
      });
    }
  }
  const out: OptionOverlap[] = [];
  for (const o of found.values()) {
    const partner = offering?.get(o.withLever.code);
    if (partner && conflicting.has(partner.id)) continue;
    if (!o.active && (!options || !partner)) continue;
    out.push(partner ? { ...o, option: partner } : o);
  }
  return out;
}

/**
 * The who-pays tabs of the ways to afford, each a set of incidence pays-groups
 * (data/journey/incidence.json). Small groups join the nearest large one.
 */
export const AFFORD_TABS: readonly { id: string; label: string; groups: readonly string[] }[] = [
  { id: 'everyone', label: 'Everyone', groups: ['broad-base', 'tax-gap', 'working-pensioners'] },
  { id: 'best-off', label: 'The best-off', groups: ['top'] },
  { id: 'business', label: 'Business', groups: ['business'] },
  { id: 'savers-owners', label: 'Savers and owners', groups: ['savers-owners'] },
  {
    id: 'duties',
    label: 'Drivers, drinkers, smokers, gamblers, flyers',
    groups: ['duties', 'motorists', 'flyers', 'disabled-motorists'],
  },
];

export interface AffordTab {
  tab: (typeof AFFORD_TABS)[number];
  options: AffordOption[];
}

/** The ways to afford, grouped into the who-pays tabs by their first lever's incidence tag. */
export function affordTabs(options: OptionsFile, incidence: IncidenceFile): AffordTab[] {
  return AFFORD_TABS.map((tab) => ({
    tab,
    options: options.afford.filter((o) => {
      const code = Object.keys(o.values)[0];
      const group = code ? incidence.levers[code] : undefined;
      return group !== undefined && tab.groups.includes(group);
    }),
  }));
}
