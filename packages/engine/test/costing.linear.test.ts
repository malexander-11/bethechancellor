import { describe, expect, it } from 'vitest';
import { computeOutcome, taxHeadSeries } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (leverValues: Record<string, number>, implementationYear?: string) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: implementationYear ? { leverValues, implementationYear } : { leverValues },
  });
const head = taxHeadSeries(ds.vintage, 'incomeTax');
const h = (y: string) => head[y] ?? Number.NaN;

describe('linear direct costings from the HMRC ready reckoner', () => {
  it('reproduces HMRC exactly when the start year matches HMRC (April 2026)', () => {
    const o = run({ itbr: 1 }, '2026-27');
    const e = o.leverEffects.find((x) => x.code === 'itbr');
    expect(e?.receipts['2026-27']).toBeCloseTo(6900, 6);
    expect(e?.receipts['2027-28']).toBeCloseTo(8250, 6);
    expect(e?.receipts['2028-29']).toBeCloseTo(8200, 6);
    expect(e?.receipts['2025-26']).toBe(0);
    // Beyond HMRC's horizon the year-3 figure grows with income tax receipts.
    expect(e?.receipts['2029-30']).toBeCloseTo(8200 * (h('2029-30') / h('2028-29')), 6);
    expect(e?.receipts['2030-31']).toBeCloseTo(8200 * (h('2030-31') / h('2028-29')), 6);
  });

  it('shifts and scales the profile for the default April 2027 start (worked example)', () => {
    const o = run({ itbr: 1 });
    const e = o.leverEffects.find((x) => x.code === 'itbr');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2027-28']).toBeCloseTo(6900 * (h('2027-28') / h('2026-27')), 6);
    expect(e?.receipts['2028-29']).toBeCloseTo(8250 * (h('2028-29') / h('2027-28')), 6);
    expect(e?.receipts['2029-30']).toBeCloseTo(8200 * (h('2029-30') / h('2028-29')), 6);
    expect(e?.receipts['2030-31']).toBeCloseTo(8200 * (h('2030-31') / h('2028-29')), 6);
    // Plan's hand calculation: about £8.6bn in 2029-30.
    expect(e?.receipts['2029-30']).toBeGreaterThan(8450);
    expect(e?.receipts['2029-30']).toBeLessThan(8700);
    expect(e?.detail?.sourceYearFor['2029-30']).toBe('2028-29');
    expect(e?.detail?.factor['2029-30']).toBeCloseTo(h('2029-30') / h('2028-29'), 9);
    expect(e?.steps.some((s) => s.op === 'scale')).toBe(true);
  });

  it('a penny on the basic rate raises 2029-30 headroom by the uprated yield plus interest savings', () => {
    const base = run({});
    const o = run({ itbr: 1 });
    const e = o.leverEffects.find((x) => x.code === 'itbr');
    const yieldY = e?.receipts['2029-30'] ?? 0;
    const delta =
      (o.verdicts.find((v) => v.ruleId === 'stability')?.headroomGbpm ?? 0) -
      (base.verdicts.find((v) => v.ruleId === 'stability')?.headroomGbpm ?? 0);
    // Extra receipts from 2027-28 also cut debt interest: about 11% on top by 2029-30 at 4.5%.
    expect(delta).toBeGreaterThan(yieldY);
    expect(delta).toBeLessThan(yieldY * 1.15);
    const row = o.attribution.find((r) => r.code === 'itbr');
    expect(row?.kind).toBe('lever');
    expect(row?.currentBudgetGbpm).toBeCloseTo(-yieldY, 6);
    expect(o.attribution.some((r) => r.kind === 'debtInterest' && r.currentBudgetGbpm < 0)).toBe(
      true,
    );
  });

  it('uses the cost table for a cut in the additional rate and the yield table for a rise', () => {
    const up = run({ itar: 1 }, '2026-27').leverEffects.find((x) => x.code === 'itar');
    const down = run({ itar: -1 }, '2026-27').leverEffects.find((x) => x.code === 'itar');
    expect(up?.receipts['2028-29']).toBeCloseTo(230, 6);
    expect(down?.receipts['2028-29']).toBeCloseTo(-300, 6);
    expect(run({ itar: -2 }, '2026-27').leverEffects[0]?.receipts['2027-28']).toBeCloseTo(-670, 6);
  });

  it('sums component rows and respects unit sizes', () => {
    const nic = run({ nicm: 1 }, '2026-27').leverEffects.find((x) => x.code === 'nicm');
    expect(nic?.receipts['2028-29']).toBeCloseTo(5400 + 445, 6);
    const threshold = run({ nicpt: 208 }, '2026-27').leverEffects.find((x) => x.code === 'nicpt');
    expect(threshold?.receipts['2028-29']).toBeCloseTo(-2 * 250, 6);
    const fuel = run({ fuel: 10 }, '2026-27').leverEffects.find((x) => x.code === 'fuel');
    expect(fuel?.receipts['2026-27']).toBeCloseTo(10 * (100 + 140), 6);
  });

  it('half-point NICs settings and pence settings survive normalisation', () => {
    const o = run({ nicm: 0.5, itbr: 2 }, '2026-27');
    expect(o.leverEffects.find((x) => x.code === 'nicm')?.value).toBe(0.5);
    expect(o.leverEffects.find((x) => x.code === 'itbr')?.receipts['2028-29']).toBeCloseTo(
      16400,
      6,
    );
  });
});
