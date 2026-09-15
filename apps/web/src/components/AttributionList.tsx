import { formatGbpBn, type AttributionRow } from '@btc/engine';
import { LabelBadge } from './LabelBadge';

export function AttributionList({
  rows,
  baselineHeadroomGbpm,
}: {
  rows: AttributionRow[];
  baselineHeadroomGbpm: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="panel__hint">
        Nothing yet. The OBR baseline gives {formatGbpBn(baselineHeadroomGbpm)} of headroom; move a
        slider to see what each change does to it.
      </p>
    );
  }
  const total = rows.reduce((acc, r) => acc + r.currentBudgetGbpm, 0);
  return (
    <ul className="attribution">
      {rows.map((row) => (
        <li key={`${row.kind}-${row.code ?? row.label}`}>
          <span>
            {row.label} <LabelBadge badge={row.badge} />
          </span>
          <span
            className={`amount ${row.currentBudgetGbpm > 0.5 ? 'amount--worse' : row.currentBudgetGbpm < -0.5 ? 'amount--better' : ''}`}
          >
            {formatGbpBn(row.currentBudgetGbpm, 1, true)}
          </span>
        </li>
      ))}
      <li>
        <strong>Total change to headroom</strong>
        <strong
          className={`amount ${total > 0.5 ? 'amount--worse' : total < -0.5 ? 'amount--better' : ''}`}
        >
          {formatGbpBn(-total, 1, true)}
        </strong>
      </li>
    </ul>
  );
}
