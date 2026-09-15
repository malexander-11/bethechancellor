import { describe, expect, it } from 'vitest';
import { computeOutcome } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (leverValues: Record<string, number>, implementationYear?: string) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: implementationYear ? { leverValues, implementationYear } : { leverValues },
  });

describe('reversal toggles from the Budget 2025 scorecard', () => {
  it('ending the threshold freeze early costs the Treasury’s figures with the sign reversed', () => {
    const e = run({ rvfrz: 1 }).leverEffects.find((x) => x.code === 'rvfrz');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2027-28']).toBeCloseTo(30, 6);
    expect(e?.receipts['2028-29']).toBeCloseTo(-(3365 + 290), 6);
    expect(e?.receipts['2029-30']).toBeCloseTo(-(7780 + 615), 6);
    expect(e?.receipts['2030-31']).toBeCloseTo(-(12435 + 925), 6);
  });

  it('applies nothing before the start year even when the scorecard has earlier values', () => {
    const e = run({ rvgam: 1 }).leverEffects.find((x) => x.code === 'rvgam');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2027-28']).toBeCloseTo(-1065, 6);
    const early = run({ rvgam: 1 }, '2026-27').leverEffects.find((x) => x.code === 'rvgam');
    expect(early?.receipts['2026-27']).toBeCloseTo(-810, 6);
  });

  it('the salary-sacrifice cap reversal follows the measure’s own timing', () => {
    const e = run({ rvsal: 1 }).leverEffects.find((x) => x.code === 'rvsal');
    expect(e?.receipts['2028-29']).toBeCloseTo(75, 6);
    expect(e?.receipts['2029-30']).toBeCloseTo(-4845, 6);
    expect(e?.receipts['2030-31']).toBeCloseTo(-2585, 6);
  });

  it('a toggle off has no effect and the unwound preset moves headroom by the sum of the five', () => {
    expect(run({ rvfrz: 0 }).leverEffects).toHaveLength(0);
    const preset = ds.presets.presets.find((p) => p.id === 'budget-2025-tax-measures-unwound');
    const o = run(preset?.leverValues ?? {});
    const total = o.leverEffects.reduce((acc, e) => acc + (e.receipts['2029-30'] ?? 0), 0);
    expect(total).toBeCloseTo(-8395 - 2230 - 4845 + 850 - 1135, 6);
    expect(o.verdicts.find((v) => v.ruleId === 'stability')?.status).toBe('met');
  });
});
