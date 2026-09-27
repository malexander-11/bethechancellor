import { computeOutcome, type Outcome } from '@btc/engine';
import { useMemo } from 'react';
import { levers, rules, vintage } from '../data';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';

/** Trial outcomes are cheap but not free; a screen of lever cards asks for a few dozen at once. */
const CACHE_LIMIT = 256;

/**
 * "What would the Budget look like if…": the engine re-run for a trial set of lever values under
 * the Budget's own settings. The option cards and the fine-tuning hints price their choices with
 * it. The result is memoised per set of values while the settings hold, so a re-render costs
 * nothing. (Phase 24 retired the delays and the OBR's re-scoring that once conditioned it.)
 */
export function useOutcomeOf(): (values: Record<string, number>) => Outcome {
  const { state } = useBudget();
  return useMemo(() => {
    const cache = new Map<string, Outcome>();
    return (values: Record<string, number>) => {
      const key = JSON.stringify(
        Object.keys(values)
          .sort()
          .map((code) => [code, values[code]]),
      );
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
        },
      });
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, o);
      return o;
    };
  }, [state.debtInterestFeedback, state.assessAsOf]);
}

/** The stability-rule headroom of an outcome, in £ million; nought when the rule set has none. */
export function headroomOfOutcome(outcome: Outcome): number {
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}
