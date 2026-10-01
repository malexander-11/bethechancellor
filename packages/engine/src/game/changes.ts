import { formatGbpBn } from '../format.js';
import { leverStanding } from '../levels.js';
import type { Lever } from '../types/data.js';
import type { LeverEffect, Outcome } from '../types/engine.js';
import { targetYearOf } from './prices.js';

/**
 * A moved lever read back (the review, the shared picture): its plain name, where it now stands,
 * and what it does in the target year, on the lever's own figure.
 */
export interface ChangeRow {
  code: string;
  side: 'tax' | 'spending';
  name: string;
  /** "21%", "5% more"; none for a tick box. */
  standing?: string;
  /**
   * "raises £8.6bn", "costs £5.2bn", "saves £2.1bn", "adds £13.4bn of investment"; for a measure
   * that does nothing by the target year, when it starts: "nothing until 2030-31, then raises
   * £7.8bn".
   */
  words: string;
  tone: 'better' | 'worse';
  /**
   * What the words say it does, £ million: receipts for a tax, day-to-day and investment spending
   * together for the rest, in the target year or the year it starts. Its size orders a list.
   */
  gbpm: number;
  /** The year a measure that does nothing by the target year starts (Phase 17). */
  fromYear?: string;
}

export interface ChangeRowsInput {
  outcome: Outcome;
  levers: readonly Lever[];
  /** The name a lever goes by where it has one (the fine-tuning screens'); else its short title. */
  names?: (code: string) => string | undefined;
  /** Levers read back somewhere else: a flagship's, under its own name. */
  exclude?: ReadonlySet<string>;
}

/**
 * What a tax raises or costs, and what spending costs or saves, in the year. Investment is said as
 * investment: it counts against the debt rule, not the headroom.
 */
function amountOf(
  lever: Lever,
  effect: LeverEffect,
  year: string,
): Pick<ChangeRow, 'words' | 'tone' | 'gbpm'> {
  if (lever.category === 'tax') {
    const gbpm = effect.receipts[year] ?? 0;
    return gbpm >= 0
      ? { words: `raises ${formatGbpBn(gbpm, 1)}`, tone: 'better', gbpm }
      : { words: `costs ${formatGbpBn(-gbpm, 1)}`, tone: 'worse', gbpm };
  }
  const current = effect.currentSpending[year] ?? 0;
  const capital = effect.capitalSpending[year] ?? 0;
  const gbpm = current + capital;
  if (current === 0 && capital !== 0) {
    return capital > 0
      ? { words: `adds ${formatGbpBn(capital, 1)} of investment`, tone: 'worse', gbpm }
      : { words: `cuts ${formatGbpBn(-capital, 1)} of investment`, tone: 'better', gbpm };
  }
  return gbpm > 0
    ? { words: `costs ${formatGbpBn(gbpm, 1)}`, tone: 'worse', gbpm }
    : { words: `saves ${formatGbpBn(-gbpm, 1)}`, tone: 'better', gbpm };
}

/**
 * Every lever the Budget moved, the economy's aside, in the data's order: taxes on one side,
 * spending and benefits on the other.
 */
export function changeRows({ outcome, levers, names, exclude }: ChangeRowsInput): ChangeRow[] {
  const year = targetYearOf(outcome);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const startsLater = new Map(
    outcome.attribution.flatMap((a) => (a.code && a.fromYear ? [[a.code, a.fromYear]] : [])),
  );
  const values = outcome.settings.leverValues;
  return outcome.leverEffects.flatMap((effect) => {
    const lever = byCode.get(effect.code);
    if (!lever || lever.category === 'macro' || exclude?.has(lever.code)) return [];
    const standing = leverStanding(lever, values[lever.code] ?? lever.control.default);
    const fromYear = startsLater.get(lever.code);
    const amount = amountOf(lever, effect, fromYear ?? year);
    return [
      {
        code: lever.code,
        side: lever.category === 'tax' ? 'tax' : 'spending',
        name: names?.(lever.code) ?? lever.shortTitle,
        ...(standing ? { standing } : {}),
        ...amount,
        ...(fromYear ? { words: `nothing until ${fromYear}, then ${amount.words}`, fromYear } : {}),
      },
    ];
  });
}
