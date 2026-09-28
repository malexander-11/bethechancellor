import type { DistributionalNote, Reason, Reception } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

const MARK: Record<Reason['direction'], string> = { up: '▲', down: '▼', flat: '•' };

function points(r: Reason): string {
  return r.points > 0 ? `+${r.points}` : r.points < 0 ? `−${Math.abs(r.points)}` : '0';
}

/** "Why this rating (2 for, 1 against)": the fold says how many rules pulled each way. */
function whySummary(tally: Reception['tally']): string {
  const parts = [
    tally.for > 0 ? `${tally.for} for` : null,
    tally.against > 0 ? `${tally.against} against` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? `Why this rating (${parts.join(', ')})` : 'Why this rating';
}

/**
 * One audience's reception: a five-step meter, the label in words, and the one reason that always
 * agrees with the rating (Phase 25), with the decisions behind it that pushed that way. When
 * something pulled the other way, one short line names it: "Counted against: Tax burden ·
 * Uncertified costings". A "why this rating" disclosure holds the question the audience asks and
 * every rule with its points, its reading, the decisions behind it and, with the workings on, its
 * sources. Every sentence is a game judgement from data and wears the badge.
 */
export function ReceptionCard({
  reception,
  notes,
}: {
  reception: Reception;
  /** For the public: who feels the measures, carried straight from the levers moved. */
  notes?: DistributionalNote[];
}) {
  const { audience, title, question, rating, label, lead: first, counted, tally, all } = reception;
  const id = `reception-${audience}`;
  return (
    <section
      className={`reception doc reception--${audience} reception--r${rating}`}
      aria-labelledby={id}
    >
      <div className="reception__head">
        <h3 id={id} className="reception__title">
          {title}
        </h3>
        <LabelBadge badge="simulated" />
      </div>
      <ol className="meter" role="img" aria-label={`${rating} of 5: ${label}`}>
        {[1, 2, 3, 4, 5].map((step) => (
          <li key={step} className={`meter__step${step <= rating ? ' meter__step--lit' : ''}`} />
        ))}
      </ol>
      <p className="reception__label">
        {label} <span className="reception__score">{rating} of 5</span>
      </p>
      {!first ? (
        <p className="panel__hint">Nothing in this Budget moved them either way.</p>
      ) : (
        <p className={`reason reason--${first.direction}`}>
          <span className="reason__mark" aria-hidden="true">
            {MARK[first.direction]}
          </span>
          <span>
            <span className="sr-only">{first.direction === 'up' ? 'For: ' : 'Against: '}</span>
            {first.text}
            {first.causes.length > 0 ? (
              <span className="reason__causes">Because of {first.causes.join(' · ')}</span>
            ) : null}
          </span>
        </p>
      )}
      {counted ? (
        <p className={`reason__counted reason__counted--${counted.side}`}>
          Counted {counted.side}: {counted.labels.join(' · ')}
        </p>
      ) : null}
      <details className="reception__why">
        <summary>{whySummary(tally)}</summary>
        <p className="reception__question kicker">{question}</p>
        <p className="panel__hint">
          Every audience starts at three. Each line below adds or takes points; a red line can hold
          the rating down whatever else happens. The thresholds are the game’s, and each says what
          it leans on.
        </p>
        <ul>
          {all.map((r) => (
            <li key={r.rule} className={`reason--${r.direction}`}>
              <strong>{points(r)}</strong> {r.text}
              {r.reading.text ? (
                <span className="reception__reading">
                  {r.reading.label}: {r.reading.text}
                </span>
              ) : null}
              {r.causes.length > 0 ? (
                <span className="reception__reading">Because of {r.causes.join(' · ')}</span>
              ) : null}
              {r.nudge ? (
                <span className="reception__reading reception__nudge">{r.nudge}</span>
              ) : null}
              <span className="reception__reading">{r.note}</span>
              <SourceList as="span" className="briefing__sources" refs={r.sources} />
            </li>
          ))}
        </ul>
        {notes?.length ? (
          <>
            <p className="reception__notes-title">Who feels these measures</p>
            <ul>
              {notes.map((note) => (
                <li key={`${note.leverId}-${note.text.slice(0, 20)}`}>
                  <strong>{note.leverTitle}.</strong> {note.text}
                  <SourceList as="span" className="briefing__sources" refs={note.sources} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </section>
  );
}
