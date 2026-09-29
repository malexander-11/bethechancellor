import { fyStart } from '../calc/years.js';
import type { Lever } from '../types/data.js';
import type { DeliverOption, OptionsFile, PmFile, Priority, Promise_ } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';
import { deliversTarget, promiseBreaks, promiseStrains } from './promises.js';

/**
 * The options (Phase 18, ADR-0022): bundles of lever settings that advisers propose and the
 * Chancellor chooses among. Nothing here prices anything; the page runs the engine. What lives
 * here is the reading of an option against the Budget as it stands: on, adjusted or off; which
 * red lines it crosses; the latest of its levers' earliest starts; and which other options or
 * levers it overlaps or counts the same money as. No two options share a lever (the schema forbids
 * it), so every reading is unambiguous. Since Phase 24 every option is a way to deliver a
 * priority: the ways to pay became step 4's levers and the add-ons went (ADR-0025).
 */

/**
 * On: chosen. Adjusted: moved towards the option's setting without reaching it (a step-4 trim that
 * settles the ask lower). Against: moved the other way, below where it rests, so it cuts what the
 * option would fund (Phase 25). Off: untouched.
 */
export type OptionState = 'on' | 'adjusted' | 'against' | 'off';

interface Bundle {
  id: string;
  values: Record<string, number>;
}

function leverMap(levers: readonly Lever[]): Map<string, Lever> {
  return new Map(levers.map((l) => [l.code, l] as const));
}

/**
 * On when every lever in the bundle is at, or beyond, the option's value in its direction (a
 * player who went further on step 4 has still chosen it); adjusted when some lever has moved
 * towards the option's value but not to it; against when the only moves are the other way, below
 * where the lever rests (Phase 25); off when nothing has moved.
 */
export function optionState(
  option: Bundle,
  values: Record<string, number>,
  levers: readonly Lever[],
): OptionState {
  const byCode = leverMap(levers);
  let delivered = 0;
  let toward = 0;
  let away = 0;
  const codes = Object.keys(option.values);
  for (const code of codes) {
    const lever = byCode.get(code);
    const base = lever?.control.default ?? 0;
    const current = values[code] ?? base;
    const target = option.values[code] ?? base;
    if (deliversTarget(lever, current, target)) delivered += 1;
    if (current === base) continue;
    // Towards the target is the side of the default the target is on.
    if (Math.sign(current - base) === Math.sign(target - base)) toward += 1;
    else away += 1;
  }
  if (codes.length > 0 && delivered === codes.length) return 'on';
  if (toward > 0) return 'adjusted';
  return away > 0 ? 'against' : 'off';
}

/** The lever values that switch an option off: each of its levers back at its default. */
export function optionOff(option: Bundle, levers: readonly Lever[]): Record<string, number> {
  const byCode = leverMap(levers);
  return Object.fromEntries(
    Object.keys(option.values).map((code) => [code, byCode.get(code)?.control.default ?? 0]),
  );
}

/** One option, with the names a card would use for it. */
export interface OptionRef {
  id: string;
  /** The option's title: what it does, plainly. */
  title: string;
  /** The name a note on another card uses for it. */
  shortTitle: string;
  values: Record<string, number>;
  conflicts: readonly { with: string; text: string }[];
}

/** Every option: the ways to deliver the priorities. */
export function allOptions(options: OptionsFile): OptionRef[] {
  return options.deliver.map((o) => ({
    id: o.id,
    title: o.title,
    shortTitle: o.title,
    values: o.values,
    conflicts: o.conflicts ?? [],
  }));
}

/** The option that moves each lever, by code; one at most, because no two options share a lever. */
export function optionByLever(options: OptionsFile): Map<string, OptionRef> {
  const out = new Map<string, OptionRef>();
  for (const ref of allOptions(options)) {
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
  const all = allOptions(options);
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
  return optionConflicts(option, options, levers, values).find(
    (c) => c.partner === 'on' || c.partner === 'adjusted',
  );
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

/**
 * The advisers' shortlist on step 3 (Phase 27, ADR-0028): the one or two best ways to deliver
 * each priority, the ones basic mode shows, in the file's order; for one priority when named.
 */
export function shortlistedWays(options: OptionsFile, priority?: string): DeliverOption[] {
  return options.deliver.filter(
    (o) => o.shortlist === true && (priority === undefined || o.priority === priority),
  );
}

/**
 * Whether a way to deliver a priority is on show in basic mode (Phase 27): it is on the
 * shortlist; or it moves a lever already on the desk, which the briefing names; or it was not off
 * when the screen opened (or when the mode last changed), so nothing chosen ever hides.
 */
export function onShowInBasic(
  option: Pick<DeliverOption, 'shortlist' | 'values'>,
  arrived: OptionState,
  desk: ReadonlySet<string>,
): boolean {
  return (
    option.shortlist === true ||
    arrived !== 'off' ||
    Object.keys(option.values).some((code) => desk.has(code))
  );
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
  /** The promise's id and its short name on a resting tag (Phase 25): "Tax lock: no rise". */
  id: string;
  tag: string;
  when: 'above' | 'below' | 'on';
  /** Red or amber: whether the case breaks the promise's words or only tests its spirit (Phase 23). */
  severity: 'breaks' | 'strains';
  /** Whether the Budget with this option in it crosses the line. */
  broken: boolean;
  /** The 2024 manifesto's own words (Phase 25): a red line, not a promise made since. */
  manifesto: boolean;
  /** False for a strain shown and scored by no audience (Phase 25). */
  scored: boolean;
}

/**
 * The manifesto promises that watch any of the option's levers, red and amber, and whether
 * choosing it would cross them given the rest of the Budget.
 */
export function optionRedLines(
  option: Bundle,
  promises: readonly Promise_[],
  levers: readonly Lever[],
  current: Record<string, number>,
): OptionRedLine[] {
  const codes = new Set(Object.keys(option.values));
  const trial = { ...current, ...option.values };
  const breaks = promiseBreaks(trial, promises, levers);
  const strains = promiseStrains(trial, promises, levers);
  const out: OptionRedLine[] = [];
  for (const promise of promises) {
    const rule = promise.breaks.find((r) => codes.has(r.code));
    if (rule) {
      const report = breaks.find((r) => r.promise.id === promise.id);
      out.push({
        promise: promise.title,
        id: promise.id,
        tag: promise.tag,
        when: rule.when,
        severity: 'breaks',
        broken: report?.brokenBy.some((b) => codes.has(b.code)) ?? false,
        manifesto: promise.origin === 'manifesto-2024',
        scored: true,
      });
    }
    const strain = promise.strains.find((r) => codes.has(r.code));
    if (strain) {
      const report = strains.find((r) => r.promise.id === promise.id);
      out.push({
        promise: promise.title,
        id: promise.id,
        tag: promise.tag,
        when: strain.when,
        severity: 'strains',
        broken: report?.strainedBy.some((b) => codes.has(b.code)) ?? false,
        manifesto: promise.origin === 'manifesto-2024',
        scored: strain.scored,
      });
    }
  }
  return out;
}

export interface OptionOverlap {
  /** The lever this option's lever interacts with. */
  withLever: Lever;
  /** The option that offers that lever, when one does. */
  option?: OptionRef;
  text: string;
  severity: 'info' | 'warn' | 'excludes';
  /** True once the partner lever has moved: the card then shows the text, not only the name. */
  active: boolean;
}

/**
 * The authored interactions between the option's levers and other levers, read from either side
 * of the pair. With the options file, every partner is listed before either is chosen, so a card
 * can say "Overlaps with …": another option offers it, or step 4 does, which offers every policy
 * lever (Phase 26); a shelved lever is listed only once it has moved. A pair authored as a
 * conflict is left out, because the conflict says it. Without the file, only the partners already
 * moved.
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
  const offering = options ? optionByLever(options) : undefined;
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
    const named =
      partner !== undefined || (!o.withLever.deprecated && o.withLever.category !== 'macro');
    if (!o.active && (!options || !named)) continue;
    out.push(partner ? { ...o, option: partner } : o);
  }
  return out;
}
