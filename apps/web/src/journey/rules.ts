import type { RuleVerdict } from '@btc/engine';

/**
 * A rule missed on these numbers, and a missed rule by its plain name and its own margin: the
 * engine's, so every screen and every Budget-day summary reads the same test (Phase 25).
 */
export { isMissed, missedBy } from '@btc/engine';

/** "Debt rule": the plain name (Phase 25), for the head of a line. */
export function ruleTitle(v: RuleVerdict): string {
  const name = v.shortName.replace(/^the /, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}
