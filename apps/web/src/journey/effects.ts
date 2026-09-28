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
 * A relief cost read into words (Phase 25): HMRC's cost of a tax break is the most ending it could
 * raise, never the forecast yield, so the verb says so.
 */
export function reliefWords(words: string): string {
  return words.replace(/^raises /, 'raises at most ');
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

/**
 * A hint in the conditional (Phase 25): what a move would do, never what it has done, so a
 * resting card cannot read as money already in the Budget. "Raises £8.6bn" becomes "would raise
 * £8.6bn"; "Borrowing down £6.7bn" becomes "borrowing would fall £6.7bn"; a later start leads with
 * the verb: "would raise nothing until 2030-31, then £18.5bn".
 */
export function wouldWords(text: string): string {
  const lower = text.charAt(0).toLowerCase() + text.slice(1);
  const later = /^nothing until (\S+), then (raises|saves|costs) (.*)$/.exec(lower);
  if (later) return `would ${verb(later[2] ?? '')} nothing until ${later[1]}, then ${later[3]}`;
  return lower
    .replace(/^borrowing down /, 'borrowing would fall ')
    .replace(/^borrowing up /, 'borrowing would rise ')
    .replace(/^borrowing unchanged/, 'borrowing would not change')
    .replace(/^changes nothing/, 'would change nothing')
    .replace(/\b(raises|saves|costs)\b/, (v) => `would ${verb(v)}`);
}

function verb(third: string): string {
  return third === 'raises' ? 'raise' : third === 'saves' ? 'save' : 'cost';
}

/**
 * Growth a year after rising prices, in words (Phase 25): how settlements are argued about, said
 * so a cut to a growing budget cannot read as a rise, and a flat one reads as flat. At rest the
 * plan's own path; once moved, the new path with the planned one beside it.
 */
export function growthWords(from: number, to: number, moved: boolean): string {
  const pct = (x: number) => `${Math.abs(x).toFixed(1)}%`;
  const flat = (x: number) => Math.abs(x) < 0.05;
  const path = (x: number) =>
    flat(x)
      ? 'Flat after rising prices'
      : `${x > 0 ? 'Grows' : 'Falls'} ${pct(x)} a year after rising prices`;
  if (!moved) return `${path(to)}, as planned`;
  const now = flat(to)
    ? 'Flat after rising prices'
    : to > 0 && from > 0 && to < from
      ? `Still grows ${pct(to)} a year after rising prices`
      : path(to);
  const planned = flat(from)
    ? 'planned: flat'
    : Math.sign(from) === Math.sign(to) && !flat(to)
      ? `planned: ${pct(from)}`
      : `planned: ${from > 0 ? 'grows' : 'falls'} ${pct(from)}`;
  return `${now} (${planned})`;
}
