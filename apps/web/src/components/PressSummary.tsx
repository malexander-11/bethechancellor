import type { DrawOutcome } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * The Political Adviser's summary of the morning papers: the clue the seeded draw plants in stage
 * 3. It is a note in an adviser's hand, never a newspaper with a masthead, because a fabricated
 * headline dressed as a source would be the one kind of lie this tool refuses (ADR-0012).
 */
export function PressSummary({ outcome }: { outcome: DrawOutcome }) {
  const { clue } = outcome;
  return (
    <aside className="note note--press" aria-label="The Political Adviser’s press summary">
      <p>
        <span className="kicker">Political Adviser · the morning papers</span>{' '}
        <LabelBadge badge={clue.badge} />
      </p>
      <p>
        <strong>{clue.headline}</strong>
      </p>
      <p>{clue.text}</p>
      <SourceList refs={clue.sources} />
    </aside>
  );
}
