import type { Flagship, Lever, PmFile, Promise_ } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';

/**
 * What the Chancellor promised the Prime Minister, against what the package actually does.
 *
 * Nothing here is a judgement: a priority is funded when its lever sits at or beyond its target,
 * a promise is broken when a lever the promise names is on the wrong side of its default. The
 * words about it come later and wear the simulated badge; this is arithmetic over the package.
 */

export type PriorityStatus = 'funded' | 'part-funded' | 'unfunded' | 'delayed';

export interface PriorityReport {
  flagship: Flagship;
  status: PriorityStatus;
  /** The lever's current value against the target that delivers the flagship. */
  current: number;
  target: number;
  /** Positive when the measure has been pushed to a later year. */
  delayedTo?: string;
  /** The flagship's effect on borrowing in the target year, £ million, positive = more borrowing. */
  costGbpm: number;
}

export interface PromiseReport {
  promise: Promise_;
  kept: boolean;
  /** Lever codes on the wrong side, with their values. */
  brokenBy: { code: string; value: number }[];
}

export interface AmbitionStatus {
  priorities: PriorityReport[];
  promises: PromiseReport[];
  /** Priorities funded or delayed, and manifesto promises broken. */
  funded: number;
  broken: number;
}

/** Whether a lever value delivers a flagship's target, in the direction the target points. */
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

/** The flagships a game has agreed with the PM, in the order they were chosen. */
export function chosenFlagships(game: GamePermalink, pm: PmFile): Flagship[] {
  const byId = new Map(pm.flagships.map((f) => [f.id, f] as const));
  return game.priorities.map((id) => byId.get(id)).filter((f): f is Flagship => f !== undefined);
}

export function ambitionStatus(
  game: GamePermalink,
  pm: PmFile,
  outcome: Outcome,
  levers: readonly Lever[],
): AmbitionStatus {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const values = outcome.settings.leverValues;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    outcome.paths.policyYears[outcome.paths.policyYears.length - 1] ??
    '';
  const priorities = chosenFlagships(game, pm).map((flagship): PriorityReport => {
    const lever = byCode.get(flagship.target.code);
    const base = lever?.control.default ?? 0;
    const current = values[flagship.target.code] ?? base;
    const target = flagship.target.value;
    const effect = outcome.leverEffects.find((e) => e.code === flagship.target.code);
    const costGbpm = effect
      ? (effect.currentSpending[targetYear] ?? 0) +
        (effect.capitalSpending[targetYear] ?? 0) -
        (effect.receipts[targetYear] ?? 0)
      : 0;
    const delayedTo = game.delays[flagship.target.code];
    let status: PriorityStatus;
    if (deliversTarget(lever, current, target)) status = delayedTo ? 'delayed' : 'funded';
    else if (current === base) status = 'unfunded';
    else status = 'part-funded';
    return { flagship, status, current, target, delayedTo, costGbpm };
  });
  // The manifesto is fixed: every promise is in force from the first screen to the last.
  const promises = promiseBreaks(values, pm.promises, levers).map((report) => {
    // A promise with no lever detector is judged by the rules themselves.
    if (report.promise.breaks.length > 0) return report;
    const missed = outcome.verdicts.some(
      (v) => v.status === 'notMet' || v.status === 'aboveMargin',
    );
    return { ...report, kept: !missed };
  });
  return {
    priorities,
    promises,
    funded: priorities.filter((p) => p.status === 'funded' || p.status === 'delayed').length,
    broken: promises.filter((p) => !p.kept).length,
  };
}
