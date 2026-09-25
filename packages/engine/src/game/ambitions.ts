import type { DeliverOption, Lever, OptionsFile, PmFile, Priority } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import { deliverOptionsFor, optionState, rankedPriorities, type OptionState } from './options.js';
import { promiseBreaks, type PromiseReport } from './promises.js';

export { deliversTarget, promiseBreaks, type PromiseReport } from './promises.js';

/**
 * What the Chancellor agreed with the Prime Minister, against what the package actually does
 * (Phase 18, ADR-0022). A priority is delivered when one of its ways to deliver is on, partly
 * delivered when an option has been adjusted on the desk without getting there, and undelivered
 * when nothing has moved. Whether an option is on follows from the lever values alone: nothing
 * is stored, so the desk and the guided screens can never disagree. Nothing here is a judgement;
 * the words about it come later and wear the simulated badge.
 */

export type PriorityStatus = 'delivered' | 'part' | 'undelivered';

export interface OptionReport {
  option: DeliverOption;
  state: OptionState;
  /** Set when a lever in the bundle has been pushed to a later year. */
  delayedTo?: string;
  /** The option's effect on borrowing in the target year, £ million, positive = more borrowing. */
  costGbpm: number;
}

export interface PriorityReport {
  priority: Priority;
  /** 1 for the first priority ranked, 2 for the second, 3 for the third. */
  rank: number;
  status: PriorityStatus;
  options: OptionReport[];
  /** What the options on or adjusted for this priority add to borrowing in the target year. */
  costGbpm: number;
}

export interface AmbitionStatus {
  priorities: PriorityReport[];
  promises: PromiseReport[];
  /** Priorities with at least one way to deliver them on. */
  delivered: number;
  /** Manifesto promises broken. */
  broken: number;
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
      const delayedTo = codes.map((code) => game.delays[code]).find((y) => y !== undefined);
      return {
        option,
        state,
        ...(delayedTo ? { delayedTo } : {}),
        costGbpm: state === 'off' ? 0 : costOf(codes),
      };
    });
    const status: PriorityStatus = reports.some((r) => r.state === 'on')
      ? 'delivered'
      : reports.some((r) => r.state === 'adjusted')
        ? 'part'
        : 'undelivered';
    return {
      priority,
      rank: i + 1,
      status,
      options: reports,
      costGbpm: reports.reduce((acc, r) => acc + r.costGbpm, 0),
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
  return {
    priorities,
    promises,
    delivered: priorities.filter((p) => p.status === 'delivered').length,
    broken: promises.filter((p) => !p.kept).length,
  };
}
