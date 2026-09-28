import { computeOutcome, type Outcome } from '@btc/engine';
import { levers, rules, vintage } from '../data';
import { IMPLEMENTATION_YEAR, SETTINGS } from '../state/budget';

/** Trial outcomes are cheap but not free; a screen of lever cards asks for a few dozen at once. */
const CACHE_LIMIT = 256;
const cache = new Map<string, Outcome>();

/**
 * "What would the Budget look like if…": the engine re-run for a trial set of lever values. The
 * option cards and the fine-tuning hints price their choices with it. Every Budget is worked out
 * under the same settings (Phase 26), so one cache serves every screen, and a re-render costs
 * nothing. (Phase 24 retired the delays and the OBR's re-scoring that once conditioned it.)
 */
function outcomeOf(values: Record<string, number>): Outcome {
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
    settings: { leverValues: values, implementationYear: IMPLEMENTATION_YEAR, ...SETTINGS },
  });
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, o);
  return o;
}

export function useOutcomeOf(): (values: Record<string, number>) => Outcome {
  return outcomeOf;
}

/** The stability-rule headroom of an outcome, in £ million; nought when the rule set has none. */
export function headroomOfOutcome(outcome: Outcome): number {
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}
