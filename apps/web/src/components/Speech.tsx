import type { Speech as SpeechText } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * The speech as delivered: authored fragments filled with the engine's figures. Every paragraph
 * is a game judgement and the strip beneath says so once, so the text can read as a speech and
 * still be honest about what it is.
 */
export function Speech({ speech }: { speech: SpeechText }) {
  return (
    <article className="speech doc" aria-label="The Budget speech">
      <p className="doc__head">
        <span className="kicker">The Chancellor of the Exchequer · House of Commons</span>
        <span className="doc__ref">Budget statement · {speech.words} words</span>
      </p>
      {speech.paragraphs.map((p, i) => (
        <p key={`${p.kind}-${i}`} className={`speech__para speech__para--${p.kind}`}>
          {p.text}
          <SourceList as="span" className="speech__sources" refs={p.sources} />
        </p>
      ))}
      <p className="speech__strip">
        <LabelBadge badge="simulated" /> Every sentence here is a game judgement; nobody said these
        words. Every figure in them is the engine’s, formatted as the scorecard formats it, and the
        facts the speech leans on carry their sources.
      </p>
    </article>
  );
}
