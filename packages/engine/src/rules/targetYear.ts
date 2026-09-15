import { compareFy, nextFy } from '../calc/years.js';
import type { Vintage } from '../types/data.js';
import type { AssessAsOf } from '../types/engine.js';

export interface TargetYearResolution {
  targetYear: string;
  rolling: boolean;
  thirdYear: string;
  forecastWindow: string[];
}

/**
 * The forecast period is the five years after the year in progress. `nextBudget` previews the
 * window the next forecast will use: one year later.
 */
export function resolveForecastWindow(years: Vintage['years'], assessAsOf: AssessAsOf): string[] {
  if (assessAsOf === 'vintage') return [...years.forecast];
  const last = years.forecast[years.forecast.length - 1];
  return [...years.forecast.slice(1), nextFy(last ?? years.inYear)];
}

/**
 * Charter logic: a fixed target year applies "until [it] becomes the third year of the forecast
 * period"; from then on the third year of the rolling forecast is the target.
 */
export function resolveTargetYear(
  rule: { fixedTargetYear: string; rollingFromThirdYear: true },
  years: Vintage['years'],
  assessAsOf: AssessAsOf,
): TargetYearResolution {
  const forecastWindow = resolveForecastWindow(years, assessAsOf);
  const thirdYear = forecastWindow[2];
  if (!thirdYear) throw new Error('forecast window must have at least three years');
  const rolling = compareFy(thirdYear, rule.fixedTargetYear) >= 0;
  return {
    targetYear: rolling ? thirdYear : rule.fixedTargetYear,
    rolling,
    thirdYear,
    forecastWindow,
  };
}
