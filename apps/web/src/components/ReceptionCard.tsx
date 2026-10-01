import type { Reason, Reception } from '@btc/engine';

const MARK: Record<Reason['direction'], string> = { up: '▲', down: '▼', flat: '•' };

/**
 * One audience's reception: a five-step meter, the label in words, and the one reason that always
 * agrees with the rating (Phase 25), with the decisions behind it that pushed that way. When
 * something pulled the other way, one short line names it: "Counted against: Tax burden ·
 * Uncertified costings". Every sentence is a game judgement from data; the rules behind the
 * rating are written in the data, and no fold lists them (ADR-0043).
 */
export function ReceptionCard({ reception }: { reception: Reception }) {
  const { audience, title, rating, label, lead: first, counted } = reception;
  const id = `reception-${audience}`;
  return (
    <section
      className={`reception doc reception--${audience} reception--r${rating}`}
      aria-labelledby={id}
    >
      <div className="reception__head">
        <h2 id={id} className="reception__title">
          {title}
        </h2>
      </div>
      {/* One picture, named in words: its five steps are drawing, not a list to read. */}
      <div className="meter" role="img" aria-label={`${rating} of 5: ${label}`}>
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className={`meter__step${step <= rating ? ' meter__step--lit' : ''}`} />
        ))}
      </div>
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
    </section>
  );
}
