import { describe, expect, it } from 'vitest';
import { baselinePath, computeOutcome, headSeries, policyYearsOf } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const policyYears = policyYearsOf(ds.vintage);
const run = (
  leverValues: Record<string, number>,
  extra: { implementationYear?: string; debtInterestFeedback?: boolean } = {},
) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, ...extra },
  });
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing lever ${code}`);
  return found;
};
const HEALTH_2028_29 = 231977.319;

describe('percentage-of-baseline levers', () => {
  it('scales the Spending Review settlement in its own years and extends it with OBR total RDEL', () => {
    const path = baselinePath(lever('dhsc'), ds.vintage, policyYears);
    expect(path.values['2025-26']).toBeCloseTo(201970.662, 3);
    expect(path.values['2028-29']).toBeCloseTo(HEALTH_2028_29, 3);
    const rdel = headSeries(ds.vintage, 'rdel');
    const r = (y: string) => rdel[y] ?? Number.NaN;
    expect(path.values['2029-30']).toBeCloseTo(HEALTH_2028_29 * (r('2029-30') / r('2028-29')), 6);
    expect(path.values['2030-31']).toBeCloseTo(HEALTH_2028_29 * (r('2030-31') / r('2028-29')), 6);
    expect(path.extendedFrom).toBe('2029-30');
    expect(path.sourceYearFor['2030-31']).toBe('2028-29');
    expect(path.steps.filter((s) => s.op === 'extend')).toHaveLength(2);

    const e = run({ dhsc: 1 }).leverEffects.find((x) => x.code === 'dhsc');
    expect(e?.currentSpending['2025-26']).toBe(0);
    expect(e?.currentSpending['2026-27']).toBe(0);
    expect(e?.currentSpending['2027-28']).toBeCloseTo(2213.22, 1);
    expect(e?.currentSpending['2028-29']).toBeCloseTo(2319.77, 1);
    // Plan's worked example: about 2,369 in 2029-30.
    expect(e?.currentSpending['2029-30']).toBeGreaterThan(2350);
    expect(e?.currentSpending['2029-30']).toBeLessThan(2390);
    expect(Object.values(e?.receipts ?? {}).every((v) => v === 0)).toBe(true);
    expect(Object.values(e?.welfareInCap ?? {}).every((v) => v === 0)).toBe(true);
    expect(e?.detail?.baseline?.['2028-29']).toBeCloseTo(HEALTH_2028_29, 3);
    expect(e?.detail?.extendedFrom).toBe('2029-30');
    expect(e?.badge).toBe('mechanical');
  });

  it('the all-other residual equals the published total less the eight departments', () => {
    const eight = ['dhsc', 'dfe', 'mod', 'home', 'moj', 'mhclg', 'fcdo', 'dft'];
    const sumEight = eight.reduce((acc, code) => {
      const c = lever(code).costing;
      if (c.kind !== 'pctOfBaseline' || c.baseline.from !== 'published') throw new Error(code);
      return acc + (c.baseline.values['2028-29'] ?? 0);
    }, 0);
    const path = baselinePath(lever('otherd'), ds.vintage, policyYears);
    expect(path.values['2028-29']).toBeCloseTo(567807.634 - sumEight, 2);
    expect(path.values['2028-29']).toBeCloseTo(128004.804, 2);
  });

  it('a cut is a saving and an earlier start year applies the plan from that year', () => {
    const e = run({ dfe: -5 }, { implementationYear: '2026-27' }).leverEffects.find(
      (x) => x.code === 'dfe',
    );
    expect(e?.currentSpending['2025-26']).toBe(0);
    expect(e?.currentSpending['2026-27']).toBeCloseTo(-0.05 * 98307.461, 3);
    expect(e?.currentSpending['2028-29']).toBeCloseTo(-0.05 * 101483.652, 3);
    expect(run({ dfe: 0 }).leverEffects).toHaveLength(0);
  });

  it('capital investment moves borrowing and net financial liabilities but not the current budget', () => {
    const cdel = ds.vintage.fiscal.cdel.values;
    const noFeedback = run({ cdel: 10 }, { debtInterestFeedback: false });
    expect(noFeedback.paths.deltas.capitalSpending['2029-30']).toBeCloseTo(
      0.1 * (cdel['2029-30'] ?? 0),
      6,
    );
    expect(noFeedback.paths.deltas.capitalSpending['2029-30']).toBeCloseTo(13420, 6);
    expect(noFeedback.paths.deltas.currentBudget['2029-30']).toBeCloseTo(0, 6);
    expect(noFeedback.paths.deltas.borrowing['2029-30']).toBeCloseTo(13420, 6);
    const extraDebt = ['2027-28', '2028-29', '2029-30'].reduce(
      (acc, y) => acc + 0.1 * (cdel[y] ?? 0),
      0,
    );
    expect(
      (noFeedback.paths.policy.psnfl['2029-30'] ?? 0) -
        (noFeedback.paths.baseline.psnfl['2029-30'] ?? 0),
    ).toBeCloseTo(extraDebt, 6);
    expect(noFeedback.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm).toBeCloseTo(
      noFeedback.verdicts.find((v) => v.kind === 'currentBudget')?.baseline.headroomGbpm ?? 0,
      6,
    );

    const withFeedback = run({ cdel: 10 });
    expect(withFeedback.paths.deltas.currentBudget['2029-30']).toBeGreaterThan(0);
    expect(withFeedback.paths.deltas.currentBudget['2029-30']).toBeLessThan(2000);
    const row = withFeedback.attribution.find((r) => r.code === 'cdel');
    expect(row?.currentBudgetGbpm).toBeCloseTo(0, 6);
    expect(row?.psnbGbpm).toBeCloseTo(13420, 6);
    expect(withFeedback.attribution.some((r) => r.kind === 'debtInterest')).toBe(true);
  });

  it('welfare lines scale the OBR forecast and only inside-cap lines move the cap metric', () => {
    const pens = run({ wpens: 1 }).leverEffects.find((x) => x.code === 'wpens');
    expect(pens?.currentSpending['2029-30']).toBeCloseTo(1875, 6);
    expect(pens?.welfareInCap['2029-30']).toBe(0);
    const dis = run({ wdis: -10 }).leverEffects.find((x) => x.code === 'wdis');
    expect(dis?.currentSpending['2029-30']).toBeCloseTo(-6110, 6);
    expect(dis?.welfareInCap['2029-30']).toBeCloseTo(-6110, 6);
    expect(dis?.detail?.extendedFrom).toBeUndefined();
    expect(dis?.detail?.baseline?.['2029-30']).toBe(61100);
  });
});
