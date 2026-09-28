import type { Badge, DistributionalNote, Reason, Reception, SourceRef } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/** A line on the wider economy for the markets' fold (Phase 25): growth in words, debt interest. */
export interface EconomyLine {
  key: string;
  /** Whose note it is, when it is a measure's own: "Corporation tax". */
  lead?: string;
  text: string;
  badge: Badge;
  sources: SourceRef[];
}

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
 * sources. Every sentence is a game judgement from data and wears the badge. The markets' fold also
 * says, in words, what the Budget may do to growth and, worked out, what its borrowing costs in
 * interest (Phase 25).
 */
export function ReceptionCard({
  reception,
  notes,
  economy,
}: {
  reception: Reception;
  /** For the public: who feels the measures, carried straight from the levers moved. */
  notes?: DistributionalNote[];
  /** For the markets: what the Budget may do to growth, and what its borrowing costs in interest. */
  economy?: EconomyLine[];
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
          Every audience starts at three. One or two points either way move it a step; three or
          more, two steps. A red line or a missed rule can hold the rating down whatever else
          happens. The thresholds are the game’s, and each says what it leans on.
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
        {economy?.length ? (
          <>
            <p className="reception__notes-title">Growth and debt interest</p>
            <ul>
              {economy.map((line) => (
                <li key={line.key}>
                  {line.lead ? <strong>{line.lead}. </strong> : null}
                  {line.text} <LabelBadge badge={line.badge} />
                  <SourceList as="span" className="briefing__sources" refs={line.sources} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
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
