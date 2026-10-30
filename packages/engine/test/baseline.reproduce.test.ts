import { describe, expect, it } from 'vitest';
import { computeOutcome } from '../src/index.js';
import { FORECAST_YEARS, loadDataset } from './fixtures.js';

const ds = loadDataset();
const outcome = computeOutcome({ vintage: ds.vintage, rules: ds.rules, levers: ds.levers });

function pick(values: Record<string, number>, years: readonly string[]): number[] {
  return years.map((y) => values[y] ?? Number.NaN);
}

describe('zero-policy run reproduces the OBR October 2026 forecast', () => {
  it('has no lever effects, attribution or warnings', () => {
    expect(outcome.leverEffects).toEqual([]);
    expect(outcome.attribution).toEqual([]);
    expect(outcome.warnings).toEqual([]);
  });

  it('reproduces PSNB (Table A.9) to the £ million', () => {
    expect(pick(outcome.paths.policy.psnb, ['2025-26', ...FORECAST_YEARS])).toEqual([
      134300, 133200, 112000, 99500, 73800, 66900, 68300,
    ]);
  });

  it('reproduces the current budget deficit and PSNI (Table A.9)', () => {
    expect(pick(outcome.paths.policy.currentBudgetDeficit, FORECAST_YEARS)).toEqual([
      40600, 17500, 7800, -14500, -21700, -20900,
    ]);
    expect(pick(outcome.paths.policy.psni, FORECAST_YEARS)).toEqual([
      92600, 94500, 91700, 88300, 88600, 89200,
    ]);
  });

  it('reproduces PSNFL in £bn and within 0.06pp of GDP (Table A.9)', () => {
    expect(pick(outcome.paths.policy.psnfl, ['2025-26', ...FORECAST_YEARS])).toEqual([
      2552000, 2684000, 2807000, 2914000, 2997000, 3075000, 3156000,
    ]);
    const published = [81.4, 83.2, 83.8, 83.8, 83.1, 82.3, 81.7];
    pick(outcome.paths.policy.psnflPctGdp, ['2025-26', ...FORECAST_YEARS]).forEach((v, i) => {
      expect(Math.abs(v - (published[i] ?? Number.NaN))).toBeLessThanOrEqual(0.06);
    });
  });

  it('reproduces borrowing as a share of GDP within rounding (4.2% in 2026-27, 1.8% in 2031-32)', () => {
    expect(outcome.paths.policy.psnbPctGdp['2026-27']).toBeCloseTo(4.2, 1);
    expect(outcome.paths.policy.psnbPctGdp['2031-32']).toBeCloseTo(1.8, 1);
  });

  it('stability rule: fixed 2029-30 target met with £14.5bn headroom (about 0.4% of GDP)', () => {
    const v = outcome.verdicts.find((x) => x.ruleId === 'stability');
    expect(v).toBeDefined();
    // 2029-30 is the third year of this forecast, so the rule has rolled; the margin is still to
    // surplus, as the OBR states it.
    expect(v?.targetYear).toBe('2029-30');
    expect(v?.rolling).toBe(true);
    expect(v?.status).toBe('met');
    expect(
      Math.abs((v?.headroomGbpm ?? 0) - ds.vintage.checks.stabilityHeadroomGbpm.value),
    ).toBeLessThanOrEqual(ds.vintage.checks.stabilityHeadroomGbpm.toleranceGbpm);
    expect(v?.headroomPctGdp).toBeGreaterThan(0.35);
    expect(v?.headroomPctGdp).toBeLessThan(0.45);
    expect(v?.headroomToToleranceGbpm).toBeCloseTo(14500 + 0.005 * 3_543_000, 6);
    expect(v?.baseline.headroomGbpm).toBe(14500);
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

  it('welfare cap: above the cap and its 5% margin in 2029-30, on the OBR’s adjusted figure', () => {
    const v = outcome.verdicts.find((x) => x.ruleId === 'welfareCap');
    expect(v?.status).toBe(ds.vintage.checks.welfareCapStatus.value);
    // Capped welfare plus the OBR's inflation and Scottish block grant adjustments (Table 7.2).
    expect(v?.metric.value).toBe(204700 + 2300);
    expect(v?.metric.threshold).toBeCloseTo(194500 * 1.05, 6);
    expect(v?.headroomGbpm).toBeCloseTo(204225 - 207000, 6);
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
