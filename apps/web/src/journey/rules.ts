import { formatGbpBn, type RuleVerdict } from '@btc/engine';

/** A rule missed on these numbers: the fiscal rules not met, the welfare cap past its margin. */
export function isMissed(v: RuleVerdict): boolean {
  return v.status === 'notMet' || v.status === 'aboveMargin';
}

/** "Debt rule": the plain name (Phase 25), for the head of a line. */
export function ruleTitle(v: RuleVerdict): string {
  const name = v.shortName.replace(/^the /, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "the debt rule by £4.5bn": a missed rule and the engine's own margin, Worked out. */
export function missedBy(v: RuleVerdict): string {
  return `${v.shortName} by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`;
}
