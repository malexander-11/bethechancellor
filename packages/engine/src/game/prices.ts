import { fyStart } from '../calc/years.js';
import type { Badge, Lever, OptionsFile, PmFile } from '../types/data.js';
import type { LeverEffect, Outcome } from '../types/engine.js';

/**
 * One price per choice (Phase 25, R4). Every screen that prices a flagship, the card, the review,
 * the speech and the close, reads the same figure: the change the choice makes to the headroom
 * the bar shows in the target year, debt interest included, so "costs £0.8bn · leaves £6.0bn"
 * adds up. It is the engine re-run with and without the choice: arithmetic on official figures,
 * badged Worked out, with no judgement in it.
 */

/** The engine re-run for a set of lever values, under the Budget's own settings. */
export type OutcomeOf = (values: Record<string, number>) => Outcome;

/**
 * The rule a price is read against. Investment on its own does not touch the day-to-day rule
 * except through interest, so a move made only of investment is priced on the debt rule, which it
 * does touch; everything else on the day-to-day rule, which is the bar's figure.
 */
export type PricedRule = 'currentBudget' | 'stockFalling';

export interface Price {
  /** The change to the rule's headroom in the target year, £ million: negative costs, positive adds. */
  headroomChangeGbpm: number;
  /** The rule's headroom with the move made, £ million. */
  headroomGbpm: number;
  rule: PricedRule;
  year: string;
  /**
   * The move in the target year, split, £ million, each positive when it costs: day-to-day spending
   * less receipts, investment, and the interest on the borrowing it adds.
   */
  split: { currentGbpm: number; capitalGbpm: number; interestGbpm: number };
  /**
   * Set when an earlier year costs more than half as much again as the target year: a front-loaded
   * move, whose target-year price would understate it (defence at 3% now). Before interest.
   */
  earlier?: { year: string; costGbpm: number };
  /** Set when nothing moves in the target year and a later year does (ADR-0021). */
  laterStart?: string;
  /** What the move costs in that later year, before interest, £ million; negative saves. */
  laterCostGbpm?: number;
}

/** Below this a move reads as changing nothing, as the cards' own effect words do. */
export const PRICE_UNCHANGED_BELOW_GBPM = 50;

/** How much an earlier year must exceed the target year before a price says so. */
const FRONT_LOADED = 1.5;

function headroomOn(outcome: Outcome, rule: PricedRule): number {
  return outcome.verdicts.find((v) => v.kind === rule)?.headroomGbpm ?? 0;
}

function targetYearOf(outcome: Outcome): string {
  return (
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
    outcome.paths.policyYears[outcome.paths.policyYears.length - 1] ??
    ''
  );
}

/** The levers whose value differs between two sets, defaults filled in. */
function movedCodes(
  from: Record<string, number>,
  to: Record<string, number>,
  levers: readonly Lever[],
): string[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const codes = new Set([...Object.keys(from), ...Object.keys(to)]);
  return [...codes].filter((code) => {
    const lever = byCode.get(code);
    const fallback = lever?.control.default ?? 0;
    return (from[code] ?? fallback) !== (to[code] ?? fallback);
  });
}

/** What a set of levers does in one year of an outcome, £ million, positive when it costs. */
function costIn(effects: readonly LeverEffect[], codes: ReadonlySet<string>, year: string) {
  let current = 0;
  let capital = 0;
  for (const e of effects) {
    if (!codes.has(e.code)) continue;
    current += (e.currentSpending[year] ?? 0) - (e.receipts[year] ?? 0);
    capital += e.capitalSpending[year] ?? 0;
  }
  return { current, capital };
}

/**
 * The price of moving the Budget from one set of lever values to another: what the move does to
 * the headroom the bar shows, interest included. Choosing an option is a move from the Budget as
 * it stands to the Budget with it; what a chosen option is doing is the move from the Budget
 * without it to the Budget as it stands; a swap puts the option it replaces back in the same move.
 */
export function priceMove(input: {
  outcomeOf: OutcomeOf;
  levers: readonly Lever[];
  from: Record<string, number>;
  to: Record<string, number>;
}): Price {
  const { outcomeOf, levers, from, to } = input;
  const before = outcomeOf(from);
  const after = outcomeOf(to);
  const year = targetYearOf(after);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const codes = movedCodes(from, to, levers).filter(
    (code) => byCode.get(code)?.category !== 'macro',
  );
  const own = new Set(codes);
  const capitalOnly =
    codes.length > 0 &&
    codes.every((code) => byCode.get(code)?.classification?.currentOrCapital === 'capital');
  const rule: PricedRule = capitalOnly ? 'stockFalling' : 'currentBudget';
  const change = headroomOn(after, rule) - headroomOn(before, rule);

  const moveIn = (y: string) => {
    const a = costIn(after.leverEffects, own, y);
    const b = costIn(before.leverEffects, own, y);
    return { current: a.current - b.current, capital: a.capital - b.capital };
  };
  const target = moveIn(year);
  const interest =
    (after.paths.deltas.debtInterest[year] ?? 0) - (before.paths.deltas.debtInterest[year] ?? 0);
  const price: Price = {
    headroomChangeGbpm: change,
    headroomGbpm: headroomOn(after, rule),
    rule,
    year,
    split: { currentGbpm: target.current, capitalGbpm: target.capital, interestGbpm: interest },
  };

  // Front-loaded: the dearest year before the target, when it is well above the target year.
  const years = after.paths.policyYears;
  const targetCost = target.current + target.capital;
  let peak: { year: string; costGbpm: number } | undefined;
  for (const y of years) {
    if (fyStart(y) >= fyStart(year)) continue;
    const m = moveIn(y);
    const cost = m.current + m.capital;
    if (!peak || cost > peak.costGbpm) peak = { year: y, costGbpm: cost };
  }
  if (
    peak &&
    peak.costGbpm >= PRICE_UNCHANGED_BELOW_GBPM &&
    peak.costGbpm > FRONT_LOADED * Math.max(targetCost, 0)
  ) {
    price.earlier = peak;
  }

  // Nothing in the target year: the first later year that moves (ADR-0021).
  if (Math.abs(change) < PRICE_UNCHANGED_BELOW_GBPM) {
    const costThen = (y: string) => {
      const m = moveIn(y);
      return m.current + (capitalOnly ? m.capital : 0);
    };
    const later = years.find(
      (y) => fyStart(y) > fyStart(year) && Math.abs(costThen(y)) >= PRICE_UNCHANGED_BELOW_GBPM,
    );
    if (later) {
      price.laterStart = later;
      price.laterCostGbpm = costThen(later);
    }
  }
  return price;
}

/** The lever values with every one of these levers put back to its default. */
export function withDefaults(
  values: Record<string, number>,
  codes: readonly string[],
  levers: readonly Lever[],
): Record<string, number> {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const out = { ...values };
  for (const code of codes) {
    const lever = byCode.get(code);
    if (lever) out[code] = lever.control.default;
  }
  return out;
}

/**
 * An option's one price. Off (or trimmed, or moved the other way): what choosing it now would do,
 * with any option it replaces put back in the same move. On: what it is doing, the Budget as it
 * stands against the Budget without it. The option's levers are all the price counts; everything
 * else in the Budget stays where it is.
 */
export function optionPrice(input: {
  outcomeOf: OutcomeOf;
  levers: readonly Lever[];
  current: Record<string, number>;
  values: Record<string, number>;
  on?: boolean;
  /** Where the option's levers go when it is taken out: their defaults, unless said. */
  back?: Record<string, number>;
  /** An option this one replaces, put back to its defaults in the same move (a swap). */
  swapOut?: Record<string, number>;
}): Price {
  const { outcomeOf, levers, current, values } = input;
  if (input.on) {
    const back = input.back ?? withDefaults({}, Object.keys(values), levers);
    return priceMove({ outcomeOf, levers, from: { ...current, ...back }, to: current });
  }
  return priceMove({
    outcomeOf,
    levers,
    from: current,
    to: { ...current, ...(input.swapOut ?? {}), ...values },
  });
}

/** The Budget before any measure: today's estimate, the macro settings alone (Phase 25). */
export function preBudgetValues(
  values: Record<string, number>,
  levers: readonly Lever[],
): Record<string, number> {
  const macro = new Set(levers.filter((l) => l.category === 'macro').map((l) => l.code));
  return Object.fromEntries(Object.entries(values).filter(([code]) => macro.has(code)));
}

export function preBudget(
  outcomeOf: OutcomeOf,
  values: Record<string, number>,
  levers: readonly Lever[],
): Outcome {
  return outcomeOf(preBudgetValues(values, levers));
}

/**
 * How the bar's headroom got from the estimate to where it stands, in the target year: what the
 * taxes raise, what day-to-day spending adds net, and what the interest on the change in borrowing
 * adds. Investment is not in it: it counts against the debt rule, not this one. The four parts sum
 * to the bar exactly, because each is the engine's own figure: start + taxes − spending − interest.
 */
export interface Reconciliation {
  year: string;
  startGbpm: number;
  /** Receipts the measures raise, £ million (negative: net tax cuts). */
  taxesGbpm: number;
  /** Day-to-day spending the measures add, net, £ million (negative: net savings). */
  spendingGbpm: number;
  /** Debt interest the measures add through borrowing, £ million (negative: interest saved). */
  interestGbpm: number;
  endGbpm: number;
  /**
   * The tax take's change in points of GDP in the same year, from before the Budget (Phase 25): the
   * markets' reading, said on the review when it rises by more than half a point.
   */
  taxTakeChangePp: number;
}

export function reconcile(outcome: Outcome, pre: Outcome): Reconciliation {
  const year = targetYearOf(outcome);
  let taxes = 0;
  let spending = 0;
  for (const e of outcome.leverEffects) {
    if (e.category === 'macro') continue;
    taxes += e.receipts[year] ?? 0;
    spending += e.currentSpending[year] ?? 0;
  }
  const interest =
    (outcome.paths.deltas.debtInterest[year] ?? 0) - (pre.paths.deltas.debtInterest[year] ?? 0);
  const share = (o: Outcome) =>
    ((o.paths.policy.receipts[year] ?? 0) / (o.paths.policy.nominalGdpFy[year] ?? 1)) * 100;
  return {
    year,
    startGbpm: headroomOn(pre, 'currentBudget'),
    taxesGbpm: taxes,
    spendingGbpm: spending,
    interestGbpm: interest,
    endGbpm: headroomOn(outcome, 'currentBudget'),
    taxTakeChangePp: share(outcome) - share(pre),
  };
}

/**
 * How the headroom got from the OBR's March forecast to today's estimate (Phase 28, ADR-0030): the
 * forecast's own margin on the day-to-day rule, then what each economic setting of the estimate
 * does to it in the target year. `pre` is the Budget before any measure (today's estimate: the
 * macro settings alone), so the steps are the rows the engine attributes to those settings, signed
 * as changes to the headroom, and the forecast and the steps come to the estimate exactly. Each
 * step keeps the badge its row wears: the settings are an assumption, the OBR's sensitivities
 * turn them into money.
 */
export interface FromForecast {
  year: string;
  /** The March forecast's headroom, £ million: the vintage's own figure, with nothing moved. */
  forecastGbpm: number;
  /** What each economic setting does to the headroom, £ million: negative takes it away. */
  steps: { code: string; headroomGbpm: number; badge: Badge }[];
  /** Today's estimate of the headroom, £ million. */
  estimateGbpm: number;
}

export function fromForecast(pre: Outcome): FromForecast {
  const verdict = pre.verdicts.find((v) => v.kind === 'currentBudget');
  const steps = pre.attribution.flatMap((row) =>
    row.kind === 'macro' && row.code
      ? [{ code: row.code, headroomGbpm: -row.currentBudgetGbpm, badge: row.badge }]
      : [],
  );
  return {
    year: targetYearOf(pre),
    forecastGbpm: verdict?.baseline.headroomGbpm ?? 0,
    steps,
    estimateGbpm: verdict?.headroomGbpm ?? 0,
  };
}

export interface PriorityScale {
  year: string;
  /**
   * The cheapest way to deliver each priority in full, on the day-to-day rule, against the Budget
   * as it stands: the smallest and largest of those across the priorities, £ million. Null when
   * no priority costs anything to deliver.
   */
  costs: { minGbpm: number; maxGbpm: number } | null;
  /** The priorities whose every way to deliver in full saves money on the day-to-day rule. */
  saves: string[];
}

/**
 * The scale of the priorities, before any is chosen (Phase 25, R21, Worked out): what the cheapest
 * way to deliver each one in full would do to the headroom the bar shows, one price per option as
 * everywhere else. A priority whose full ways all save money is said to save it. Investment on its
 * own is priced on the debt rule, so it does not enter a range read against the day-to-day rule.
 */
export function priorityScale(input: {
  pm: PmFile;
  options: OptionsFile;
  levers: readonly Lever[];
  outcomeOf: OutcomeOf;
  current: Record<string, number>;
}): PriorityScale {
  const { pm, options, levers, outcomeOf, current } = input;
  let year = '';
  const cheapest: number[] = [];
  const saves: string[] = [];
  for (const priority of pm.priorities) {
    const prices = options.deliver
      .filter((o) => o.priority === priority.id && o.scale.kind === 'full')
      .map((o) => optionPrice({ outcomeOf, levers, current, values: o.values }))
      .filter((p) => p.rule === 'currentBudget');
    if (prices.length === 0) continue;
    year = prices[0]?.year ?? year;
    const costs = prices.map((p) => -p.headroomChangeGbpm);
    if (costs.every((c) => c < 0)) saves.push(priority.id);
    const least = Math.min(...costs.filter((c) => c > 0));
    if (Number.isFinite(least)) cheapest.push(least);
  }
  return {
    year,
    costs:
      cheapest.length > 0
        ? { minGbpm: Math.min(...cheapest), maxGbpm: Math.max(...cheapest) }
        : null,
    saves,
  };
}
