import type { Lever } from '../types/data.js';
import type { Outcome } from '../types/engine.js';
import { preBudget, reconcile, type OutcomeOf } from './prices.js';

/**
 * The money a player has to play with (ADR-0046): how far the headroom against the stability rule
 * stands above (to spend) or below (to find) the Chancellor's own, in the target year, interest
 * included. Disagreeing with a tax rise gives money up, with a spending decision saves it; the
 * balance page spends what is saved and finds what is given up. A Budget may not end below the
 * Chancellor's headroom, so the game asks for a balance at or above nothing before it delivers.
 * The figure is the review's reconciliation, so every screen that says it says the same.
 */
export function balanceGbpm(
  outcomeOf: OutcomeOf,
  outcome: Outcome,
  levers: readonly Lever[],
): number {
  const r = reconcile(outcome, preBudget(outcomeOf, outcome.settings.leverValues, levers));
  return r.endGbpm - r.startGbpm;
}

/**
 * Within this, £ million, the money balances: the game's figures are said to a tenth of a billion,
 * and no step on either menu is smaller.
 */
export const BALANCE_SETTLED_GBPM = 50;

export type BalanceState = 'short' | 'settled' | 'spare';

export function balanceState(gbpm: number): BalanceState {
  if (gbpm <= -BALANCE_SETTLED_GBPM) return 'short';
  if (gbpm >= BALANCE_SETTLED_GBPM) return 'spare';
  return 'settled';
}

/** Whether a Budget may be delivered: it leaves the headroom no lower than the Chancellor's. */
export function balanceHolds(gbpm: number): boolean {
  return balanceState(gbpm) !== 'short';
}

/** A value on the lever's steps, free of the float's dust. */
function onGrid(lever: Lever, value: number): number {
  const { min, step } = lever.control;
  const snapped = step > 0 ? Math.round((value - min) / step) * step + min : value;
  return Math.round(snapped * 1e6) / 1e6;
}

/**
 * The lever's value after one more press of an option, or nothing when the option has gone as far
 * as it can: a toggle already on, or a slider at the end of its range.
 */
export function optionNext(lever: Lever, value: number, step: number): number | undefined {
  const { min, max } = lever.control;
  const next = onGrid(lever, value + step);
  if (next < min - 1e-9 || next > max + 1e-9) return undefined;
  if (next === onGrid(lever, value)) return undefined;
  return next;
}

/**
 * How many presses of an option the lever's value holds: none when it rests, or when it has moved
 * the other way (an old link's setting, which the option does not own).
 */
export function optionSteps(lever: Lever, value: number, step: number): number {
  const moved = value - lever.control.default;
  if (moved === 0 || Math.sign(moved) !== Math.sign(step)) return 0;
  return Math.round(Math.abs(moved / step));
}

/** The lever's value with one press taken back, or nothing when there is none to take back. */
export function optionBack(lever: Lever, value: number, step: number): number | undefined {
  if (optionSteps(lever, value, step) === 0) return undefined;
  return onGrid(lever, value - step);
}
