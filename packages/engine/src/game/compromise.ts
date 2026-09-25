import type { AffordOption, Lever, Promise_ } from '../types/data.js';
import type { Outcome } from '../types/engine.js';
import { promiseBreaks } from './ambitions.js';
import { optionState } from './options.js';

/**
 * The routes out of a gap (stage 5). Nothing here is a judgement: the Director of Tax's
 * suggestions are the ways to afford it not yet chosen, ranked by what the engine says each
 * raises (every one wears its lever's badge, so our own arithmetic ranks beside HMRC's and says
 * so); the spending list is the package's own measures ranked by what they cost; a delay is a
 * later start year; a narrowing is half the distance to the target. The words about them come
 * from data.
 */

export interface AffordSuggestion {
  option: AffordOption;
  /** The lever the option moves (every way to afford moves one), for its title and badge. */
  lever: Lever;
  /** What it does to stability-rule headroom in the target year, £ million, positive = more. */
  yieldGbpm: number;
  /** Promises in force that this move would break and the current package does not. */
  breaks: Promise_[];
}

/** One notch up from the current setting, or null when there is no room to move. */
export function nextNotch(lever: Lever, current: number): number | null {
  const { kind, max, step, default: base } = lever.control;
  if (kind === 'toggle') return current === base ? 1 - base : null;
  if (kind === 'select') {
    const options = Object.keys(lever.control.labels ?? {})
      .map(Number)
      .sort((a, b) => a - b);
    const next = options.find((v) => v > current);
    return next ?? null;
  }
  const next = Number((current + step).toFixed(6));
  return next <= max ? next : null;
}

/**
 * The ways to afford it not yet chosen, ranked by the headroom each buys. `headroomOf` is the
 * caller's engine call, so this stays a pure ranking over whatever the engine says; an option
 * costed by our own arithmetic ranks on that arithmetic and shows its assumption badge beside the
 * figure. One that moves nothing in the target year (a tax that cannot start before it,
 * ADR-0021) buys no headroom there and is not suggested.
 */
export function affordSuggestions(
  afford: readonly AffordOption[],
  levers: readonly Lever[],
  current: Record<string, number>,
  promises: readonly Promise_[],
  headroomOf: (values: Record<string, number>) => number,
  n = 3,
): AffordSuggestion[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const base = headroomOf(current);
  const alreadyBroken = new Set(
    promiseBreaks(current, promises, levers)
      .filter((r) => !r.kept)
      .map((r) => r.promise.id),
  );
  const out: AffordSuggestion[] = [];
  for (const option of afford) {
    if (optionState(option, current, levers) !== 'off') continue;
    const lever = byCode.get(Object.keys(option.values)[0] ?? '');
    if (!lever) continue;
    const trial = { ...current, ...option.values };
    const yieldGbpm = headroomOf(trial) - base;
    if (yieldGbpm <= 0) continue;
    const breaks = promiseBreaks(trial, promises, levers)
      .filter((r) => !r.kept && !alreadyBroken.has(r.promise.id))
      .map((r) => r.promise);
    out.push({ option, lever, yieldGbpm, breaks });
  }
  return out.sort((a, b) => b.yieldGbpm - a.yieldGbpm).slice(0, n);
}

export interface SpendingMeasure {
  lever: Lever;
  /** Effect on borrowing in the target year, £ million, positive = a cost. */
  costGbpm: number;
}

/** The package's spending measures, biggest first: what there is to cut, narrow or delay. */
export function spendingMeasures(
  levers: readonly Lever[],
  outcome: Outcome,
  targetYear: string,
): SpendingMeasure[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const out: SpendingMeasure[] = [];
  for (const effect of outcome.leverEffects) {
    const lever = byCode.get(effect.code);
    if (!lever || lever.category === 'tax' || lever.category === 'macro') continue;
    const costGbpm =
      (effect.currentSpending[targetYear] ?? 0) +
      (effect.capitalSpending[targetYear] ?? 0) -
      (effect.receipts[targetYear] ?? 0);
    if (costGbpm > 0) out.push({ lever, costGbpm });
  }
  return out.sort((a, b) => b.costGbpm - a.costGbpm);
}

/** The fiscal years a measure could be pushed back to: after its start, inside the forecast. */
export function delayOptions(policyYears: readonly string[], startYear: string): string[] {
  return policyYears.filter((y) => y > startYear);
}

/**
 * Half the distance from the default to the target, on the lever's own grid; null when the lever
 * cannot be narrowed (a toggle, or a target one step from the default).
 */
export function narrowedValue(lever: Lever, target: number): number | null {
  if (lever.control.kind === 'toggle') return null;
  const base = lever.control.default;
  const step = lever.control.step;
  const half = base + Math.round((target - base) / 2 / step) * step;
  const value = Number(half.toFixed(6));
  if (value === base || value === target) return null;
  return value;
}

/**
 * An option narrowed to half the distance: the lever values a single-slider bundle would take.
 * Null for a toggle, a bundle of more than one lever, or a target one step from the default.
 */
export function narrowedBundle(
  option: { values: Record<string, number> },
  levers: readonly Lever[],
): Record<string, number> | null {
  const codes = Object.keys(option.values);
  if (codes.length !== 1) return null;
  const code = codes[0] ?? '';
  const lever = levers.find((l) => l.code === code);
  if (!lever) return null;
  const value = narrowedValue(lever, option.values[code] ?? lever.control.default);
  return value === null ? null : { [code]: value };
}
