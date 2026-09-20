import type { SimulatedLine } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * One line of simulated speech: who is speaking, what they say, and the published facts the line
 * leans on. The badge is not decoration. It is the contract: nobody published these words, and
 * they produce no number of their own (ADR-0011). The facts' sources show with the workings.
 */
export function Spoken({
  line,
  who,
  tone = 'pm',
  moreLabel = 'More',
}: {
  line: SimulatedLine;
  who: string;
  tone?: 'pm' | 'minister' | 'adviser' | 'press';
  /** What the disclosure holding the full line is called, when the line has a short form. */
  moreLabel?: string;
}) {
  return (
    <blockquote className={`spoken spoken--${tone}`}>
      <p className="spoken__who">
        <span className="kicker">{who}</span> <LabelBadge badge={line.badge} />
      </p>
      <p className="spoken__text">{line.short ?? line.text}</p>
      {line.short ? (
        <details className="spoken__more">
          <summary>{moreLabel}</summary>
          <p>{line.text}</p>
        </details>
      ) : null}
      <SourceList refs={line.sources} />
    </blockquote>
  );
}
