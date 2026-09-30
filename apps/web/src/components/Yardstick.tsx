import { THIN_HEADROOM_GBPM, formatGbpBn } from '@btc/engine';

/**
 * The advisers' yardstick, in words (Phase 25): what they call thin, the markets' own line. A
 * judgement, in the advisers' voice; nothing is scored against it, and there is no target to meet
 * (ADR-0025). The review says it when the Budget ends thin; the briefing gives the same line as
 * advice, beside the calculation it follows from (Phase 28, ADR-0030).
 */
export function Yardstick({ className = 'review__yardstick' }: { className?: string }) {
  return (
    <p className={className}>
      Your advisers call headroom under {formatGbpBn(THIN_HEADROOM_GBPM, 0)} thin. The markets
      notice.{' '}
    </p>
  );
}
