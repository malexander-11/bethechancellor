import type { Badge, DerivationStep } from './data.js';
import type { YearValues } from './data.js';

export type AssessAsOf = 'vintage' | 'nextBudget';

/** Player choices plus engine options. Lever values are keyed by lever code. */
export interface Settings {
  leverValues: Record<string, number>;
  implementationYear: string;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  /**
   * A later start for particular levers, by code. Every costing reads the implementation year, so
   * this is the one place a later start can live (Phase 8); it is also how a measure's earliest
   * start (ADR-0021) is kept, whatever start year the game uses.
   */
  implementationYearByCode?: Record<string, string>;
}

/**
 * The story of one playthrough, as the permalink carries it (ADR-0011, ADR-0025). Absent until the
 * player leaves the briefing, so a fresh link has no game in it. Since Phase 24 there is one
 * estimate of the economy, no draw and no target, so a game is how far the player has got and
 * what they agreed with the Prime Minister; everything else is lever values. The engine owns the
 * type because the codec encodes it; the web app is its only writer.
 */
export interface GamePermalink {
  /** Furthest stage reached, as an index into GAME_STAGES. */
  reached: number;
  /** The priorities ranked with the Prime Minister, first first; empty until Downing Street. */
  priorities: string[];
}

/** A fresh game, before any choice has been made. */
export function freshGame(): GamePermalink {
  return { reached: 0, priorities: [] };
}

export type SettingsInput = Partial<Settings>;

/** The fiscal effect of one lever at its chosen value. Signs follow ADR-0003. */
export interface LeverEffect {
  leverId: string;
  code: string;
  category: 'tax' | 'spend' | 'welfare' | 'macro';
  title: string;
  value: number;
  badge: Badge;
  /** Positive = more revenue. */
  receipts: YearValues;
  /** Positive = more spending. */
  currentSpending: YearValues;
  capitalSpending: YearValues;
  welfareInCap: YearValues;
  /**
   * Buying or selling a financial asset: cash out, so gilts to issue and interest to pay, but no
   * expenditure in the national accounts and no immediate effect on net financial liabilities.
   */
  financialTransactions: YearValues;
  /** Macro sensitivities only: positive = more borrowing. */
  macroPsnb: YearValues;
  /** The part of macroPsnb that falls on the current budget. */
  macroCurrent: YearValues;
  /** Change in nominal GDP growth, percentage points a year (growth slider). */
  gdpGrowthAdjustmentPp: number;
  /** Change in the marginal interest rate on new borrowing, percentage points (rates slider). */
  marginalRateAdjustmentPp: number;
  steps: DerivationStep[];
  warnings: string[];
  /** For the provenance drawer: raw published figure, factor and uprated value per target year. */
  detail?: CostingDetail;
}

export interface CostingDetail {
  /** Target fiscal year → the published (ready-reckoner) year it was taken from. */
  sourceYearFor: Record<string, string>;
  /** Effect in the published year's terms before uprating, engine sign, by target year. */
  raw: YearValues;
  /** Uprating factor by target year (1 when no uprating applies). */
  factor: YearValues;
  /** Effect after uprating, engine sign, by target year. */
  uprated: YearValues;
  caveats: string[];
  /** Percentage-of-baseline levers: the £ million path the percentage applies to, by target year. */
  baseline?: YearValues;
  /** Percentage-of-baseline levers with a published plan: the first year carried beyond the plan. */
  extendedFrom?: string;
}

export interface InteractionNotice {
  leverIds: [string, string];
  codes: [string, string];
  titles: [string, string];
  text: string;
  /** `excludes`: the two count the same money (Phase 25); both in, the total counts it twice. */
  severity: 'info' | 'warn' | 'excludes';
}

export interface Deltas {
  receipts: YearValues;
  currentSpending: YearValues;
  capitalSpending: YearValues;
  welfareInCap: YearValues;
  /** Cash paid for financial assets: borrowed, so it accrues interest, but it is not spending. */
  financialTransactions?: YearValues;
  macroPsnb: YearValues;
  macroCurrent: YearValues;
}

export interface AggregatePaths {
  psnb: YearValues;
  currentBudgetDeficit: YearValues;
  psni: YearValues;
  psnfl: YearValues;
  receipts: YearValues;
  tme: YearValues;
  welfareInCap: YearValues;
  nominalGdpFy: YearValues;
  nominalGdpCentred: YearValues;
  psnbPctGdp: YearValues;
  currentBudgetPctGdp: YearValues;
  psnflPctGdp: YearValues;
}

export interface FiscalPaths {
  /** Outturn, in-year and forecast years in order. */
  years: string[];
  /** In-year and forecast years: the years the engine can change. */
  policyYears: string[];
  baseline: AggregatePaths;
  policy: AggregatePaths;
  deltas: {
    receipts: YearValues;
    currentSpending: YearValues;
    capitalSpending: YearValues;
    welfareInCap: YearValues;
    financialTransactions: YearValues;
    macroPsnb: YearValues;
    macroCurrent: YearValues;
    primaryBorrowing: YearValues;
    debtInterest: YearValues;
    borrowing: YearValues;
    currentBudget: YearValues;
    /** Cumulative extra borrowing (policy plus macro) added to PSNFL. */
    extraDebt: YearValues;
    gdpFactor: YearValues;
    marginalRatePct: YearValues;
  };
}

export type VerdictStatus =
  'met' | 'notMet' | 'withinCap' | 'aboveCapWithinMargin' | 'aboveMargin' | 'unavailable';

export interface RuleVerdict {
  ruleId: string;
  ruleName: string;
  kind: 'currentBudget' | 'stockFalling' | 'welfareCap';
  targetYear: string;
  rolling: boolean;
  status: VerdictStatus;
  metric: {
    label: string;
    value: number;
    unit: 'GBPm' | 'pp';
    threshold: number;
    comparator: '<=' | '<';
  };
  /** Margin by which the rule is met (negative = missed), £ million. */
  headroomGbpm: number;
  headroomPctGdp: number;
  /** Stability rule only, once rolling: headroom measured against the 0.5% of GDP tolerance. */
  headroomToToleranceGbpm?: number;
  toleranceGbpm?: number;
  baseline: {
    status: VerdictStatus;
    headroomGbpm: number;
    metricValue: number;
  };
  requirement: string;
  explanation: string;
}

export interface AttributionRow {
  kind: 'lever' | 'macro' | 'debtInterest';
  code?: string;
  label: string;
  badge: Badge;
  /** Effect on the current budget deficit in the stability target year (positive = worse). */
  currentBudgetGbpm: number;
  /** Effect on borrowing in the stability target year (positive = worse). */
  psnbGbpm: number;
  /**
   * Set when the measure does nothing in the target year but starts later: the first year it
   * moves money, so a running list can say "from 2030-31" beside an honest nought (ADR-0021).
   */
  fromYear?: string;
}

export interface Outcome {
  vintageId: string;
  rulesId: string;
  settings: Settings;
  paths: FiscalPaths;
  leverEffects: LeverEffect[];
  verdicts: RuleVerdict[];
  attribution: AttributionRow[];
  interactions: InteractionNotice[];
  warnings: string[];
}
