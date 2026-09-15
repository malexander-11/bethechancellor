import { describe, expect, it } from 'vitest';
import {
  baselinePath,
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

  it('reads the health settlement as about 2.9% a year real, and +2% lifts it to 3.9%', () => {
    const path = baselinePath(lever('dhsc'), ds.vintage, years);
    const before = realGrowthPerYear(path.values, deflator, '2026-27', '2028-29');
    expect(before).toBeGreaterThan(2.8);
    expect(before).toBeLessThan(3.0);
    const raised = Object.fromEntries(
      Object.entries(path.values).map(([y, v]) => [y, y >= '2027-28' ? v * 1.02 : v]),
    );
    const after = realGrowthPerYear(raised, deflator, '2026-27', '2028-29');
    expect(after - before).toBeGreaterThan(0.9);
    expect(after - before).toBeLessThan(1.1);
  });

  it('every milestone that cites a published table reproduces from it', () => {
    const withMilestones = ds.levers.filter((l) => (l.milestones?.length ?? 0) > 0);
    expect(withMilestones.length).toBeGreaterThanOrEqual(12);
    const health = lever('dhsc').milestones ?? [];
    expect(health.find((m) => m.label === 'This Spending Review')?.value).toBeCloseTo(2.79, 2);
    expect(health.find((m) => m.label === '2010-11 to 2019-20')?.value).toBeCloseTo(1.77, 2);
    expect(health.find((m) => m.label === '2010-11 to 2024-25')?.value).toBeCloseTo(2.41, 2);
    const defence = lever('mod').milestones ?? [];
    expect(defence.find((m) => m.label === '2010-11 to 2019-20')?.value).toBeLessThan(0);
    expect(defence.find((m) => m.unit === 'pctGDP')?.value).toBeCloseTo(2.2, 2);
  });

  it('child benefit is retired and no longer offered', () => {
    expect(lever('chb').deprecated).toBe(true);
  });
});
