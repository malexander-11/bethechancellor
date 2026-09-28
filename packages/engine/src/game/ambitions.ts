import type { DeliverOption, Lever, OptionsFile, PmFile, Priority } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import { deliverOptionsFor, optionState, rankedPriorities, type OptionState } from './options.js';
import {
  promiseBreaks,
  promiseStrains,
  type PromiseReport,
  type PromiseStrainReport,
} from './promises.js';

export {
  deliversTarget,
  promiseBreaks,
  promiseStrains,
  type PromiseReport,
  type PromiseStrainReport,
} from './promises.js';

/**
 * What the Chancellor agreed with the Prime Minister, against what the package actually does
 * (Phase 18, ADR-0022; graded in Phase 25). A priority is delivered when a way to deliver it in
 * full is on; settled lower when such a way was chosen and then trimmed on step 4 short of it;
 * started when only ways that make a start are in; not funded when nothing is. Whether an option
 * delivers in full or starts is authored on the option (`scale`, a judgement badged as one);
 * whether it is on follows from the lever values alone, so the desk and the guided screens can
 * never disagree.
 */

export type PriorityStatus = 'delivered' | 'settledLower' | 'started' | 'notFunded';

export interface OptionReport {
  option: DeliverOption;
  state: OptionState;
  /**
   * What the option puts behind its priority in the target year, £ million: spending, current
   * and capital, plus any tax cut. A reading, not the option's price: the price is what it does
   * to headroom, which the cards and the review show.
   */
  spendingGbpm: number;
}

export interface PriorityReport {
  priority: Priority;
  /** 1 for the first priority ranked, 2 for the second, 3 for the third. */
  rank: number;
  status: PriorityStatus;
  options: OptionReport[];
  /** What the options on or trimmed for this priority put behind it in the target year. */
  spendingGbpm: number;
}

export interface AmbitionStatus {
  priorities: PriorityReport[];
  promises: PromiseReport[];
  /** The promises' amber cases (Phase 23): the words kept, the spirit tested. */
  strains: PromiseStrainReport[];
  /** Priorities delivered in full. */
  delivered: number;
  /** Priorities chosen in full and then trimmed short of it on step 4. */
  settledLower: number;
  /** Priorities with only a start in the Budget. */
  started: number;
  /** Priorities with nothing behind them. */
  notFunded: number;
  /** Manifesto promises broken. */
  broken: number;
  /** Manifesto promises strained and not also broken: a promise counts once, as broken. */
  strained: number;
}

export function ambitionStatus(
  game: GamePermalink,
  pm: PmFile,
  options: OptionsFile,
  outcome: Outcome,
  levers: readonly Lever[],
): AmbitionStatus {
  const values = outcome.settings.leverValues;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    outcome.paths.policyYears[outcome.paths.policyYears.length - 1] ??
    '';
  const costOf = (codes: readonly string[]) =>
    codes.reduce((acc, code) => {
      const effect = outcome.leverEffects.find((e) => e.code === code);
      if (!effect) return acc;
      return (
        acc +
        (effect.currentSpending[targetYear] ?? 0) +
        (effect.capitalSpending[targetYear] ?? 0) -
        (effect.receipts[targetYear] ?? 0)
      );
    }, 0);
  const priorities = rankedPriorities(game, pm).map((priority, i): PriorityReport => {
    const reports = deliverOptionsFor(priority.id, options).map((option): OptionReport => {
      const state = optionState(option, values, levers);
      const codes = Object.keys(option.values);
      const counts = state === 'on' || state === 'adjusted';
      return { option, state, spendingGbpm: counts ? costOf(codes) : 0 };
    });
    const full = reports.filter((r) => r.option.scale.kind === 'full');
    const starts = reports.filter((r) => r.option.scale.kind === 'start');
    const status: PriorityStatus = full.some((r) => r.state === 'on')
      ? 'delivered'
      : full.some((r) => r.state === 'adjusted')
        ? 'settledLower'
        : starts.some((r) => r.state === 'on' || r.state === 'adjusted')
          ? 'started'
          : 'notFunded';
    return {
      priority,
      rank: i + 1,
      status,
      options: reports,
      spendingGbpm: reports.reduce((acc, r) => acc + r.spendingGbpm, 0),
    };
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
  const strains = promiseStrains(values, pm.promises, levers);
  const brokenIds = new Set(promises.filter((p) => !p.kept).map((p) => p.promise.id));
  return {
    priorities,
    promises,
    strains,
    delivered: priorities.filter((p) => p.status === 'delivered').length,
    settledLower: priorities.filter((p) => p.status === 'settledLower').length,
    started: priorities.filter((p) => p.status === 'started').length,
    notFunded: priorities.filter((p) => p.status === 'notFunded').length,
    broken: brokenIds.size,
    strained: strains.filter((s) => s.strained && !brokenIds.has(s.promise.id)).length,
  };
}
