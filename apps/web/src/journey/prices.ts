import {
  formatGbpBn,
  fyStart,
  optionPrice,
  policyYearsOf,
  type Lever,
  type LeverEffect,
  type Outcome,
  type Price,
} from '@btc/engine';
import { useDeferredValue, useMemo } from 'react';
import { levers, vintage } from '../data';
import { useBudget } from '../state/budget';
import {
  UNCHANGED_BELOW_GBPM,
  borrowingImprovement,
  currentBudgetImprovement,
  effectWords,
} from './effects';
import { headroomOfOutcome, useOutcomeOf } from './outcome';

const POLICY_YEARS = policyYearsOf(vintage);
const byCode = new Map(levers.map((l) => [l.code, l] as const));

/**
 * A flagship's one price (Phase 25, R4), in words a card can carry: the change the choice makes
 * to the headroom, interest included, and the headroom that leaves. The same figure is on the card
 * and the review.
 */
export interface OptionPrice {
  /** "Costs £0.8bn", "Saves £6.4bn", "Raises £9.7bn", "Nothing until 2030-31, then saves £1.4bn". */
  text: string;
  tone: 'better' | 'worse' | 'neutral';
  /** The change to the headroom, £ million: negative costs. */
  changeGbpm: number;
  /** The headroom with the option in: after choosing it, or, when it is in, as it stands. */
  headroomGbpm: number;
  /** Off: what choosing it leaves. On: it is in your Budget, and the figure is what it does. */
  standing: 'leaves' | 'inBudget';
  /** The debt rule, for investment alone (it does not touch the day-to-day rule but by interest). */
  rule: Price['rule'];
  /** The year every figure is for. */
  year: string;
  /** Day-to-day, investment and interest, for the card's fold. */
  split: Price['split'];
  /** The dearest earlier year, when it is well above the target year. */
  earlier?: Price['earlier'];
  laterStart?: string;
}

function toneOf(change: number): OptionPrice['tone'] {
  if (change >= UNCHANGED_BELOW_GBPM) return 'better';
  if (change <= -UNCHANGED_BELOW_GBPM) return 'worse';
  return 'neutral';
}

function capitalise(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The verb for a change to the headroom: a tax raises, spending saves, anything else costs. */
function verbFor(change: number, receipts: boolean): string {
  const size = formatGbpBn(Math.abs(change), 1);
  if (change > 0) return `${receipts ? 'raises' : 'saves'} ${size}`;
  return `costs ${size}`;
}

/** The engine's price read into a card's words. */
export function priceWords(price: Price, codes: readonly string[], on: boolean): OptionPrice {
  const receipts = codes.every((code) => byCode.get(code)?.classification?.side === 'receipts');
  const change = price.headroomChangeGbpm;
  let text: string;
  if (Math.abs(change) >= UNCHANGED_BELOW_GBPM) {
    text = capitalise(verbFor(change, receipts));
    if (price.earlier) text += ', more in earlier years';
  } else if (price.laterStart && price.laterCostGbpm !== undefined) {
    text = `Nothing until ${price.laterStart}, then ${verbFor(-price.laterCostGbpm, receipts)}`;
  } else {
    text = 'Changes nothing';
  }
  const later = price.laterStart && Math.abs(change) < UNCHANGED_BELOW_GBPM;
  return {
    text,
    tone: later ? toneOf(-(price.laterCostGbpm ?? 0)) : toneOf(change),
    changeGbpm: change,
    headroomGbpm: price.headroomGbpm,
    standing: on ? 'inBudget' : 'leaves',
    rule: price.rule,
    year: price.year,
    split: price.split,
    ...(price.earlier ? { earlier: price.earlier } : {}),
    ...(price.laterStart ? { laterStart: price.laterStart } : {}),
  };
}

/**
 * The price of a flagship against the Budget as it stands (ADR-0022, revised in Phase 25): the
 * engine's one price, `optionPrice`. Off, trimmed or moved the other way, a card says what choosing
 * it now would do and the headroom that would leave; with `swapOut`, the option it replaces goes
 * back in the same move. On, what it is doing, and that it is in your Budget.
 */
export function useOptionPrices(): (
  bundle: {
    values: Record<string, number>;
    back?: Record<string, number>;
    swapOut?: Record<string, number>;
  },
  on?: boolean,
) => OptionPrice {
  const { state } = useBudget();
  const outcomeOf = useOutcomeOf();
  const current = state.leverValues;
  return useMemo(
    () =>
      (bundle, on = false) =>
        priceWords(
          optionPrice({
            outcomeOf,
            levers,
            current,
            values: bundle.values,
            on,
            ...(bundle.back ? { back: bundle.back } : {}),
            ...(bundle.swapOut ? { swapOut: bundle.swapOut } : {}),
          }),
          Object.keys(bundle.values),
          on,
        ),
    [outcomeOf, current],
  );
}

/** What a lever's move would do, in the lever's own official figure, and the headroom after. */
export interface LeverHint {
  /** "Raises £8.6bn", "Saves £1.0bn", "Borrowing up £13.4bn; it counts against the debt rule". */
  text: string;
  tone: 'better' | 'worse' | 'neutral';
  /** The headroom the Budget would then have: the bar's next reading, interest included. */
  headroomGbpm: number;
  year: string;
}

/**
 * A move read into one line: what its levers do in the Budget with the move made, less what they
 * do in the Budget without it, on the lever's own figures (Official where the lever is). The
 * headroom moves by that and the interest on the borrowing it changes, which the screen says once
 * (Phase 25). Investment is read against borrowing; everything else against the current budget. A
 * move that does nothing in the summary year names the first later year in which it does
 * (ADR-0021).
 */
export function describeMove(
  withIt: Outcome,
  withoutIt: Outcome,
  codes: readonly string[],
  year: string,
  allLevers: readonly Lever[],
  policyYears: readonly string[] = POLICY_YEARS,
): { text: string; tone: LeverHint['tone']; improvementGbpm: number; laterStart?: string } {
  const leverOf = new Map(allLevers.map((l) => [l.code, l] as const));
  const own = (o: Outcome) => o.leverEffects.filter((e) => codes.includes(e.code));
  const capital = codes.every(
    (code) => leverOf.get(code)?.classification?.currentOrCapital === 'capital',
  );
  const receipts = codes.every((code) => leverOf.get(code)?.classification?.side === 'receipts');
  const sum = (effects: readonly LeverEffect[], y: string) =>
    effects.reduce(
      (acc, e) => acc + (capital ? borrowingImprovement(e, y) : currentBudgetImprovement(e, y)),
      0,
    );
  const before = own(withoutIt);
  const after = own(withIt);
  const improve = (y: string) => sum(after, y) - sum(before, y);
  const now = improve(year);
  if (capital) {
    return {
      text: `Borrowing ${effectWords(now, true, false)}; it counts against the debt rule`,
      tone: toneOf(now),
      improvementGbpm: now,
    };
  }
  const words = effectWords(now, false, receipts);
  if (words !== 'unchanged') {
    return { text: capitalise(words), tone: toneOf(now), improvementGbpm: now };
  }
  const later = policyYears.find(
    (y) => fyStart(y) > fyStart(year) && Math.abs(improve(y)) >= UNCHANGED_BELOW_GBPM,
  );
  if (later) {
    const then = improve(later);
    return {
      text: `Nothing until ${later}, then ${effectWords(then, false, receipts)}`,
      tone: toneOf(then),
      improvementGbpm: now,
      laterStart: later,
    };
  }
  return { text: 'Changes nothing', tone: 'neutral', improvementGbpm: now };
}

/**
 * The fine-tuning cards' hint while a lever rests (Phase 24, revised in Phase 25): what the
 * adviser's usual move would do, in the lever's own figure, and the headroom that would leave.
 * With `swapOut`, a lever that counts the same money goes back in the same move.
 */
export function useLeverHints(): (
  values: Record<string, number>,
  swapOut?: Record<string, number>,
) => LeverHint {
  const { state, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const year =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    POLICY_YEARS[POLICY_YEARS.length - 1] ??
    '';
  // Priced from a deferred copy of the Budget (Phase 26): a chosen size answers at once, and the
  // resting hints, one engine run each, catch up a moment later.
  const current = useDeferredValue(state.leverValues);
  return useMemo(() => {
    const live = outcomeOf(current);
    return (values, swapOut) => {
      const withIt = outcomeOf({ ...current, ...(swapOut ?? {}), ...values });
      // A swap is read as one move: what the lever brings in less what the one it replaces took.
      const codes = [...Object.keys(values), ...Object.keys(swapOut ?? {})];
      const move = describeMove(withIt, live, codes, year, levers);
      return {
        text: move.text,
        tone: move.tone,
        headroomGbpm: headroomOfOutcome(withIt),
        year,
      };
    };
  }, [outcomeOf, current, year]);
}
