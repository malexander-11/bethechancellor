import type { Badge, DerivationStep } from './data.js';
import type { YearValues } from './data.js';

export type AssessAsOf = 'vintage' | 'nextBudget';

/** Player choices plus engine options. Lever values are keyed by lever code. */
export interface Settings {
  leverValues: Record<string, number>;
  implementationYear: string;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
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
}

export interface InteractionNotice {
  leverIds: [string, string];
  codes: [string, string];
  titles: [string, string];
  text: string;
  severity: 'info' | 'warn';
}

export interface Deltas {
  receipts: YearValues;
  currentSpending: YearValues;
  capitalSpending: YearValues;
  welfareInCap: YearValues;
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
