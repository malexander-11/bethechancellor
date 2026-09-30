import { describe, expect, it } from 'vitest';
import {
  baselinePath,
  computeOutcome,
  headSeries,
  policyYearsOf,
  type Lever,
  type Settings,
} from '../src/index.js';
import { loadDataset, syntheticLever, type SyntheticLeverParts } from './fixtures.js';

/**
 * Percentage-of-baseline costings (ADR-0006): a change in per cent of a path, which is a published
 * plan for its own years carried on with a forecast series, or a forecast line itself. The levers
 * are made up, with round numbers, so a real lever's re-costing never moves these; the forecast
 * lines are the published vintage's.
 */
const ds = loadDataset();
const policyYears = policyYearsOf(ds.vintage);
const run = (
  levers: Lever[],
  leverValues: Record<string, number>,
  settings: Partial<Settings> = {},
) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers,
    settings: { leverValues, ...settings },
  });
const effectOf = (lever: Lever, value: number, settings: Partial<Settings> = {}) => {
  const e = run([lever], { [lever.code]: value }, settings).leverEffects.find(
    (x) => x.code === lever.code,
  );
  if (!e) throw new Error(`no effect for ${lever.code}`);
  return e;
};
const share = (
  code: string,
  baseline: Record<string, unknown>,
  parts: Omit<SyntheticLeverParts, 'code' | 'costing'> = {},
) =>
  syntheticLever({
    category: 'spend',
    badge: 'mechanical',
    ...parts,
    code,
    control: { unit: 'pct', ...parts.control },
    costing: {
      kind: 'pctOfBaseline',
      baseline,
      source: { sourceId: 'hmt-sr25-del-tables' },
      caveats: [],
    },
  });
const PLAN = { '2025-26': 1000, '2026-27': 1100, '2027-28': 1200, '2028-29': 1300 };
const published = (values: Record<string, number>) => ({
  from: 'published',
  years: Object.keys(values),
  values,
  extendWith: 'rdel',
  rawSource: {
    kind: 'hmtSr25',
    sourceId: 'hmt-sr25-del-tables',
    sheet: 'Table 5.3 RDELex',
    rows: [{ rowId: 'a-department', label: 'A department', values }],
  },
});
/** A department's day-to-day budget: a settlement for four years, then the OBR's total. */
const DEPARTMENT = share('xdept', published(PLAN));
const rdel = headSeries(ds.vintage, 'rdel');
const r = (y: string) => rdel[y] ?? Number.NaN;

describe('percentage-of-baseline levers', () => {
  it('scales a published plan in its own years and carries it on with a forecast line after them', () => {
    const path = baselinePath(DEPARTMENT, ds.vintage, policyYears);
    expect(path.values['2025-26']).toBe(1000);
    expect(path.values['2028-29']).toBe(1300);
    expect(path.values['2029-30']).toBeCloseTo(1300 * (r('2029-30') / r('2028-29')), 6);
    expect(path.values['2030-31']).toBeCloseTo(1300 * (r('2030-31') / r('2028-29')), 6);
    expect(path.extendedFrom).toBe('2029-30');
    expect(path.sourceYearFor['2030-31']).toBe('2028-29');
    expect(path.steps.filter((s) => s.op === 'extend')).toHaveLength(2);

    const e = effectOf(DEPARTMENT, 1);
    expect(e.currentSpending['2025-26']).toBe(0);
    expect(e.currentSpending['2026-27']).toBe(0);
    expect(e.currentSpending['2027-28']).toBeCloseTo(12, 6);
    expect(e.currentSpending['2028-29']).toBeCloseTo(13, 6);
    expect(e.currentSpending['2029-30']).toBeCloseTo(0.01 * (path.values['2029-30'] ?? 0), 6);
    expect(Object.values(e.receipts).every((v) => v === 0)).toBe(true);
    expect(Object.values(e.welfareInCap).every((v) => v === 0)).toBe(true);
    expect(e.detail?.baseline?.['2028-29']).toBe(1300);
    expect(e.detail?.extendedFrom).toBe('2029-30');
    expect(e.badge).toBe('mechanical');
  });

  it('makes a cut a saving, and applies the plan from an earlier start year', () => {
    const e = effectOf(DEPARTMENT, -5, { implementationYear: '2026-27' });
    expect(e.currentSpending['2025-26']).toBe(0);
    expect(e.currentSpending['2026-27']).toBeCloseTo(-0.05 * 1100, 6);
    expect(e.currentSpending['2028-29']).toBeCloseTo(-0.05 * 1300, 6);
    expect(run([DEPARTMENT], { [DEPARTMENT.code]: 0 }).leverEffects).toHaveLength(0);
  });

  it('applies nothing in a year before the plan begins, and says so', () => {
    const [first, ...later] = Object.keys(PLAN);
    const late = share('xlate', published(Object.fromEntries(later.map((y) => [y, 1000]))));
    const path = baselinePath(late, ds.vintage, policyYears);
    expect(path.values[first ?? '']).toBe(0);
    expect(path.warnings.some((w) => w.includes(first ?? ''))).toBe(true);
  });

  it('moves borrowing and debt with investment, and the current budget only through interest', () => {
    const investment = share(
      'xinvest',
      { from: 'vintage', series: 'cdel' },
      { classification: { side: 'spending', currentOrCapital: 'capital' } },
    );
    const cdel = ds.vintage.fiscal.cdel.values;
    const tenth = (y: string) => 0.1 * (cdel[y] ?? Number.NaN);
    const noFeedback = run([investment], { xinvest: 10 }, { debtInterestFeedback: false });
    expect(noFeedback.paths.deltas.capitalSpending['2029-30']).toBeCloseTo(tenth('2029-30'), 6);
    expect(noFeedback.paths.deltas.currentBudget['2029-30']).toBeCloseTo(0, 6);
    expect(noFeedback.paths.deltas.borrowing['2029-30']).toBeCloseTo(tenth('2029-30'), 6);
    const extraDebt = ['2027-28', '2028-29', '2029-30'].reduce((acc, y) => acc + tenth(y), 0);
    expect(
      (noFeedback.paths.policy.psnfl['2029-30'] ?? 0) -
        (noFeedback.paths.baseline.psnfl['2029-30'] ?? 0),
    ).toBeCloseTo(extraDebt, 6);
    const stability = noFeedback.verdicts.find((v) => v.kind === 'currentBudget');
    expect(stability?.headroomGbpm).toBeCloseTo(stability?.baseline.headroomGbpm ?? 0, 6);

    const withFeedback = run([investment], { xinvest: 10 });
    const interest = withFeedback.paths.deltas.currentBudget['2029-30'] ?? 0;
    expect(interest).toBeGreaterThan(0);
    expect(interest).toBeLessThan(0.2 * tenth('2029-30'));
    const row = withFeedback.attribution.find((x) => x.code === 'xinvest');
    expect(row?.currentBudgetGbpm).toBeCloseTo(0, 6);
    expect(row?.psnbGbpm).toBeCloseTo(tenth('2029-30'), 6);
    expect(withFeedback.attribution.some((x) => x.kind === 'debtInterest')).toBe(true);
  });

  it('scales a receipts line into receipts, in cash, with nothing on the spending side', () => {
    const line = ds.vintage.fiscal.receiptsByTax?.businessRates?.values ?? {};
    const at = (y: string) => line[y] ?? Number.NaN;
    const rates = share(
      'xrates',
      { from: 'vintage', series: 'receiptsByTax.businessRates' },
      { category: 'tax', classification: { side: 'receipts' } },
    );
    const path = baselinePath(rates, ds.vintage, policyYears);
    expect(path.values['2029-30']).toBe(at('2029-30'));
    expect(path.extendedFrom).toBeUndefined();
    expect(path.steps[0]?.formula).toContain('businessRates receipts');

    const e = effectOf(rates, 10);
    expect(e.badge).toBe('mechanical');
    expect(e.receipts['2026-27']).toBe(0);
    expect(e.receipts['2027-28']).toBeCloseTo(0.1 * at('2027-28'), 6);
    expect(e.receipts['2029-30']).toBeCloseTo(0.1 * at('2029-30'), 6);
    expect(e.receipts['2030-31']).toBeCloseTo(0.1 * at('2030-31'), 6);
    expect(Object.values(e.currentSpending).every((v) => v === 0)).toBe(true);
    expect(Object.values(e.capitalSpending).every((v) => v === 0)).toBe(true);
    expect(Object.values(e.welfareInCap).every((v) => v === 0)).toBe(true);
    expect(e.detail?.baseline?.['2029-30']).toBe(at('2029-30'));
    expect(effectOf(rates, -5).receipts['2029-30']).toBeCloseTo(-0.05 * at('2029-30'), 6);
    // A receipts lever cuts the current budget deficit by its receipts, before interest.
    const noFeedback = run([rates], { xrates: 10 }, { debtInterestFeedback: false });
    expect(noFeedback.paths.deltas.currentBudget['2029-30']).toBeCloseTo(-0.1 * at('2029-30'), 6);
    expect(noFeedback.paths.deltas.borrowing['2029-30']).toBeCloseTo(-0.1 * at('2029-30'), 6);
  });

  it('ties the baseline line to the side of the lever', () => {
    const receiptsLine = { from: 'vintage', series: 'receiptsByTax.businessRates' };
    const receipts = { category: 'tax' as const, classification: { side: 'receipts' as const } };
    expect(() => share('xok', receiptsLine, receipts)).not.toThrow();
    expect(() => share('xwrong', receiptsLine)).toThrow(/receipts line/);
    expect(() => share('xwrong', { from: 'vintage', series: 'cdel' }, receipts)).toThrow(
      /spending line/,
    );
    expect(() => share('xwrong', published(PLAN), receipts)).toThrow(
      /published plan is a spending baseline/,
    );
  });

  it('scales a welfare line from the forecast, and moves the cap only for a line inside it', () => {
    const welfare = (code: string, series: string, insideWelfareCap: boolean) =>
      share(
        code,
        { from: 'vintage', series },
        { category: 'welfare', classification: { side: 'spending', insideWelfareCap } },
      );
    const pensions = welfare('xpens', 'pensionerSpending', false);
    const disability = welfare('xdis', 'disabilityBenefits', true);
    const line = (series: string) => headSeries(ds.vintage, series as 'pensionerSpending');
    const pens = effectOf(pensions, 1);
    expect(pens.currentSpending['2029-30']).toBeCloseTo(
      0.01 * (line('pensionerSpending')['2029-30'] ?? Number.NaN),
      6,
    );
    expect(pens.welfareInCap['2029-30']).toBe(0);
    const dis = effectOf(disability, -10);
    const cut = -0.1 * (line('disabilityBenefits')['2029-30'] ?? Number.NaN);
    expect(dis.currentSpending['2029-30']).toBeCloseTo(cut, 6);
    expect(dis.welfareInCap['2029-30']).toBeCloseTo(cut, 6);
    expect(dis.detail?.extendedFrom).toBeUndefined();
  });
});

describe('the all-other residual (ADR-0006)', () => {
  it('takes out of the published total exactly the departments that have levers of their own', () => {
    const rowsOf = (lever: Lever) =>
      lever.costing.kind === 'pctOfBaseline' &&
      lever.costing.baseline.from === 'published' &&
      lever.costing.baseline.rawSource.kind === 'hmtSr25'
        ? lever.costing.baseline.rawSource.rows
        : [];
    const residual = ds.levers.filter((l) => rowsOf(l).some((row) => row.role === 'subtract'));
    expect(residual).toHaveLength(1);
    const subtracted = rowsOf(residual[0]!)
      .filter((row) => row.role === 'subtract')
      .map((row) => row.rowId);
    const departments = ds.levers
      .filter((l) => !residual.includes(l) && !l.deprecated)
      .flatMap((l) => rowsOf(l).map((row) => row.rowId));
    expect([...subtracted].sort()).toEqual([...departments].sort());
  });
});
