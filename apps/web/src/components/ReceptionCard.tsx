import type { DistributionalNote, Reason, Reception } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

const MARK: Record<Reason['direction'], string> = { up: '▲', down: '▼', flat: '•' };

function points(r: Reason): string {
  return r.points > 0 ? `+${r.points}` : r.points < 0 ? `−${Math.abs(r.points)}` : '0';
}

/**
 * One audience's reception: a five-step meter, the rubber-stamped label, the two or three reasons
 * that moved it most, and a "why this rating" disclosure listing every rule with its points, its
 * reading, the decisions behind it and, with the workings on, its sources. Every sentence is a game
 * judgement from data and wears the badge.
 */
export function ReceptionCard({
  reception,
  notes,
}: {
  reception: Reception;
  /** For the public: who feels the measures, carried straight from the levers moved. */
  notes?: DistributionalNote[];
}) {
  const { audience, title, question, rating, label, reasons, all } = reception;
  const tone = rating <= 2 ? 'stamp--bad' : rating === 3 ? 'stamp--warn' : 'stamp--good';
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
      <p className="reception__question kicker">{question}</p>
      <ol className="meter" role="img" aria-label={`${rating} of 5: ${label}`}>
        {[1, 2, 3, 4, 5].map((step) => (
          <li key={step} className={`meter__step${step <= rating ? ' meter__step--lit' : ''}`} />
        ))}
      </ol>
      <p className={`reception__label stamp ${tone}`}>{label}</p>
      {reasons.length === 0 ? (
        <p className="panel__hint">Nothing in this Budget moved them either way.</p>
      ) : (
        <ul className="reasons">
          {reasons.map((r) => (
            <li key={r.rule} className={`reason reason--${r.direction}`}>
              <span className="reason__mark" aria-hidden="true">
                {MARK[r.direction]}
              </span>
              <span>
                <span className="sr-only">{r.direction === 'up' ? 'For: ' : 'Against: '}</span>
                {r.text}
                {r.causes.length > 0 ? (
                  <span className="reason__causes">Because of {r.causes.join(' · ')}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <details className="reception__why">
        <summary>Why this rating</summary>
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
