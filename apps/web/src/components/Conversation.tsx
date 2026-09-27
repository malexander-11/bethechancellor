import type { SimulatedLine } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * One line of simulated speech: who is speaking, what they say, and the published facts the line
 * leans on. The badge is not decoration. It is the contract: nobody published these words, and
 * they produce no number of their own (ADR-0011). The facts' sources show with the workings.
 * A line can show its short form with the rest one tap away, or fold whole under its speaker's
 * name, so a screen that has said its one thing keeps the advice without the words.
 */
export function Spoken({
  line,
  who,
  tone = 'pm',
  moreLabel = 'More',
  folded = false,
  summary,
}: {
  line: SimulatedLine;
  who: string;
  tone?: 'pm' | 'minister' | 'adviser' | 'press';
  /** What the disclosure holding the full line is called, when the line has a short form. */
  moreLabel?: string;
  /** Fold the whole line under its speaker: only the name and the badge show until opened. */
  folded?: boolean;
  /** What the fold is called; by default, advice from the speaker. */
  summary?: string;
}) {
  if (folded) {
    return (
      <details className={`spoken spoken--${tone} spoken--folded more more--quiet`}>
        <summary>
          <span className="kicker">{summary ?? `Advice from the ${who}`}</span>{' '}
          <LabelBadge badge={line.badge} />
        </summary>
        <div className="more__body">
          <p className="spoken__text">{line.text}</p>
          <SourceList refs={line.sources} />
        </div>
      </details>
    );
  }
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
