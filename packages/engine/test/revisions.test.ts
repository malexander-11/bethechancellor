import { describe, expect, it } from 'vitest';
import { applyRevision, computeOutcome } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (settings: Parameters<typeof computeOutcome>[0]['settings']) =>
  computeOutcome({ vintage: ds.vintage, rules: ds.rules, levers: ds.levers, settings });

describe('the in-game OBR re-scoring seam', () => {
  it('scales every money series, records the step, and keeps the original badge', () => {
    const base = run({ leverValues: { vatfood: 1 } });
    const effect = base.leverEffects.find((e) => e.code === 'vatfood');
    if (!effect) throw new Error('no effect');
    const revised = applyRevision(effect, {
      factor: 0.5,
      considerationId: 'static-not-yield',
      note: 'test',
    });
    for (const year of Object.keys(effect.receipts)) {
      expect(revised.receipts[year]).toBeCloseTo((effect.receipts[year] ?? 0) * 0.5, 6);
    }
    expect(revised.badge).toBe(effect.badge);
    expect(revised.revision?.factor).toBe(0.5);
    expect(revised.steps[revised.steps.length - 1]?.op).toBe('scale');
    // The original is untouched.
    expect(effect.revision).toBeUndefined();
  });

  it('reaches the outcome through settings.revisions, and leaves macro levers alone', () => {
    const plain = run({ leverValues: { vatfood: 1, rate: 0.75 } });
    const revised = run({
      leverValues: { vatfood: 1, rate: 0.75 },
      revisions: {
        vatfood: { factor: 0.5, considerationId: 'static-not-yield', note: 'test' },
        rate: { factor: 0.5, considerationId: 'rates-feedback', note: 'must be ignored' },
      },
    });
    const year = '2029-30';
    const plainFood = plain.leverEffects.find((e) => e.code === 'vatfood')?.receipts[year] ?? 0;
    const revisedFood = revised.leverEffects.find((e) => e.code === 'vatfood')?.receipts[year] ?? 0;
    expect(revisedFood).toBeCloseTo(plainFood * 0.5, 3);
    const plainRate = plain.leverEffects.find((e) => e.code === 'rate')?.macroPsnb[year];
    const revisedRate = revised.leverEffects.find((e) => e.code === 'rate')?.macroPsnb[year];
    expect(revisedRate).toBe(plainRate);
    expect(revised.leverEffects.find((e) => e.code === 'rate')?.revision).toBeUndefined();
  });
});

describe('a later start for one measure', () => {
  it('zeroes the early years of a schedule and leaves the later ones alone', () => {
    const now = run({ leverValues: { ufsm: 1 } });
    const later = run({ leverValues: { ufsm: 1 }, implementationYearByCode: { ufsm: '2028-29' } });
    const a = now.leverEffects.find((e) => e.code === 'ufsm');
    const b = later.leverEffects.find((e) => e.code === 'ufsm');
    expect(a?.currentSpending['2027-28']).toBeGreaterThan(0);
    expect(b?.currentSpending['2027-28'] ?? 0).toBe(0);
    expect(b?.currentSpending['2029-30']).toBeCloseTo(a?.currentSpending['2029-30'] ?? 0, 6);
  });

  it('delays only the named lever, and a share-of-baseline lever the same way', () => {
    const later = run({
      leverValues: { dhsc: 2, dfe: 2 },
      implementationYearByCode: { dhsc: '2028-29' },
    });
    const health = later.leverEffects.find((e) => e.code === 'dhsc');
    const schools = later.leverEffects.find((e) => e.code === 'dfe');
    expect(health?.currentSpending['2027-28'] ?? 0).toBe(0);
    expect(health?.currentSpending['2028-29']).toBeGreaterThan(0);
    expect(schools?.currentSpending['2027-28']).toBeGreaterThan(0);
    expect(later.settings.implementationYearByCode).toEqual({ dhsc: '2028-29' });
  });
});
