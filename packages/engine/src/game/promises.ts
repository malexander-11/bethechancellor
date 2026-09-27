import type { Lever, Promise_ } from '../types/data.js';

/**
 * The manifesto's promises against the package. Nothing here is a judgement: a promise is broken
 * when a lever the promise names is on the wrong side of its default, strained when a lever its
 * `strains` list names is (Phase 23: the words of the pledge kept, its spirit tested, amber not
 * red), and a target is delivered when a lever sits at or beyond it in the direction it points.
 * The words about it come later and wear the simulated badge; this is arithmetic over the lever
 * values.
 */

export interface PromiseReport {
  promise: Promise_;
  kept: boolean;
  /** Lever codes on the wrong side, with their values. */
  brokenBy: { code: string; value: number }[];
}

export interface PromiseStrainReport {
  promise: Promise_;
  /** True when a lever the promise's `strains` name is on the wrong side. */
  strained: boolean;
  /** Lever codes on the wrong side, with their values and the authored reason, where there is one. */
  strainedBy: { code: string; value: number; text?: string }[];
}

/** Whether a lever value delivers a target, in the direction the target points. */
export function deliversTarget(lever: Lever | undefined, value: number, target: number): boolean {
  const base = lever?.control.default ?? 0;
  if (target === base) return value === base;
  return target > base ? value >= target : value <= target;
}

/** A toggle crosses a rule when it is on; a slider when it is above or below its default as the rule says. */
function crosses(
  rule: { code: string; when: 'above' | 'below' | 'on' },
  values: Record<string, number>,
  byCode: ReadonlyMap<string, Lever>,
): { code: string; value: number } | undefined {
  const base = byCode.get(rule.code)?.control.default ?? 0;
  const value = values[rule.code] ?? base;
  const crossed =
    rule.when === 'on' ? value !== base : rule.when === 'above' ? value > base : value < base;
  return crossed ? { code: rule.code, value } : undefined;
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
      const hit = crosses(rule, values, byCode);
      if (hit) brokenBy.push(hit);
    }
    return { promise, kept: brokenBy.length === 0, brokenBy };
  });
}

/**
 * The promises a set of lever values strains: the same detector over the `strains` list, for the
 * cases that keep the pledge's words and test its spirit. A promise both broken and strained is
 * reported by both; the callers count it once, as broken.
 */
export function promiseStrains(
  values: Record<string, number>,
  promises: readonly Promise_[],
  levers: readonly Lever[],
): PromiseStrainReport[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  return promises.map((promise) => {
    const strainedBy: PromiseStrainReport['strainedBy'] = [];
    for (const rule of promise.strains) {
      const hit = crosses(rule, values, byCode);
      if (hit) strainedBy.push(rule.text ? { ...hit, text: rule.text } : hit);
    }
    return { promise, strained: strainedBy.length > 0, strainedBy };
  });
}
