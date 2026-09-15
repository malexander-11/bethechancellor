import { describe, expect, it } from 'vitest';
import { computeOutcome } from '../src/index.js';
import { FORECAST_YEARS, loadDataset } from './fixtures.js';

const ds = loadDataset();
const outcome = computeOutcome({ vintage: ds.vintage, rules: ds.rules, levers: ds.levers });

function pick(values: Record<string, number>, years: readonly string[]): number[] {
  return years.map((y) => values[y] ?? Number.NaN);
}

describe('zero-policy run reproduces the OBR March 2026 forecast', () => {
  it('has no lever effects, attribution or warnings', () => {
    expect(outcome.leverEffects).toEqual([]);
    expect(outcome.attribution).toEqual([]);
    expect(outcome.warnings).toEqual([]);
  });

  it('reproduces PSNB (Table 5.1) to the £ million', () => {
    expect(pick(outcome.paths.policy.psnb, ['2024-25', ...FORECAST_YEARS])).toEqual([
      152700, 132700, 115500, 96500, 86000, 63400, 59000,
    ]);
  });

  it('reproduces the current budget deficit and PSNI (Table 5.1)', () => {
    expect(pick(outcome.paths.policy.currentBudgetDeficit, FORECAST_YEARS)).toEqual([
      49200, 33900, 4600, -3300, -23600, -30300,
    ]);
    expect(pick(outcome.paths.policy.psni, FORECAST_YEARS)).toEqual([
      83500, 81600, 91900, 89300, 87000, 89300,
    ]);
  });

  it('reproduces PSNFL in £bn and within 0.06pp of GDP (Table 5.6)', () => {
    expect(pick(outcome.paths.policy.psnfl, ['2024-25', ...FORECAST_YEARS])).toEqual([
      2439000, 2554000, 2661000, 2765000, 2859000, 2932000, 2999000,
    ]);
    const published = [81.0, 82.4, 82.6, 82.9, 82.9, 82.2, 81.1];
    pick(outcome.paths.policy.psnflPctGdp, ['2024-25', ...FORECAST_YEARS]).forEach((v, i) => {
      expect(Math.abs(v - (published[i] ?? Number.NaN))).toBeLessThanOrEqual(0.06);
    });
  });

  it('reproduces borrowing as a share of GDP within rounding (4.3% in 2025-26, 1.6% in 2030-31)', () => {
    expect(outcome.paths.policy.psnbPctGdp['2025-26']).toBeCloseTo(4.3, 1);
    expect(outcome.paths.policy.psnbPctGdp['2030-31']).toBeCloseTo(1.6, 1);
  });

  it('stability rule: fixed 2029-30 target met with £23.6bn headroom (about 0.7% of GDP)', () => {
    const v = outcome.verdicts.find((x) => x.ruleId === 'stability');
    expect(v).toBeDefined();
    expect(v?.targetYear).toBe('2029-30');
    expect(v?.rolling).toBe(false);
    expect(v?.status).toBe('met');
    expect(
      Math.abs((v?.headroomGbpm ?? 0) - ds.vintage.checks.stabilityHeadroomGbpm.value),
    ).toBeLessThanOrEqual(ds.vintage.checks.stabilityHeadroomGbpm.toleranceGbpm);
    expect(v?.headroomPctGdp).toBeGreaterThan(0.6);
    expect(v?.headroomPctGdp).toBeLessThan(0.75);
    expect(v?.headroomToToleranceGbpm).toBeUndefined();
    expect(v?.baseline.headroomGbpm).toBe(23600);
  });

  it('investment rule: PSNFL falls by 0.6 to 0.8pp of GDP in 2029-30, worth £21-29bn', () => {
    const v = outcome.verdicts.find((x) => x.ruleId === 'investment');
    expect(v?.status).toBe('met');
    expect(v?.targetYear).toBe('2029-30');
    expect(v?.metric.value).toBeGreaterThanOrEqual(-0.8);
    expect(v?.metric.value).toBeLessThanOrEqual(-0.6);
    expect(
      Math.abs((v?.metric.value ?? 0) - ds.vintage.checks.psnflChangePctGdp.value),
    ).toBeLessThanOrEqual(ds.vintage.checks.psnflChangePctGdp.tolerancePp);
    expect(v?.headroomGbpm).toBeGreaterThan(21000);
    expect(v?.headroomGbpm).toBeLessThan(29000);
  });

  it('welfare cap: above the cap but within the 5% margin in 2029-30', () => {
    const v = outcome.verdicts.find((x) => x.ruleId === 'welfareCap');
    expect(v?.status).toBe(ds.vintage.checks.welfareCapStatus.value);
    expect(v?.metric.value).toBe(199200);
    expect(v?.metric.threshold).toBeCloseTo(194500 * 1.05, 6);
    expect(v?.headroomGbpm).toBeCloseTo(204225 - 199200, 6);
  });

  it('holds the identity current budget = PSNB − PSNI in every policy year', () => {
    for (const y of FORECAST_YEARS) {
      const psnb = outcome.paths.policy.psnb[y] ?? Number.NaN;
      const psni = outcome.paths.policy.psni[y] ?? Number.NaN;
      const cbd = outcome.paths.policy.currentBudgetDeficit[y] ?? Number.NaN;
      expect(psnb - psni).toBeCloseTo(cbd, 6);
    }
  });
});
