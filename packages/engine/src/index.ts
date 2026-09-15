export { DataError, EngineError } from './errors.js';
export * from './schema/index.js';
export type * from './types/data.js';
export type * from './types/engine.js';
export {
  parseHmrcExtract,
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseScorecardExtract,
  parseSources,
  parseSr25Extract,
  parseReliefExtract,
  parseContext,
  parseVintage,
  validateDataset,
  type Dataset,
} from './load.js';
export { validateVintage } from './validate/validateVintage.js';
export { checkRawSourceConsistency, type ExtractedSources } from './validate/rawSource.js';
export {
  hasHead,
  headSeries,
  isTaxHead,
  spendingSeries,
  taxHeadSeries,
} from './costing/taxHead.js';
export { baselinePath, type BaselinePath } from './costing/pctOfBaseline.js';
export { uprateToForecast, type PublishedSeries, type UpratedSeries } from './costing/uprate.js';
export { interpolateLookup } from './costing/lookup.js';
export { costLever } from './costing/index.js';
export {
  computeOutcome,
  normaliseLeverValue,
  resolveSettings,
  type ComputeInput,
} from './calc/spine.js';
export {
  runFiscalArithmetic,
  allYearsOf,
  policyYearsOf,
  type ArithmeticInput,
} from './calc/arithmetic.js';
export { applyDebtInterestFeedback, type DebtInterestResult } from './calc/debtInterest.js';
export { growthFactors, pctOfGdp } from './calc/ratios.js';
export {
  compareFy,
  fyFromStart,
  fyRange,
  fyStart,
  fyStartYearLabel,
  isFiscalYear,
  nextFy,
  prevFy,
} from './calc/years.js';
export {
  resolveForecastWindow,
  resolveTargetYear,
  type TargetYearResolution,
} from './rules/targetYear.js';
export {
  evaluateCurrentBudgetRule,
  evaluateRules,
  evaluateStockFallingRule,
  evaluateWelfareCapRule,
} from './rules/verdicts.js';
export {
  PERMALINK_VERSION,
  decodePermalink,
  encodePermalink,
  type DecodedPermalink,
  type PermalinkState,
} from './permalink/codec.js';
export { formatGbp, formatGbpBn, formatPct, perHousehold } from './format.js';
