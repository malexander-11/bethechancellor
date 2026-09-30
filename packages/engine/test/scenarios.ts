import {
  freshGame,
  suggestedSettings,
  type ContextFile,
  type Dataset,
  type GamePermalink,
} from '../src/index.js';

/**
 * The Budgets the engine tests play, each named for the part it plays and documented with it, and
 * the settings every game is played in. A test that needs "a Budget that breaks the tax lock" or
 * "the review's walk" takes it from here, so when a lever is retired, or a change to the data stops
 * a Budget playing its part, the Budget is mended once, here. scenarios.test.ts checks that each
 * still plays its part, and says which one stopped.
 *
 * A test about one lever in particular (which promise it breaks, which household hears it) names
 * that lever itself: the lever is the point of the test, not a stand-in for a part.
 */

/** Lever settings by code: a Budget, or the part of one a test adds to another. */
export type Budget = Readonly<Record<string, number>>;

/* ------------------------------------------------------------------------------ the priorities */

/** The review's two priorities (Phase 25, R3): defence, then safer streets. */
export const SECURITY: readonly string[] = ['defence', 'safer-streets'];

/** A fresh game with these priorities ranked with the Prime Minister, in this order. */
export function gameWith(priorities: readonly string[] = []): GamePermalink {
  return { ...freshGame(), priorities: [...priorities] };
}

/* ------------------------------------------------------------------------ the review's Budgets */

/**
 * The review's walk (Phase 25, R3): both security flagships, two points on employer National
 * Insurance, a penny on the basic rate and a half-point trim to health. With SECURITY ranked it
 * delivers both priorities inside the rules, and breaks the tax lock with room to spare.
 */
export const WALK: Budget = { dip47: 1, moj: 10, nicer: 2, itbr: 1, dhsc: -0.5 };

/**
 * The walk paid for by employer National Insurance alone: both priorities delivered and paid for,
 * the tax lock strained in its spirit, not broken in its words.
 */
export const NICS_WALK: Budget = { dip47: 1, moj: 10, nicer: 2, dhsc: -0.5 };

/* ----------------------------------------------------------------------------- the flagships */

/** Defence's flagship: the defence plan's gap, funded. */
export const DEFENCE_GAP: Budget = { dip47: 1 };

/**
 * Safer streets' flagship: more money for prisons and courts. Paid for out of the headroom, it
 * leaves a thin margin on today's estimate; with SECURITY ranked, it leaves defence unfunded.
 */
export const PRISONS: Budget = { moj: 10 };

/** Both security flagships, with nothing to pay for them: SECURITY delivered. */
export const SECURITY_FLAGSHIPS: Budget = { ...DEFENCE_GAP, ...PRISONS };

/** The NHS flagship: health above its plan. */
export const HEALTH_ABOVE_PLAN: Budget = { dhsc: 3 };

/** A down-payment on council grants: it makes a start on the NHS and never delivers it. */
export const NHS_START: Budget = { mhclg: 5 };

/* ------------------------------------------------------------------------------------ taxes */

/**
 * A penny on the basic rate: breaks the tax lock, a manifesto red line. The broadest rise there
 * is, asked of everyone who earns, on HMRC's certified row, and raised from the first year.
 */
export const PENNY: Budget = { itbr: 1 };

/**
 * A point on employer National Insurance: strains the tax lock, its words kept and its spirit
 * tested, and breaks nothing.
 */
export const EMPLOYER_NICS: Budget = { nicer: 1 };

/**
 * A big broad tax rise: two points on employer National Insurance, on HMRC's certified row, felt
 * through pay and prices. It strains the tax lock, breaks nothing, and leaves more headroom than
 * the March forecast did.
 */
export const BIG_BROAD_TAX_RISE: Budget = { nicer: 2 };

/**
 * Health above its plan, paid for by the penny: without the penny the day-to-day rule is missed,
 * so breaking the tax lock is the price of the programme, not a buffer.
 */
export const NEEDED_LOCK_BREAK: Budget = { ...HEALTH_ABOVE_PLAN, ...PENNY };

/** Pension relief at the basic rate only: higher earners pay more, and no promise is broken. */
export const HIGHER_EARNERS_PAY: Budget = { pens20: 1 };

/** The 50% rate and a wealth tax: more asked of the best-off than of anyone else. */
export const TAXES_AT_THE_TOP: Budget = { it50: 1, wealth: 1 };

/** A point on corporation tax: business pays more, and the manifesto's cap on it is broken. */
export const CORPORATION_TAX_RISE: Budget = { ct: 1 };

/** Taxes no promise names: the family-home allowance ended, the biggest homes charged more. */
export const UNPROMISED_TAXES: Budget = { rnrb: 1, ctgh: 1 };

/**
 * Thin headroom: safer streets' flagship, part-paid by ending the family-home allowance. Every
 * promise kept and the priority delivered, with a margin under ten billion.
 */
export const THIN_MARGIN: Budget = { ...PRISONS, rnrb: 1 };

/** Two pence off the basic rate: a tax cut for everyone who earns, borrowed past the rules. */
export const BASIC_RATE_CUT: Budget = { itbr: -2 };

/* --------------------------------------------------------------------- spending and welfare */

/** A 5% cut to health: the sums add up by giving less, not by taxing more. */
export const HEALTH_CUT: Budget = { dhsc: -5 };

/** The two-child limit reinstated: a Budget 2025 promise broken, a U-turn the party resists. */
export const TWO_CHILD_LIMIT: Budget = { rv2ch: 1 };

/** Investment the debt rule still allows: borrowing to invest, inside the rules. */
export const INVESTMENT_WITHIN_RULES: Budget = { cdel: 5 };

/** Investment alone, and more of it: all capital, so priced against the debt rule it moves. */
export const INVESTMENT: Budget = { cdel: 10 };

/** Investment past the debt rule: the debt rule missed, the day-to-day rule still met. */
export const DEBT_RULE_MISSED: Budget = { cdel: 20 };

/** Defence at 5% of GDP, kept for the record: the day-to-day rule missed by far. */
export const DAY_TO_DAY_RULE_MISSED: Budget = { def5: 1 };

/** Defence at 3% of GDP now: dearer in an earlier year than in the target year. */
export const FRONT_LOADED: Budget = { def3: 1 };

/** Everything expensive at once, the shelved programmes included: the day-to-day rule missed. */
export const EVERYTHING_EXPENSIVE: Budget = { def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 };

/**
 * Moves a player can make on the way through, one to five of which make a sampled Budget for the
 * audiences' property tests: taxes up and down, felt and unfelt, top and broad; services, welfare
 * and investment both ways; the flagships. The seeded sample of 300 Budgets is drawn from these,
 * in this order, so changing the list draws a new sample: reception.sample.test.ts says whether
 * it still reaches every rating.
 */
export const MOVES: readonly Budget[] = [
  { itbr: 1 },
  { itbr: -2 },
  { ithr: 2 },
  { vats: 1 },
  { nicer: 1 },
  { nicer: 2 },
  // Four taxes at the top that most households never feel.
  { qelevy: 1, pslump: 1, banklevy: 1, epl2: 1 },
  { iht: 10 },
  { bank5: 1, banklevy: 1 },
  { fuel: -10 },
  { fuel: 10 },
  { ved: 20 },
  { dhsc: 3 },
  { dhsc: -5 },
  { dhsc: -10 },
  { dfe: 5 },
  { dfe: -5 },
  { mod: -5 },
  { home: -10 },
  { moj: 10 },
  { cdel: 10 },
  { cdel: -10 },
  { cdel: 20 },
  { def3: 1 },
  { dip47: 1 },
  { wuc: 5 },
  { wuc: -5 },
  { rvpip: 1 },
  { rv2ch: 1 },
  { csjmh: 1 },
  { lha30: 1 },
  { itpa: 1000 },
];

/* ---------------------------------------------------------------- where every game is played */

/** The latest file of what has changed since the forecast: today's readings and the desk. */
export function latestContext(ds: Pick<Dataset, 'contexts'>): ContextFile {
  const context = ds.contexts?.[ds.contexts.length - 1];
  if (!context) throw new Error('the data has no context file');
  return context;
}

/** Today's estimate (Phase 24): the economic settings every game is played on. */
export function todaysEstimate(ds: Pick<Dataset, 'contexts' | 'levers'>): Record<string, number> {
  return suggestedSettings(latestContext(ds).readings, ds.levers);
}

/**
 * The typical five-year forecast error in receipts, in £ million of the last forecast year, as
 * Budget day reads it: what the markets measure a margin against.
 */
export function typicalError(ds: Pick<Dataset, 'vintage'>): number {
  const last = ds.vintage.years.forecast[ds.vintage.years.forecast.length - 1] ?? '';
  return (
    (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (ds.vintage.economy.nominalGdpFy.values[last] ?? 0)
  );
}
