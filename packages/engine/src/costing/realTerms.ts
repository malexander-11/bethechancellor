import { EngineError } from '../errors.js';
import { fyStart } from '../calc/years.js';
import type { Vintage, YearValues } from '../types/data.js';

/** The vintage's GDP deflator index (2024-25 = 1). Real terms in this tool means deflated by it. */
export function deflatorIndex(vintage: Vintage): YearValues {
  const series = vintage.economy.gdpDeflator;
  if (!series) throw new EngineError(`vintage ${vintage.id} has no GDP deflator`);
  return { ...series.values };
}

/** Compound growth a year, in per cent, from one value to another over a number of years. */
export function compoundGrowthPerYear(from: number, to: number, years: number): number {
  if (years <= 0) throw new EngineError('growth needs at least one year');
  if (from <= 0) throw new EngineError('growth needs a positive starting value');
  return ((to / from) ** (1 / years) - 1) * 100;
}

/**
 * Real-terms growth a year between two fiscal years: cash deflated by the GDP deflator, then
 * compounded. This is what "2.8% a year in real terms" means on a spending control.
 */
export function realGrowthPerYear(
  values: YearValues,
  deflator: YearValues,
  fromYear: string,
  toYear: string,
): number {
  const cashFrom = values[fromYear];
  const cashTo = values[toYear];
  const defFrom = deflator[fromYear];
  const defTo = deflator[toYear];
  if (cashFrom === undefined || cashTo === undefined) {
    throw new EngineError(`no value for ${fromYear} or ${toYear}`);
  }
  if (defFrom === undefined || defTo === undefined || defFrom === 0 || defTo === 0) {
    throw new EngineError(`no GDP deflator for ${fromYear} or ${toYear}`);
  }
  return compoundGrowthPerYear(
    cashFrom / defFrom,
    cashTo / defTo,
    fyStart(toYear) - fyStart(fromYear),
  );
}
