import { fyStart, policyYearsOf, type Lever, type LeverEffect, type Outcome } from '@btc/engine';
import { useMemo } from 'react';
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

/** What choosing an option now would do, in words a card can carry, and the headroom it would leave. */
export interface OptionPrice {
  /** "Raises £9.9bn", "Costs £2.2bn", "Nothing until 2030-31, then raises £18.5bn". No year: the screen says it once. */
  text: string;
  tone: 'better' | 'worse' | 'neutral';
  /** The move's effect on the current budget (or on borrowing, for investment) in the summary year, £ million. */
  improvementGbpm: number;
  /** Set when nothing moves in the summary year and a later policy year does (ADR-0021). */
  laterStart?: string;
  /** The headroom the Budget would have: with the option, when it is off; without it, when it is on. */
  headroomGbpm: number;
  standing: 'leaves' | 'without';
  /** The year every figure is for. */
  year: string;
}

function toneOf(improvement: number): OptionPrice['tone'] {
  if (improvement >= UNCHANGED_BELOW_GBPM) return 'better';
  if (improvement <= -UNCHANGED_BELOW_GBPM) return 'worse';
  return 'neutral';
}

function capitalise(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * An option's move read into one line: what its levers do in the Budget with the move made, less
 * what they do in the Budget without it. For an option not yet chosen that is the option's own
 * figure; for one adjusted on the desk it is the rest of the way; for one already on it is what
 * putting it back would undo. Investment is read against borrowing, because it sits outside the
 * stability rule; everything else against the current budget. A move that does nothing in the
 * summary year names the first later year in which it does (ADR-0021).
 */
export function describeMove(
  withIt: Outcome,
  withoutIt: Outcome,
  codes: readonly string[],
  year: string,
  allLevers: readonly Lever[],
  policyYears: readonly string[] = POLICY_YEARS,
): Omit<OptionPrice, 'headroomGbpm' | 'standing' | 'year'> {
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
      text: `Borrowing ${effectWords(now, true, false)}; the current budget is unchanged`,
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
 * The price of an option against the Budget as it stands (ADR-0022, revised): the engine re-run
 * with the option's move made on top of everything else chosen, under the game's own conditions.
 * Off or adjusted, a card says what choosing it now would do and the headroom that would leave;
 * on, what it is doing and the headroom the Budget would have without it. A card's figure
 * therefore moves with the rest of the package, and its "leaves" is the strip's next reading.
 */
export function useOptionPrices(): (
  bundle: { values: Record<string, number>; back?: Record<string, number> },
  on?: boolean,
) => OptionPrice {
  const { state, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const year =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    POLICY_YEARS[POLICY_YEARS.length - 1] ??
    '';
  const current = state.leverValues;
  return useMemo(() => {
    const live = outcomeOf(current);
    return (bundle, on = false) => {
      const codes = Object.keys(bundle.values);
      if (on) {
        const back =
          bundle.back ??
          Object.fromEntries(codes.map((code) => [code, byCode.get(code)?.control.default ?? 0]));
        const withoutIt = outcomeOf({ ...current, ...back });
        return {
          ...describeMove(live, withoutIt, codes, year, levers),
          headroomGbpm: headroomOfOutcome(withoutIt),
          standing: 'without',
          year,
        };
      }
      const withIt = outcomeOf({ ...current, ...bundle.values });
      return {
        ...describeMove(withIt, live, codes, year, levers),
        headroomGbpm: headroomOfOutcome(withIt),
        standing: 'leaves',
        year,
      };
    };
  }, [outcomeOf, current, year]);
}
