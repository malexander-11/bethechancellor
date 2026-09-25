import { computeOutcome, drawForecast, type Outcome } from '@btc/engine';
import { useMemo } from 'react';
import { context, draws, levers, rules, vintage } from '../data';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';

/** Trial outcomes are cheap but not free; a screen of option cards asks for a few dozen at once. */
const CACHE_LIMIT = 256;

/**
 * "What would the Budget look like if…": the engine re-run for a trial set of lever values under
 * the game's own conditions (the player's delays, and the OBR's re-scoring once the envelope is
 * open). The compromises, the add-ons and the option cards all price their choices with it. The
 * result is memoised per set of values while the conditions hold, so a re-render costs nothing.
 */
export function useOutcomeOf(): (
  values: Record<string, number>,
  delays?: Record<string, string>,
) => Outcome {
  const { state } = useBudget();
  const seed = state.game?.seed ?? 0;
  const revealed = state.game?.revealed ?? false;
  const gameDelays = state.game?.delays;
  const revisions = useMemo(
    () =>
      revealed && seed > 0 ? drawForecast(seed, draws, context, levers, vintage).revisions : {},
    [revealed, seed],
  );
  return useMemo(() => {
    const cache = new Map<string, Outcome>();
    return (values: Record<string, number>, delays?: Record<string, string>) => {
      const overrides = delays ?? gameDelays ?? {};
      const key = JSON.stringify([
        Object.keys(values)
          .sort()
          .map((code) => [code, values[code]]),
        Object.keys(overrides)
          .sort()
          .map((code) => [code, overrides[code]]),
      ]);
      const hit = cache.get(key);
      if (hit) return hit;
      const o = computeOutcome({
        vintage,
        rules,
        levers,
        settings: {
          leverValues: values,
          implementationYear: IMPLEMENTATION_YEAR,
          debtInterestFeedback: state.debtInterestFeedback,
          assessAsOf: state.assessAsOf,
          ...(Object.keys(overrides).length > 0 ? { implementationYearByCode: overrides } : {}),
          ...(Object.keys(revisions).length > 0 ? { revisions } : {}),
        },
      });
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, o);
      return o;
    };
  }, [state.debtInterestFeedback, state.assessAsOf, gameDelays, revisions]);
}

/** The stability-rule headroom of an outcome, in £ million; nought when the rule set has none. */
export function headroomOfOutcome(outcome: Outcome): number {
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}
