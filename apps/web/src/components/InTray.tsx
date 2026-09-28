import { formatGbpBn, type ContextFile, type Outcome } from '@btc/engine';
import { context, levers } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

type InTrayItem = ContextFile['inTray'][number];

/**
 * What the Budget inherits on the desk (Phase 25): a bill already promised, a cliff edge already
 * set. `{cost}` is the dealing lever's own figure in the target year, switched on against the
 * Budget as it stands: the engine's, never typed.
 */
export function inTrayText(
  item: InTrayItem,
  outcomeOf: (values: Record<string, number>) => Outcome,
  values: Record<string, number>,
): string {
  if (!item.text.includes('{cost}')) return item.text;
  const lever = levers.find((l) => l.code === item.leverCode);
  const on = lever?.control.max ?? 1;
  const trial = outcomeOf({ ...values, [item.leverCode]: on });
  const year = trial.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
  const effect = trial.leverEffects.find((e) => e.code === item.leverCode);
  const gbpm = effect
    ? (effect.receipts[year] ?? 0) -
      (effect.currentSpending[year] ?? 0) -
      (effect.capitalSpending[year] ?? 0)
    : 0;
  return item.text.replace('{cost}', formatGbpBn(Math.abs(gbpm), 1));
}

/** Whether the Budget as given leaves the item as it found it: its lever not moved. */
export function leftAsIs(item: InTrayItem, values: Record<string, number>): boolean {
  const lever = levers.find((l) => l.code === item.leverCode);
  return (values[item.leverCode] ?? lever?.control.default ?? 0) === (lever?.control.default ?? 0);
}

/**
 * "Already on your desk": the briefing lists every item; the review lists the ones the Budget left
 * as it found them, under "Still on your desk".
 */
export function InTray({
  values,
  onlyLeft = false,
  heading = 'Already on your desk',
}: {
  values: Record<string, number>;
  onlyLeft?: boolean;
  heading?: string;
}) {
  const outcomeOf = useOutcomeOf();
  const items = context.inTray.filter((item) => !onlyLeft || leftAsIs(item, values));
  if (items.length === 0) return null;
  return (
    <section className="tray doc" aria-labelledby="tray-heading">
      <h2 id="tray-heading" className="section-label">
        {heading}
      </h2>
      <ul className="tray__list">
        {items.map((item) => (
          <li key={item.id}>
            <LabelBadge badge={item.badge} /> {inTrayText(item, outcomeOf, values)}{' '}
            <SourceList as="span" className="briefing__sources" refs={item.sources} />
          </li>
        ))}
      </ul>
    </section>
  );
}
