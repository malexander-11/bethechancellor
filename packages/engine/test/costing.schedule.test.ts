import { describe, expect, it } from 'vitest';
import { computeOutcome, type Lever, type Settings } from '../src/index.js';
import { TOGGLE, loadDataset, syntheticLever } from './fixtures.js';

/**
 * Scheduled costings: a figure for each year as authored (a scorecard line reversed or repeated,
 * a stated sum), zero before the start year; or a single payment in the start year. The levers are
 * made up, with round numbers, so a real lever's re-costing never moves these.
 */
const ds = loadDataset();
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
const effectOf = (lever: Lever, settings: Partial<Settings> = {}) => {
  const e = run([lever], { [lever.code]: 1 }, settings).leverEffects.find(
    (x) => x.code === lever.code,
  );
  if (!e) throw new Error(`no effect for ${lever.code}`);
  return e;
};
const schedule = (
  code: string,
  effect: Record<string, number>,
  parts: Omit<Parameters<typeof syntheticLever>[0], 'code' | 'costing'> & { once?: boolean } = {},
) => {
  const { once, ...rest } = parts;
  return syntheticLever({
    code,
    control: TOGGLE,
    ...rest,
    costing: {
      kind: 'schedule',
      effect,
      ...(once ? { once } : {}),
      source: { sourceId: 'hmt-budget-2025-table-4-1' },
      caveats: [],
    },
  });
};
/** A measure reversed: a cost in each year, a little the other way at first. */
const REVERSAL = schedule('xundo', {
  '2026-27': -800,
  '2027-28': 30,
  '2028-29': -3655,
  '2029-30': -8395,
  '2030-31': -13360,
});

describe('scheduled costings', () => {
  it('applies each year’s figure as authored, from the start year', () => {
    const e = effectOf(REVERSAL);
    expect(e.receipts['2026-27']).toBe(0);
    expect(e.receipts['2027-28']).toBeCloseTo(30, 6);
    expect(e.receipts['2028-29']).toBeCloseTo(-3655, 6);
    expect(e.receipts['2029-30']).toBeCloseTo(-8395, 6);
    expect(e.receipts['2030-31']).toBeCloseTo(-13360, 6);
  });

  it('applies nothing before the start year, and the earlier figures from an earlier start', () => {
    expect(effectOf(REVERSAL).receipts['2026-27']).toBe(0);
    expect(effectOf(REVERSAL, { implementationYear: '2026-27' }).receipts['2026-27']).toBeCloseTo(
      -800,
      6,
    );
  });

  it('does nothing switched off, and adds up across measures switched on', () => {
    const others = [schedule('xone', { '2029-30': -2230 }), schedule('xtwo', { '2029-30': 850 })];
    const levers = [REVERSAL, ...others];
    expect(run(levers, { [REVERSAL.code]: 0 }).leverEffects).toHaveLength(0);
    const all = run(levers, Object.fromEntries(levers.map((l) => [l.code, 1])));
    const total = all.leverEffects.reduce((acc, e) => acc + (e.receipts['2029-30'] ?? 0), 0);
    expect(total).toBeCloseTo(-8395 - 2230 + 850, 6);
    expect(all.paths.deltas.receipts['2029-30']).toBeCloseTo(total, 6);
  });

  it('pays a one-off in the start year alone, and buys an asset without spending', () => {
    // Cash for an asset (ADR-0005): gilts to issue and interest to pay, but not expenditure.
    const purchase = schedule(
      'xbuy',
      { '2027-28': 100_000 },
      {
        category: 'spend',
        once: true,
        classification: { side: 'spending', psnflTreatment: 'financialTransaction' },
      },
    );
    const e = effectOf(purchase);
    expect(e.financialTransactions['2027-28']).toBe(100_000);
    expect(e.financialTransactions['2028-29']).toBe(0);
    expect(e.currentSpending['2027-28']).toBe(0);
    expect(e.capitalSpending['2027-28']).toBe(0);
    // A later start moves the whole payment with it.
    const later = effectOf(purchase, { implementationYear: '2028-29' });
    expect(later.financialTransactions['2028-29']).toBe(100_000);
    expect(later.financialTransactions['2027-28']).toBe(0);
    // Debt rises by the price; only the interest on it reaches borrowing.
    const outcome = run([purchase], { [purchase.code]: 1 });
    expect(outcome.paths.deltas.financialTransactions['2027-28']).toBe(100_000);
    const borrowing =
      (outcome.paths.policy.psnb['2029-30'] ?? 0) - (outcome.paths.baseline.psnb['2029-30'] ?? 0);
    expect(borrowing).toBeGreaterThan(0);
    expect(borrowing).toBeLessThan(0.1 * 100_000);
  });

  it('splits spending between day-to-day and investment by its capital share', () => {
    const programme = schedule(
      'xsplit',
      { '2029-30': 1000 },
      { category: 'spend', classification: { side: 'spending', capitalShare: 0.43 } },
    );
    const e = effectOf(programme);
    expect(e.capitalSpending['2029-30']).toBeCloseTo(430, 6);
    expect(e.currentSpending['2029-30']).toBeCloseTo(570, 6);
    expect(e.receipts['2029-30']).toBe(0);
  });

  it('counts welfare against the cap only when it is classified inside it', () => {
    const inside = schedule(
      'xcap',
      { '2029-30': -3000 },
      { category: 'welfare', classification: { side: 'spending', insideWelfareCap: true } },
    );
    const outside = schedule(
      'xout',
      { '2029-30': 3950 },
      { category: 'spend', classification: { side: 'spending' } },
    );
    expect(effectOf(inside).currentSpending['2029-30']).toBeCloseTo(-3000, 6);
    expect(effectOf(inside).welfareInCap['2029-30']).toBeCloseTo(-3000, 6);
    expect(effectOf(outside).currentSpending['2029-30']).toBeCloseTo(3950, 6);
    expect(effectOf(outside).welfareInCap['2029-30']).toBe(0);
    const row = run([outside], { [outside.code]: 1 }).attribution.find((r) => r.code === 'xout');
    expect(row?.currentBudgetGbpm).toBeCloseTo(3950, 6);
  });
});
