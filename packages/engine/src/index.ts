export { DataError, EngineError } from './errors.js';
export * from './schema/index.js';
export type * from './types/data.js';
export type * from './types/engine.js';
export {
  parseHouseholds,
  parseLever,
  parsePresets,
  parseRules,
  parseSources,
  parseVintage,
  validateDataset,
  type Dataset,
} from './load.js';
export { validateVintage } from './validate/validateVintage.js';
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
