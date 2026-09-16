import type {
  Household,
  HouseholdsFile,
  HouseholdTouch,
  Lever,
  SimulatedLine,
} from '../types/data.js';
import type { AmbitionStatus } from './ambitions.js';

/**
 * The electorate, as five households (stage 7). Each is touched by a stated set of levers with a
 * direction; what they say is authored and badged, and whether they understood the Budget turns
 * on whether a theme was agreed and delivered. No household quotes a figure the engine did not
 * compute, because none of their lines carries one.
 */

export interface HouseholdReaction {
  household: Household;
  /** The lines fired by the levers that touched this household, biggest measure first. */
  said: { touch: HouseholdTouch; lever: Lever }[];
  /** Net direction: what they say they feel, read off the touches. */
  net: 'gains' | 'pays' | 'mixed' | 'untouched';
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
  themed: boolean,
): HouseholdReaction[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const understood = themed && (status?.funded ?? 0) > 0;
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
    const net =
      said.length === 0 ? 'untouched' : gains && pays ? 'mixed' : gains ? 'gains' : 'pays';
    return {
      household,
      said,
      net,
      understood,
      line: understood ? household.understood : household.puzzled,
    };
  });
}
