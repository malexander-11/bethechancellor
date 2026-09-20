import { formatPct, type Milestone } from '@btc/engine';
import { sourcesById } from '../data';

function show(m: Milestone): string {
  switch (m.unit) {
    case 'pctRealPerYear':
      return `${formatPct(m.value, 1, true)} a year`;
    case 'pctGDP':
      return `${formatPct(m.value, 1)} of GDP`;
    case 'GBPbn':
      return `£${m.value.toFixed(1)}bn`;
  }
}

/**
 * Reference points beside a spending control: what this budget has done before, and the targets.
 * One click away whatever the workings switch says, with each figure's note and source beneath it.
 */
export function Milestones({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <details className="milestones">
      <summary>For comparison</summary>
      <ul className="milestones__list">
        {milestones.map((m) => {
          const doc = sourcesById.get(m.source.sourceId);
          const where = [doc?.org, m.source.table ?? m.source.paragraph].filter(Boolean).join(' ');
          return (
            <li key={m.label} className="milestone">
              <span className="milestone__label">{m.label}</span>
              <span className="milestone__value">{show(m)}</span>
              {m.note || where ? (
                <span className="milestone__note">{`${m.note ?? ''} ${where}`.trim()}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
