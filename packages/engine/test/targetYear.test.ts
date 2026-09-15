import { describe, expect, it } from 'vitest';
import { computeOutcome, resolveTargetYear } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const rule = { fixedTargetYear: '2029-30', rollingFromThirdYear: true as const };

describe('Charter target-year logic', () => {
  it('March 2026 vintage (forecast 2026-27 to 2030-31): fixed 2029-30, not rolling', () => {
    const r = resolveTargetYear(
      rule,
      {
        outturn: ['2024-25'],
        inYear: '2025-26',
        forecast: ['2026-27', '2027-28', '2028-29', '2029-30', '2030-31'],
      },
      'vintage',
    );
    expect(r).toMatchObject({ targetYear: '2029-30', rolling: false, thirdYear: '2028-29' });
  });

  it('October 2026 forecast (2027-28 to 2031-32): 2029-30 becomes the third year, rule is rolling', () => {
    const r = resolveTargetYear(
      rule,
      {
        outturn: ['2025-26'],
        inYear: '2026-27',
        forecast: ['2027-28', '2028-29', '2029-30', '2030-31', '2031-32'],
      },
      'vintage',
    );
    expect(r).toMatchObject({ targetYear: '2029-30', rolling: true, thirdYear: '2029-30' });
  });

  it('a year later (2028-29 to 2032-33): the target rolls to 2030-31', () => {
    const r = resolveTargetYear(
      rule,
      {
        outturn: ['2026-27'],
        inYear: '2027-28',
        forecast: ['2028-29', '2029-30', '2030-31', '2031-32', '2032-33'],
      },
      'vintage',
    );
    expect(r).toMatchObject({ targetYear: '2030-31', rolling: true });
  });

  it('assessAsOf nextBudget previews the rolling form on the March 2026 baseline', () => {
    const r = resolveTargetYear(
      rule,
      {
        outturn: ['2024-25'],
        inYear: '2025-26',
        forecast: ['2026-27', '2027-28', '2028-29', '2029-30', '2030-31'],
      },
      'nextBudget',
    );
    expect(r).toMatchObject({
      targetYear: '2029-30',
      rolling: true,
      forecastWindow: ['2027-28', '2028-29', '2029-30', '2030-31', '2031-32'],
    });
  });

  it('in rolling form the stability verdict reports headroom against zero and against the 0.5% tolerance', () => {
    const ds = loadDataset();
    const outcome = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: { assessAsOf: 'nextBudget' },
    });
    const v = outcome.verdicts.find((x) => x.ruleId === 'stability');
    expect(v?.rolling).toBe(true);
    expect(v?.headroomGbpm).toBe(23600);
    const gdp = ds.vintage.economy.nominalGdpFy.values['2029-30'] ?? 0;
    expect(v?.toleranceGbpm).toBeCloseTo(0.005 * gdp, 6);
    expect(v?.headroomToToleranceGbpm).toBeCloseTo(0.005 * gdp + 23600, 6);
    const inv = outcome.verdicts.find((x) => x.ruleId === 'investment');
    expect(inv?.rolling).toBe(true);
    expect(inv?.targetYear).toBe('2029-30');
  });
});
