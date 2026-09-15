import type { YearValues } from '../types/data.js';
import { mapYears } from './series.js';

/** Percentage of GDP. Flows use financial-year GDP; stocks use end-March-centred GDP (ADR-0003). */
export function pctOfGdp(valueGbpm: number, gdpGbpm: number): number {
  return (valueGbpm / gdpGbpm) * 100;
}

export function ratioSeries(
  values: YearValues,
  gdp: YearValues,
  years: readonly string[],
): YearValues {
  return mapYears(years, (y) => pctOfGdp(values[y] ?? 0, gdp[y] ?? Number.NaN));
}

/**
 * Cumulative growth factors for a change in nominal GDP growth of `growthAdjPp` percentage points a
 * year, applied from `firstAdjustedIndex` onwards. Years before it keep a factor of 1.
 */
export function growthFactors(
  years: readonly string[],
  firstAdjustedIndex: number,
  growthAdjPp: number,
): YearValues {
  const g = growthAdjPp / 100;
  return mapYears(years, (_y, i) =>
    i < firstAdjustedIndex ? 1 : (1 + g) ** (i - firstAdjustedIndex + 1),
  );
}
