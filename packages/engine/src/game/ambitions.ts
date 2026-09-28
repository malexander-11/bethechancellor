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
 * whether it is on follows from the lever values alone, so the flagship screens and step 4 can
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
  /**
   * Promises broken by a lever. The fiscal-rules promise is left out: a missed rule is counted
   * where the rules are shown, once (Phase 25).
   */
  broken: number;
  /** Promises strained and not also broken: a promise counts once, as broken. */
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
  // The promises are fixed: every one is in force from the first screen to the last.
  const promises = promiseBreaks(values, pm.promises, levers).map((report) => {
    // The fiscal rules are judged by the rules themselves, not by a lever.
    if (report.promise.judgedBy !== 'fiscalRules') return report;
    const missed = outcome.verdicts.some(
      (v) => v.status === 'notMet' || v.status === 'aboveMargin',
    );
    return { ...report, kept: !missed };
  });
  const strains = promiseStrains(values, pm.promises, levers);
  const brokenIds = new Set(promises.filter((p) => !p.kept).map((p) => p.promise.id));
  // A missed rule is counted as a missed rule, once, where the rules are shown (Phase 25).
  const brokenByLevers = promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
  return {
    priorities,
    promises,
    strains,
    delivered: priorities.filter((p) => p.status === 'delivered').length,
    settledLower: priorities.filter((p) => p.status === 'settledLower').length,
    started: priorities.filter((p) => p.status === 'started').length,
    notFunded: priorities.filter((p) => p.status === 'notFunded').length,
    broken: brokenByLevers.length,
    strained: strains.filter((s) => s.strained && !brokenIds.has(s.promise.id)).length,
  };
}
