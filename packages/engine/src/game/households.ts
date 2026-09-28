import type {
  Household,
  HouseholdsFile,
  HouseholdTouch,
  IncidenceFile,
  Lever,
  SimulatedLine,
} from '../types/data.js';
import type { AmbitionStatus } from './ambitions.js';

/**
 * The electorate, as five households (stage 7). Each is touched by a stated set of levers with a
 * direction; what they say is authored and badged, and whether they understood the Budget turns
 * on whether a theme was agreed and delivered. No household quotes a figure the engine did not
 * compute, because none of their lines carries one. A household says it was untouched only when
 * nothing in its incidence groups moved; when something did and none of its own touches fired, it
 * says it saw nothing aimed at it by name (Phase 25).
 */

export interface HouseholdReaction {
  household: Household;
  /** The lines fired by the levers that touched this household, biggest measure first. */
  said: { touch: HouseholdTouch; lever: Lever }[];
  /**
   * Net direction: what they say they feel, read off the touches. `unnamed` when something in
   * their groups moved but nothing aimed at them by name (Phase 25); `untouched` only when nothing
   * in their groups moved at all.
   */
  net: 'gains' | 'pays' | 'mixed' | 'unnamed' | 'untouched';
  /** What they say when no touch of theirs fired: the untouched line, or the file's unnamed one. */
  quiet: SimulatedLine | null;
  understood: boolean;
  line: SimulatedLine;
}

function fires(touch: HouseholdTouch, lever: Lever, value: number): boolean {
  const base = lever.control.default;
  if (value === base) return false;
  switch (touch.when) {
    case 'on':
      return lever.control.kind === 'toggle' && value !== base;
    case 'above':
      return value > base;
    case 'below':
      return value < base;
    case 'moved':
      return true;
  }
}

export function householdReactions(
  file: HouseholdsFile,
  values: Record<string, number>,
  levers: readonly Lever[],
  sizeOf: (code: string) => number,
  status: AmbitionStatus | null,
  hasPriorities: boolean,
  incidence: IncidenceFile,
): HouseholdReaction[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const understood = hasPriorities && (status?.delivered ?? 0) > 0;
  // The groups something moved in: a household in one of them is never "untouched" (Phase 25).
  const movedGroups = new Set(
    levers
      .filter((l) => (values[l.code] ?? l.control.default) !== l.control.default)
      .map((l) => incidence.levers[l.code])
      .filter((g): g is string => g !== undefined),
  );
  return file.households.map((household) => {
    const said = household.touches
      .map((touch) => ({ touch, lever: byCode.get(touch.code) }))
      .filter((x): x is { touch: HouseholdTouch; lever: Lever } => x.lever !== undefined)
      .filter(({ touch, lever }) =>
        fires(touch, lever, values[lever.code] ?? lever.control.default),
      )
      .sort((a, b) => sizeOf(b.lever.code) - sizeOf(a.lever.code));
    const gains = said.some((s) => s.touch.effect === 'gains');
    const pays = said.some((s) => s.touch.effect === 'pays');
    const reached = household.exposure.some((g) => movedGroups.has(g));
    const net: HouseholdReaction['net'] =
      said.length > 0
        ? gains && pays
          ? 'mixed'
          : gains
            ? 'gains'
            : 'pays'
        : reached
          ? 'unnamed'
          : 'untouched';
    return {
      household,
      said,
      net,
      quiet: said.length > 0 ? null : reached ? file.unnamed : household.untouched,
      understood,
      line: understood ? household.understood : household.puzzled,
    };
  });
}
