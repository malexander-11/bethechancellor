import { gameOutcomeOf, type Outcome } from '@btc/engine';
import { levers, rules, vintage } from '../data';

/**
 * "What would the Budget look like if…": the engine re-run for a trial set of lever values. The
 * option cards and the fine-tuning hints price their choices with it. Every Budget is worked out
 * under the same settings (Phase 26), so one cache serves every screen, and a re-render costs
 * nothing. (Phase 24 retired the delays and the OBR's re-scoring that once conditioned it.)
 */
const outcomeOf = gameOutcomeOf({ vintage, rules, levers });

export function useOutcomeOf(): (values: Record<string, number>) => Outcome {
  return outcomeOf;
}

/** The stability-rule headroom of an outcome, in £ million; nought when the rule set has none. */
export function headroomOfOutcome(outcome: Outcome): number {
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}
