import { formatGbpBn, fyStart, type LeverEffect } from '@btc/engine';

/**
 * How an effect is read into words, shared by the lever card and, from Phase 18, the option
 * cards. Positive is always better for the public finances, whatever the engine's sign.
 */

/** Effect on the current budget in a year: receipts up or spending down improves it. Positive = better. */
export function currentBudgetImprovement(effect: LeverEffect, year: string): number {
  return (
    (effect.receipts[year] ?? 0) -
    (effect.currentSpending[year] ?? 0) -
    (effect.macroCurrent[year] ?? 0)
  );
}

/** Effect on total borrowing in a year, investment included. Positive = less borrowing. */
export function borrowingImprovement(effect: LeverEffect, year: string): number {
  return (
    (effect.receipts[year] ?? 0) -
    (effect.currentSpending[year] ?? 0) -
    (effect.capitalSpending[year] ?? 0) -
    (effect.macroPsnb[year] ?? 0)
  );
}

/** Below this (£0.05bn) an effect reads as "unchanged" and a later start is looked for. */
export const UNCHANGED_BELOW_GBPM = 50;

/**
 * The effect as a verb, not a sign: a tax raises or costs, spending saves or costs, and investment
 * puts borrowing up or down. One convention for the reader, whatever the engine's sign is.
 */
export function effectWords(improvement: number, capital: boolean, receipts: boolean): string {
  const size = formatGbpBn(Math.abs(improvement), 1);
  if (Math.abs(improvement) < UNCHANGED_BELOW_GBPM) return 'unchanged';
  if (capital) return `${improvement > 0 ? 'down' : 'up'} ${size}`;
  if (improvement > 0) return `${receipts ? 'raises' : 'saves'} ${size}`;
  return `costs ${size}`;
}

/**
 * When a measure moves nothing in the summary year, the first later policy year in which it does
 * (ADR-0021: a card that cannot start before the summary year says so and names the year).
 */
export function laterStartYear(
  effect: LeverEffect,
  summaryYear: string,
  capital: boolean,
  policyYears: readonly string[],
): string | undefined {
  const improve = (y: string) =>
    capital ? borrowingImprovement(effect, y) : currentBudgetImprovement(effect, y);
  if (Math.abs(improve(summaryYear)) >= UNCHANGED_BELOW_GBPM) return undefined;
  return policyYears.find(
    (y) => fyStart(y) > fyStart(summaryYear) && Math.abs(improve(y)) >= UNCHANGED_BELOW_GBPM,
  );
}
