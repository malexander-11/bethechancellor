import type { Briefing } from '@btc/engine';
import { adviserById } from '../data';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

function numberOf(value: string): number {
  const m = /([\d,.]+)/.exec(value);
  return Number((m?.[1] ?? '0').replace(/,/g, ''));
}

/** A sourced briefing from one adviser: role, title, paragraphs and, optionally, a bar of facts. */
export function AdviserBriefing({
  briefing,
  compact = false,
}: {
  briefing: Briefing;
  compact?: boolean;
}) {
  const adviser = adviserById.get(briefing.adviser);
  const facts = briefing.facts ?? [];
  const total = facts.find((f) => /^all /i.test(f.label));
  const bars = facts.filter((f) => f !== total);
  const max = Math.max(...bars.map((f) => numberOf(f.value)), 1);
  return (
    <article className={`briefing${compact ? ' briefing--compact' : ''}`}>
      <header className="briefing__head">
        <span className="briefing__role">{adviser?.role ?? briefing.adviser}</span>
        <LabelBadge badge="commentary" />
      </header>
      <h3 className="briefing__title">{briefing.title}</h3>
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
      {bars.length > 0 ? (
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
      ) : null}
    </article>
  );
}
