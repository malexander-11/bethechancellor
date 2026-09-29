import { formatGbpBn, type ContextFile, type Outcome } from '@btc/engine';
import { levers } from '../data';

type InTrayItem = ContextFile['inTray'][number];

/**
 * What the Budget inherits on the desk (Phase 25): a bill already promised, a cliff edge already
 * set. The review lists the ones a Budget leaves as it found them; the briefing listed them all
 * until it became plain copy (ADR-0031). `{cost}` is the dealing lever's own figure in the target
 * year, switched on against the Budget as it stands: the engine's, never typed.
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
