import { formatGbpBn, type AttributionRow } from '@btc/engine';
import { LabelBadge } from './LabelBadge';

function tone(v: number): string {
  return v > 0.5 ? 'amount--worse' : v < -0.5 ? 'amount--better' : '';
}

/** The engine's positive-is-worse figure, said the way a reader thinks: "£8.4bn worse". */
export function betterOrWorse(v: number): string {
  const size = formatGbpBn(Math.abs(v), 1);
  return v > 0.5 ? `${size} worse` : v < -0.5 ? `${size} better` : size;
}

function size(row: AttributionRow): number {
  return Math.max(Math.abs(row.currentBudgetGbpm), Math.abs(row.psnbGbpm));
}

export function AttributionList({
  rows,
  baselineHeadroomGbpm,
  comparator,
}: {
  rows: AttributionRow[];
  baselineHeadroomGbpm: number;
  /** A published package to set the total against: what Budget 2025 did to borrowing in the year. */
  comparator?: { label: string; psnbGbpm: number };
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
    <table className="attribution">
      <thead>
        <tr>
          <th scope="col">Change</th>
          <th scope="col" className="attribution__num">
            Current budget
          </th>
          <th scope="col" className="attribution__num">
            Borrowing
          </th>
        </tr>
      </thead>
      <tbody>
        {[...levers, ...interest].map((row) => (
          <tr key={`${row.kind}-${row.code ?? row.label}`}>
            <th scope="row">
              {row.label} <LabelBadge badge={row.badge} />
              {row.fromYear ? <span className="source"> from {row.fromYear}</span> : null}
            </th>
            <td className={`attribution__num amount ${tone(row.currentBudgetGbpm)}`}>
              {betterOrWorse(row.currentBudgetGbpm)}
            </td>
            <td className={`attribution__num amount ${tone(row.psnbGbpm)}`}>
              {betterOrWorse(row.psnbGbpm)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td className={`attribution__num amount ${tone(totalCurrent)}`}>
            {betterOrWorse(totalCurrent)}
          </td>
          <td className={`attribution__num amount ${tone(totalBorrowing)}`}>
            {betterOrWorse(totalBorrowing)}
          </td>
        </tr>
        {comparator ? (
          <tr className="attribution__comparator">
            <th scope="row">{comparator.label}</th>
            <td />
            <td className={`attribution__num amount ${tone(comparator.psnbGbpm)}`}>
              {betterOrWorse(comparator.psnbGbpm)}
            </td>
          </tr>
        ) : null}
      </tfoot>
    </table>
  );
}
