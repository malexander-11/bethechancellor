import { formatGbpBn } from '../format.js';
import type { RuleVerdict } from '../types/engine.js';

/**
 * A rule missed on these numbers: a fiscal rule not met, or the welfare cap past its margin. The
 * one test every Budget-day summary reads, so the statement, the close, the speech and the rules
 * line can never disagree about whether a rule was missed (Phase 25).
 */
export function isMissed(v: RuleVerdict): boolean {
  return v.status === 'notMet' || v.status === 'aboveMargin';
}

/** "the debt rule by £4.5bn": a missed rule by its plain name and its own margin, Worked out. */
export function missedBy(v: RuleVerdict): string {
  return `${v.shortName} by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`;
}
