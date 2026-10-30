import { fyStart, policyYearsOf, type Lever, type LeverEffect, type Outcome } from '@btc/engine';
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

/** What a lever's move would do, in the lever's own official figure, and the headroom after. */
export interface LeverHint {
  /** "Raises £8.6bn", "Saves £1.0bn", "Borrowing up £13.4bn; it counts against the debt rule". */
  text: string;
  tone: 'better' | 'worse' | 'neutral';
  /** The headroom the Budget would then have: the bar's next reading, interest included. */
  headroomGbpm: number;
  year: string;
}

function toneOf(change: number): LeverHint['tone'] {
  if (change >= UNCHANGED_BELOW_GBPM) return 'better';
  if (change <= -UNCHANGED_BELOW_GBPM) return 'worse';
  return 'neutral';
}

function capitalise(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
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
  // Over before the summary year (ADR-0045): the earlier year it moves most, and by how much.
  const earlier = policyYears
    .filter((y) => fyStart(y) < fyStart(year) && Math.abs(improve(y)) >= UNCHANGED_BELOW_GBPM)
    .sort((a, b) => Math.abs(improve(b)) - Math.abs(improve(a)))[0];
  if (earlier) {
    const then = improve(earlier);
    return {
      text: `Nothing in ${year}; ${effectWords(then, false, receipts)} in ${earlier}`,
      tone: toneOf(then),
      improvementGbpm: now,
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
