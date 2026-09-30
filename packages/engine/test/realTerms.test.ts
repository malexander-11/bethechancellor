import { describe, expect, it } from 'vitest';
import {
  compoundGrowthPerYear,
  deflatorIndex,
  policyYearsOf,
  realGrowthPerYear,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const deflator = deflatorIndex(ds.vintage);
const years = policyYearsOf(ds.vintage);
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing ${code}`);
  return found;
};

describe('real terms', () => {
  it('chains the OBR financial-year deflator from 2024-25 = 1', () => {
    expect(deflator['2024-25']).toBe(1);
    expect(deflator['2025-26']).toBeCloseTo(1.032, 6);
    expect(deflator['2026-27']).toBeCloseTo(1.032 * 1.02, 6);
    expect(deflator['2030-31']).toBeCloseTo(1.136063, 5);
  });

  it('turns cash growth into growth a year after inflation', () => {
    expect(compoundGrowthPerYear(100, 121, 2)).toBeCloseTo(10, 9);
    // Cash growing exactly with the deflator is zero real growth.
    const flat = {
      '2026-27': 100 * (deflator['2026-27'] ?? 1),
      '2028-29': 100 * (deflator['2028-29'] ?? 1),
    };
    expect(realGrowthPerYear(flat, deflator, '2026-27', '2028-29')).toBeCloseTo(0, 9);
  });

  it('reads a settlement growing 2.9% a year after prices as that, and +2% from 2027-28 lifts it about a point', () => {
    // A made-up settlement, so a real one's re-costing never moves this.
    const path = Object.fromEntries(
      years.map((y, k) => [y, 100_000 * (deflator[y] ?? Number.NaN) * 1.029 ** k]),
    );
    const before = realGrowthPerYear(path, deflator, '2026-27', '2028-29');
    expect(before).toBeCloseTo(2.9, 9);
    const raised = Object.fromEntries(
      Object.entries(path).map(([y, v]) => [y, y >= '2027-28' ? v * 1.02 : v]),
    );
    const after = realGrowthPerYear(raised, deflator, '2026-27', '2028-29');
    expect(after - before).toBeGreaterThan(0.9);
    expect(after - before).toBeLessThan(1.1);
  });

  it('child benefit is retired and no longer offered', () => {
    expect(lever('chb').deprecated).toBe(true);
  });
});
