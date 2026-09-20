import type { Lever, Outcome } from '@btc/engine';
import { betterOrWorse } from './AttributionList';
import { LabelBadge } from './LabelBadge';
import { TableScroll } from './TableScroll';
import { formatLeverValue, levelChange } from './LeverControl';

function tone(v: number): string {
  return v > 0.5 ? 'amount--worse' : v < -0.5 ? 'amount--better' : '';
}

/** Every policy measure in this Budget as the level it moves to, with its effect in the target year. */
export function MeasuresTable({
  outcome,
  levers,
  targetYear,
}: {
  outcome: Outcome;
  levers: readonly Lever[];
  targetYear: string;
}) {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const rows = outcome.attribution.filter((r) => r.kind === 'lever');
  const interest = outcome.attribution.find((r) => r.kind === 'debtInterest');
  if (rows.length === 0) {
    return (
      <p className="panel__hint">
        No tax or spending measures yet: this Budget is the OBR&rsquo;s March forecast as it stands.
      </p>
    );
  }
  const totalCurrent = outcome.attribution.reduce((acc, r) => acc + r.currentBudgetGbpm, 0);
  const totalBorrowing = outcome.attribution.reduce((acc, r) => acc + r.psnbGbpm, 0);
  return (
    <TableScroll label="Table 4.1: your policy decisions">
      <table className="measures">
        <thead>
          <tr>
            <th>Measure</th>
            <th>Setting</th>
            <th>Current budget, {targetYear}</th>
            <th>Borrowing, {targetYear}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const lever = row.code ? byCode.get(row.code) : undefined;
            const effect = outcome.leverEffects.find((e) => e.code === row.code);
            const value = effect?.value ?? 0;
            const change = lever ? levelChange(lever, value, targetYear) : null;
            const setting = lever
              ? lever.control.kind === 'toggle'
                ? 'On'
                : change
                  ? `${change.from} → ${change.to}${change.note ? ` ${change.note}` : ''}`
                  : formatLeverValue(lever, value)
              : '';
            return (
              <tr key={row.code ?? row.label}>
                <td>
                  {row.label} <LabelBadge badge={row.badge} />
                </td>
                <td>{setting}</td>
                <td className={`amount ${tone(row.currentBudgetGbpm)}`}>
                  {betterOrWorse(row.currentBudgetGbpm)}
                </td>
                <td className={`amount ${tone(row.psnbGbpm)}`}>{betterOrWorse(row.psnbGbpm)}</td>
              </tr>
            );
          })}
          {interest ? (
            <tr>
              <td>
                {interest.label} <LabelBadge badge={interest.badge} />
              </td>
              <td />
              <td className={`amount ${tone(interest.currentBudgetGbpm)}`}>
                {betterOrWorse(interest.currentBudgetGbpm)}
              </td>
              <td className={`amount ${tone(interest.psnbGbpm)}`}>
                {betterOrWorse(interest.psnbGbpm)}
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            <td />
            <td className={`amount ${tone(totalCurrent)}`}>{betterOrWorse(totalCurrent)}</td>
            <td className={`amount ${tone(totalBorrowing)}`}>{betterOrWorse(totalBorrowing)}</td>
          </tr>
        </tfoot>
      </table>
    </TableScroll>
  );
}
