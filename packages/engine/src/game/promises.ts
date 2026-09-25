import type { Lever, Promise_ } from '../types/data.js';

/**
 * The manifesto's red lines against the package. Nothing here is a judgement: a promise is broken
 * when a lever the promise names is on the wrong side of its default, and a target is delivered
 * when a lever sits at or beyond it in the direction it points. The words about it come later
 * and wear the simulated badge; this is arithmetic over the lever values.
 */

export interface PromiseReport {
  promise: Promise_;
  kept: boolean;
  /** Lever codes on the wrong side, with their values. */
  brokenBy: { code: string; value: number }[];
}

/** Whether a lever value delivers a target, in the direction the target points. */
export function deliversTarget(lever: Lever | undefined, value: number, target: number): boolean {
  const base = lever?.control.default ?? 0;
  if (target === base) return value === base;
  return target > base ? value >= target : value <= target;
}

/**
 * The promises a set of lever values breaks, by promise id. A toggle breaks a promise when it is
 * on; a slider when it is above or below its default as the promise says.
 */
export function promiseBreaks(
  values: Record<string, number>,
  promises: readonly Promise_[],
  levers: readonly Lever[],
): PromiseReport[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  return promises.map((promise) => {
    const brokenBy: { code: string; value: number }[] = [];
    for (const rule of promise.breaks) {
      const lever = byCode.get(rule.code);
      const base = lever?.control.default ?? 0;
      const value = values[rule.code] ?? base;
      const broken =
        rule.when === 'on' ? value !== base : rule.when === 'above' ? value > base : value < base;
      if (broken) brokenBy.push({ code: rule.code, value });
    }
    return { promise, kept: brokenBy.length === 0, brokenBy };
  });
}
