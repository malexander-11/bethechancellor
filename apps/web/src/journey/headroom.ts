import { computeOutcome, drawForecast } from '@btc/engine';
import { useMemo } from 'react';
import { context, draws, levers, rules, vintage } from '../data';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';

/**
 * "What would headroom be if…": the engine re-run for a trial set of lever values under the
 * game's own conditions (delays, and the OBR's re-scoring once the envelope is open). The
 * compromises and the rabbit both price their options with it.
 */
export function useHeadroomOf(): (
  values: Record<string, number>,
  delays?: Record<string, string>,
) => number {
  const { state } = useBudget();
  const seed = state.game?.seed ?? 0;
  const revealed = state.game?.revealed ?? false;
  const gameDelays = state.game?.delays;
  const revisions = useMemo(
    () =>
      revealed && seed > 0 ? drawForecast(seed, draws, context, levers, vintage).revisions : {},
    [revealed, seed],
  );
  return useMemo(
    () => (values: Record<string, number>, delays?: Record<string, string>) => {
      const overrides = delays ?? gameDelays ?? {};
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
      return o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
    },
    [state.debtInterestFeedback, state.assessAsOf, gameDelays, revisions],
  );
}
