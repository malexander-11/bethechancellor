import { formatGbpBn, type AttributionRow } from '@btc/engine';
import { LabelBadge } from './LabelBadge';

function tone(v: number): string {
  return v > 0.5 ? 'amount--worse' : v < -0.5 ? 'amount--better' : '';
}

function size(row: AttributionRow): number {
  return Math.max(Math.abs(row.currentBudgetGbpm), Math.abs(row.psnbGbpm));
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
  const levers = rows.filter((r) => r.kind !== 'debtInterest').sort((a, b) => size(b) - size(a));
  const interest = rows.filter((r) => r.kind === 'debtInterest');
  const totalCurrent = rows.reduce((acc, r) => acc + r.currentBudgetGbpm, 0);
  const totalBorrowing = rows.reduce((acc, r) => acc + r.psnbGbpm, 0);
  return (
    <ul className="attribution attribution--columns">
      <li className="attribution__header">
        <span>Change</span>
        <span>Current budget</span>
        <span>Borrowing</span>
      </li>
      {[...levers, ...interest].map((row) => (
        <li key={`${row.kind}-${row.code ?? row.label}`}>
          <span>
            {row.label} <LabelBadge badge={row.badge} />
          </span>
          <span className={`amount ${tone(row.currentBudgetGbpm)}`}>
            {formatGbpBn(row.currentBudgetGbpm, 1, true)}
          </span>
          <span className={`amount ${tone(row.psnbGbpm)}`}>
            {formatGbpBn(row.psnbGbpm, 1, true)}
          </span>
        </li>
      ))}
      <li>
        <strong>Total (positive = worse)</strong>
        <strong className={`amount ${tone(totalCurrent)}`}>
          {formatGbpBn(totalCurrent, 1, true)}
        </strong>
        <strong className={`amount ${tone(totalBorrowing)}`}>
          {formatGbpBn(totalBorrowing, 1, true)}
        </strong>
      </li>
    </ul>
  );
}
