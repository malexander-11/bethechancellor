import { EngineError } from '../errors.js';
import type { YearValues } from '../types/data.js';

export function zeros(years: readonly string[]): YearValues {
  const out: YearValues = {};
  for (const y of years) out[y] = 0;
  return out;
}

/** Adds `scale × addend` into `target` year by year (mutating). */
export function addInto(target: YearValues, addend: YearValues, scale = 1): void {
  for (const [year, value] of Object.entries(addend)) {
    target[year] = (target[year] ?? 0) + value * scale;
  }
}

export function mapYears(
  years: readonly string[],
  fn: (year: string, index: number) => number,
): YearValues {
  const out: YearValues = {};
  years.forEach((y, i) => {
    out[y] = fn(y, i);
  });
  return out;
}

export function requireValue(values: YearValues, year: string, label: string): number {
  const v = values[year];
  if (v === undefined || Number.isNaN(v)) {
    throw new EngineError(`${label} has no value for ${year}`);
  }
  return v;
}

export function valueOrZero(values: YearValues, year: string): number {
  return values[year] ?? 0;
}

export function sumYears(values: YearValues, years: readonly string[]): number {
  return years.reduce((acc, y) => acc + (values[y] ?? 0), 0);
}
