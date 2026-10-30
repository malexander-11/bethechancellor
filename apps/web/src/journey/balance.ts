import { balanceGbpm, balanceState, formatGbpBn, type BalanceState } from '@btc/engine';
import { levers } from '../data';
import { useBudget } from '../state/budget';
import { useOutcomeOf } from './outcome';

export interface Balance {
  /** £ million above (+) or below (−) the Chancellor's headroom in the target year. */
  gbpm: number;
  state: BalanceState;
  /** "£0.5bn to find", "£1.2bn to spend", "nothing to spend or find". */
  words: string;
}

/** The money in words, as the bar and the pages say it (ADR-0046). */
export function balanceWords(gbpm: number): string {
  const state = balanceState(gbpm);
  if (state === 'settled') return 'nothing to spend or find';
  return `${formatGbpBn(Math.abs(gbpm), 1)} ${state === 'short' ? 'to find' : 'to spend'}`;
}

/**
 * The money a player has to play with, on the Budget as it stands (ADR-0046): what they saved by
 * disagreeing less what they gave up, with what they spent or found since, interest included.
 */
export function useBalance(): Balance {
  const { outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const gbpm = balanceGbpm(outcomeOf, outcome, levers);
  return { gbpm, state: balanceState(gbpm), words: balanceWords(gbpm) };
}

/** What a set of lever values does to the money, against the Budget as it stands, £ million. */
export function useMoneyOf(): (values: Record<string, number>) => number {
  const { state } = useBudget();
  const outcomeOf = useOutcomeOf();
  // Both sides from the same cache, so a move that changes nothing reads as nothing.
  const now = balanceGbpm(outcomeOf, outcomeOf(state.leverValues), levers);
  return (values) => balanceGbpm(outcomeOf, outcomeOf(values), levers) - now;
}
