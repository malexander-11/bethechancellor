import { THIN_HEADROOM_GBPM, formatGbpBn } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * The advisers' yardstick, in words (Phase 25): what they call thin, the markets' own line. A
 * judgement, badged as one; nothing is scored against it, and there is no target to meet
 * (ADR-0025). The briefing says it once, and the review says it again when the Budget ends thin.
 */
export function Yardstick({ className = 'brief__yardstick' }: { className?: string }) {
  return (
    <p className={className}>
      <LabelBadge badge="simulated" /> Your advisers call headroom under{' '}
      {formatGbpBn(THIN_HEADROOM_GBPM, 0)} thin. The markets notice.{' '}
      <SourceList
        as="span"
        className="briefing__sources"
        refs={[
          { sourceId: 'ifg-healey-tax-budget-2026' },
          { sourceId: 'hmt-budget-2025-speech' },
          { sourceId: 'boe-fsr-2026-07' },
        ]}
      />
    </p>
  );
}
