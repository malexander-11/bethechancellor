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
   * this is the one place a "delay this measure" decision can live (Phase 8, ADR-0012).
   */
  implementationYearByCode?: Record<string, string>;
  /**
   * The OBR's in-game re-scoring of the player's measures: a factor per lever code applied to the
   * costed effect after costing, recorded as a `scale` step. Illustrative, badged simulated, and
   * only ever applied to levers whose own sourced caveats call the figure uncertain.
   */
  revisions?: Record<string, LeverRevision>;
}

/**
 * The story of one playthrough, as the permalink carries it (ADR-0011). Absent until the player
 * confirms an outlook and a seed is minted, so a fresh link has no game in it. The engine owns the
 * type because the codec encodes it; the web app is its only writer.
 */
export interface GamePermalink {
  /** Which in-game OBR forecast this playthrough gets; 1–999. */
  seed: number;
  /** Furthest stage reached, as an index into GAME_STAGES. */
  reached: number;
  /** The outlook chosen at stage 1: a scenario kind, or 'own' for hand-set sliders. */
  planning: string;
  /** The headroom the player means to keep, £ billion; 0 means "whatever the rules leave". */
  headroomTargetBn: number;
  theme?: string;
  priorities: string[];
  protectedPromises: string[];
  concessions: string[];
  /** Political capital: 3 to begin with, one spent per renegotiation. */
  capital: number;
  /** Lever code → the later fiscal year the measure now starts in. */
  delays: Record<string, string>;
  /** The OBR update has been seen; the macro sliders are now its forecast, not the player's. */
  revealed: boolean;
  /** Stage 6: a lever code, 'flagship:<priority id>', or 'keep'. */
  rabbit?: string;
  breachAccepted: boolean;
  /** Priorities agreed in Downing Street and given up at stage 5, so the close can say so. */
  dropped: string[];
}

/** A fresh game around a seed, before any choice has been made. */
export function freshGame(seed: number): GamePermalink {
  return {
    seed,
    reached: 0,
    planning: 'baseline',
    headroomTargetBn: 20,
    priorities: [],
    protectedPromises: [],
    concessions: [],
    capital: 3,
    delays: {},
    revealed: false,
    breachAccepted: false,
    dropped: [],
  };
}

/** Why a lever's costed effect was scaled, for the drawer and the badge beside it. */
export interface LeverRevision {
  factor: number;
  /** The consideration on the lever whose caveat licenses the revision. */
  considerationId: string;
  note: string;
}

export type SettingsInput = Partial<Settings>;

/** The fiscal effect of one lever at its chosen value. Signs follow ADR-0003. */
export interface LeverEffect {
  leverId: string;
  code: string;
  category: 'tax' | 'spend' | 'welfare' | 'macro' | 'campaign';
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
  /** Set when the in-game OBR re-scored this measure; the original badge stays, this sits beside it. */
  revision?: LeverRevision;
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
  severity: 'info' | 'warn';
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
