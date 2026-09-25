import { fyStart, policyYearsOf, type Lever, type LeverEffect } from '@btc/engine';
import { useMemo } from 'react';
import { context, levers, vintage } from '../data';
import { useBudget } from '../state/budget';
import {
  UNCHANGED_BELOW_GBPM,
  borrowingImprovement,
  currentBudgetImprovement,
  effectWords,
} from './effects';
import { useOutcomeOf } from './outcome';
import { macroCodesOf } from './scenarios';

const POLICY_YEARS = policyYearsOf(vintage);
const MACRO_CODES = macroCodesOf(context.readings);

/** What an option costs or raises, in words a card can carry, and which way it leans. */
export interface OptionPrice {
  /** "Raises £9.9bn in 2029-30", "Costs £2.2bn in 2029-30", "Nothing until 2030-31, then raises £18.5bn". */
  text: string;
  tone: 'better' | 'worse' | 'neutral';
  /** The effect on the current budget (or on borrowing, for investment) in the summary year, £ million. */
  improvementGbpm: number;
  /** Set when nothing moves in the summary year and a later policy year does (ADR-0021). */
  laterStart?: string;
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
 * A bundle's effect read into one line. Investment is read against borrowing, because it sits
 * outside the stability rule; everything else against the current budget. A bundle that moves
 * nothing in the summary year names the first later year in which it does, so a card whose
 * measure cannot start before then says so (ADR-0021).
 */
export function describeBundle(
  effects: readonly LeverEffect[],
  codes: readonly string[],
  year: string,
  allLevers: readonly Lever[],
  policyYears: readonly string[] = POLICY_YEARS,
): OptionPrice {
  const byCode = new Map(allLevers.map((l) => [l.code, l] as const));
  const own = effects.filter((e) => codes.includes(e.code));
  const capital = codes.every(
    (code) => byCode.get(code)?.classification?.currentOrCapital === 'capital',
  );
  const receipts = codes.every((code) => byCode.get(code)?.classification?.side === 'receipts');
  const improve = (y: string) =>
    own.reduce(
      (acc, e) => acc + (capital ? borrowingImprovement(e, y) : currentBudgetImprovement(e, y)),
      0,
    );
  const now = improve(year);
  if (capital) {
    return {
      text: `Borrowing ${effectWords(now, true, false)} in ${year}; the current budget is unchanged`,
      tone: toneOf(now),
      improvementGbpm: now,
    };
  }
  const words = effectWords(now, false, receipts);
  if (words !== 'unchanged') {
    return { text: `${capitalise(words)} in ${year}`, tone: toneOf(now), improvementGbpm: now };
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
  return { text: `Nothing in ${year}`, tone: 'neutral', improvementGbpm: now };
}

/**
 * The price of an option on its own: the engine re-run with that bundle and the economic
 * assumptions in force, and nothing else of the package. A card's figure therefore does not
 * depend on what else has been chosen, and two cards' figures do not add exactly to the strip's
 * move once interest feedback is on; the strip shows the real package.
 */
export function useOptionPrices(): (bundle: { values: Record<string, number> }) => OptionPrice {
  const { state, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const year =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    POLICY_YEARS[POLICY_YEARS.length - 1] ??
    '';
  const macro = useMemo(
    () =>
      Object.fromEntries(
        MACRO_CODES.filter((code) => state.leverValues[code] !== undefined).map((code) => [
          code,
          state.leverValues[code] ?? 0,
        ]),
      ),
    [state.leverValues],
  );
  return useMemo(() => {
    const cache = new Map<string, OptionPrice>();
    return (bundle: { values: Record<string, number> }) => {
      const key = JSON.stringify(
        Object.keys(bundle.values)
          .sort()
          .map((code) => [code, bundle.values[code]]),
      );
      const hit = cache.get(key);
      if (hit) return hit;
      const trial = outcomeOf({ ...macro, ...bundle.values });
      const price = describeBundle(trial.leverEffects, Object.keys(bundle.values), year, levers);
      cache.set(key, price);
      return price;
    };
  }, [outcomeOf, macro, year]);
}
