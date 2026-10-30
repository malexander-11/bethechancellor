import type { Lever, PmFile } from '../types/data.js';
import type { Outcome } from '../types/engine.js';
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
 * The promises against what the package actually does (Phase 18, ADR-0022; graded in Phase 25):
 * each kept, broken by a lever, or strained in its spirit. The priorities agreed with the Prime
 * Minister, and the ways to deliver them, retired with the Chancellor's Budget as the starting
 * point (ADR-0045): a Budget's purpose is now the Chancellor's, and a player changes it.
 */

export interface AmbitionStatus {
  promises: PromiseReport[];
  /** The promises' amber cases (Phase 23): the words kept, the spirit tested. */
  strains: PromiseStrainReport[];
  /**
   * Promises broken by a lever. The fiscal-rules promise is left out: a missed rule is counted
   * where the rules are shown, once (Phase 25).
   */
  broken: number;
  /** Promises strained and not also broken: a promise counts once, as broken. */
  strained: number;
}

export function ambitionStatus(
  pm: PmFile,
  outcome: Outcome,
  levers: readonly Lever[],
): AmbitionStatus {
  const values = outcome.settings.leverValues;
  // The promises are fixed: every one is in force from the first screen to the last.
  const promises = promiseBreaks(values, pm.promises, levers).map((report) => {
    // The fiscal rules are judged by the rules themselves, not by a lever: the two fiscal rules,
    // not the welfare cap, which the forecast can miss before any measure is moved.
    if (report.promise.judgedBy !== 'fiscalRules') return report;
    const missed = outcome.verdicts.some(
      (v) => (v.kind === 'currentBudget' || v.kind === 'stockFalling') && v.status === 'notMet',
    );
    return { ...report, kept: !missed };
  });
  const strains = promiseStrains(values, pm.promises, levers);
  const brokenIds = new Set(promises.filter((p) => !p.kept).map((p) => p.promise.id));
  // A missed rule is counted as a missed rule, once, where the rules are shown (Phase 25).
  const brokenByLevers = promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
  return {
    promises,
    strains,
    broken: brokenByLevers.length,
    strained: strains.filter((s) => s.strained && !brokenIds.has(s.promise.id)).length,
  };
}
