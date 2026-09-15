import type { Briefing } from '@btc/engine';
import { adviserById } from '../data';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

function numberOf(value: string): number {
  const m = /([\d,.]+)/.exec(value);
  return Number((m?.[1] ?? '0').replace(/,/g, ''));
}

/** Up to four facts read as chips; more than that reads better as a bar chart. */
function Facts({ facts }: { facts: NonNullable<Briefing['facts']> }) {
  const total = facts.find((f) => /^all /i.test(f.label));
  const bars = facts.filter((f) => f !== total);
  if (bars.length <= 4) {
    return (
      <ul className="chips" aria-label="Figures">
        {facts.map((f) => (
          <li key={f.label} className="chip">
            <span className="chip__value">{f.value}</span> {f.label}
          </li>
        ))}
      </ul>
    );
  }
  const max = Math.max(...bars.map((f) => numberOf(f.value)), 1);
  return (
    <ul className="facts" aria-label="Figures">
      {bars.map((f) => (
        <li key={f.label} className="facts__row">
          <span className="facts__label">{f.label}</span>
          <span className="facts__bar" aria-hidden="true">
            <span style={{ width: `${(numberOf(f.value) / max) * 100}%` }} />
          </span>
          <span className="facts__value">{f.value}</span>
        </li>
      ))}
      {total ? (
        <li className="facts__row facts__row--total">
          <span className="facts__label">{total.label}</span>
          <span />
          <span className="facts__value">{total.value}</span>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * One adviser, one line. The sourced paragraphs behind it are the detail: they stay a click
 * away so a step reads as a briefing, not a report.
 */
export function AdviserBriefing({
  briefing,
  compact = false,
  variant = 'full',
}: {
  briefing: Briefing;
  compact?: boolean;
  /** "body" drops the role and headline: the caller has already shown them. */
  variant?: 'full' | 'body';
}) {
  const adviser = adviserById.get(briefing.adviser);
  return (
    <article className={`briefing${compact ? ' briefing--compact' : ''}`}>
      {variant === 'full' ? (
        <>
          <header className="briefing__head">
            <span className="briefing__role">{adviser?.role ?? briefing.adviser}</span>
            <LabelBadge badge="commentary" />
          </header>
          <p className="briefing__headline">{briefing.headline}</p>
        </>
      ) : null}
      {briefing.facts?.length ? <Facts facts={briefing.facts} /> : null}
      <details className="briefing__more">
        <summary>{briefing.title}</summary>
        {briefing.paragraphs.map((p, i) => (
          <div key={i} className="briefing__para">
            <p>{p.text}</p>
            <div className="briefing__sources">
              {p.sources.map((s, j) => (
                <SourceLink key={j} ref={s} />
              ))}
            </div>
          </div>
        ))}
      </details>
    </article>
  );
}
