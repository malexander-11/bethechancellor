import { formatGbpBn, type DistributionalNote, type ReactionSignal } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

export const AUDIENCE_TITLES: Record<ReactionSignal['audience'], string> = {
  rules: 'Your own rules',
  markets: 'The markets',
  parliament: 'Parliament',
  public: 'The electorate',
};

function reading(signal: ReactionSignal): string | null {
  const { value, unit, label } = signal.reading;
  if (unit === 'status') return null;
  if (unit === 'GBPm') return `${label}: ${formatGbpBn(value, 1, true)}`;
  if (unit === 'pp')
    return `${label}: ${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)} percentage points`;
  if (unit === 'ratio') return `${label}: ${value.toFixed(1)}×`;
  return `${label}: ${Math.round(value)}`;
}

/**
 * One audience's reaction. The level decides the colour, the band decides the words, the
 * reading that selected the band is printed underneath so the judgement can be checked, and the
 * decisions behind the reading are named. Every band is a game judgement and wears the badge.
 */
export function ReactionPanel({
  audience,
  signals,
  notes,
  title,
}: {
  audience: ReactionSignal['audience'];
  signals: ReactionSignal[];
  notes?: DistributionalNote[];
  title?: string;
}) {
  const mine = signals.filter((s) => s.audience === audience);
  if (mine.length === 0 && !notes?.length) return null;
  return (
    <section className={`reaction reaction--${audience}`} aria-labelledby={`reaction-${audience}`}>
      <h3 id={`reaction-${audience}`} className="reaction__title">
        {title ?? AUDIENCE_TITLES[audience]}
      </h3>
      {mine.map((signal) => (
        <div key={signal.id} className={`signal signal--${signal.level}`}>
          {signal.group ? <p className="signal__group kicker">{signal.group}</p> : null}
          <p className="signal__headline">
            {signal.headline} <LabelBadge badge="simulated" />
          </p>
          <p className="signal__detail">{signal.detail}</p>
          {signal.causes.length > 0 ? (
            <p className="signal__causes">
              <span className="signal__because">Because of</span> {signal.causes.join(' · ')}
            </p>
          ) : null}
          <p className="source">
            {reading(signal) ? <span className="signal__reading">{reading(signal)}</span> : null}
            {signal.sources.map((s, i) => (
              <span key={`${s.sourceId}-${i}`}>
                {i > 0 || reading(signal) ? ' · ' : ''}
                <SourceLink ref={s} />
              </span>
            ))}
          </p>
        </div>
      ))}
      {notes?.length ? (
        <div className="signal signal--neutral">
          <p className="signal__headline">Who feels these measures</p>
          <ul className="signal__notes">
            {notes.map((note) => (
              <li key={`${note.leverId}-${note.text.slice(0, 20)}`}>
                <strong>{note.leverTitle}.</strong> {note.text}{' '}
                {note.sources.map((s, i) => (
                  <span key={`${s.sourceId}-${i}`}>
                    {i > 0 ? ' · ' : ''}
                    <SourceLink ref={s} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
