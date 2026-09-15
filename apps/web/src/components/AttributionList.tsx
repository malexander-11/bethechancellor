import { formatGbpBn, type AttributionRow } from '@btc/engine';
import { LabelBadge } from './LabelBadge';

function tone(v: number): string {
  return v > 0.5 ? 'amount--worse' : v < -0.5 ? 'amount--better' : '';
}

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
  const levers = rows
    .filter((r) => r.kind !== 'debtInterest')
    .sort((a, b) => Math.abs(b.currentBudgetGbpm) - Math.abs(a.currentBudgetGbpm));
  const interest = rows.filter((r) => r.kind === 'debtInterest');
  const total = rows.reduce((acc, r) => acc + r.currentBudgetGbpm, 0);
  return (
    <ul className="attribution">
      {[...levers, ...interest].map((row) => (
        <li key={`${row.kind}-${row.code ?? row.label}`}>
          <span>
            {row.label} <LabelBadge badge={row.badge} />
          </span>
          <span className={`amount ${tone(row.currentBudgetGbpm)}`}>
            {formatGbpBn(row.currentBudgetGbpm, 1, true)}
          </span>
        </li>
      ))}
      <li>
        <strong>Total change to headroom</strong>
        <strong className={`amount ${tone(total)}`}>{formatGbpBn(-total, 1, true)}</strong>
      </li>
    </ul>
  );
}
