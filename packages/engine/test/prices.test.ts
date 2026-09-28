import { describe, expect, it } from 'vitest';
import {
  optionPrice,
  preBudget,
  preBudgetValues,
  priceMove,
  reconcile,
  suggestedSettings,
  type Outcome,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = suggestedSettings(context.readings, ds.levers);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });
const headroom = (o: Outcome, kind: 'currentBudget' | 'stockFalling' = 'currentBudget') =>
  o.verdicts.find((v) => v.kind === kind)?.headroomGbpm ?? Number.NaN;
const price = (values: Record<string, number>, current: Record<string, number> = {}) =>
  optionPrice({
    outcomeOf,
    levers: ds.levers,
    current: { ...ESTIMATE, ...current },
    values,
  });

describe('one price per choice (Phase 25)', () => {
  it('is the change to the bar, interest included, so the price and what it leaves add up', () => {
    const gap = price({ dip47: 1 });
    const before = headroom(outcomeOf(ESTIMATE));
    const after = headroom(outcomeOf({ ...ESTIMATE, dip47: 1 }));
    expect(gap.rule).toBe('currentBudget');
    expect(gap.headroomChangeGbpm).toBeCloseTo(after - before, 6);
    expect(gap.headroomGbpm).toBeCloseTo(after, 6);
    // The split: day-to-day, investment and interest. Only day-to-day and interest touch this rule.
    expect(gap.split.currentGbpm).toBeGreaterThan(600);
    expect(gap.split.capitalGbpm).toBeGreaterThan(400);
    expect(gap.split.interestGbpm).toBeGreaterThan(0);
    expect(gap.headroomChangeGbpm).toBeCloseTo(
      -(gap.split.currentGbpm + gap.split.interestGbpm),
      6,
    );
    // More than the day-to-day cost alone, which is what a card used to show.
    expect(-gap.headroomChangeGbpm).toBeGreaterThan(gap.split.currentGbpm);
  });

  it('prices a chosen option as what it is doing: the same figure as choosing it', () => {
    const off = price({ dip47: 1 });
    const on = optionPrice({
      outcomeOf,
      levers: ds.levers,
      current: { ...ESTIMATE, dip47: 1 },
      values: { dip47: 1 },
      on: true,
    });
    expect(on.headroomChangeGbpm).toBeCloseTo(off.headroomChangeGbpm, 6);
  });

  it('prices investment on its own against the debt rule, which it touches', () => {
    const invest = price({ cdel: 10 });
    expect(invest.rule).toBe('stockFalling');
    const before = headroom(outcomeOf(ESTIMATE), 'stockFalling');
    const after = headroom(outcomeOf({ ...ESTIMATE, cdel: 10 }), 'stockFalling');
    expect(invest.headroomChangeGbpm).toBeCloseTo(after - before, 6);
    expect(invest.headroomChangeGbpm).toBeLessThan(-10_000);
    // The day-to-day rule barely moves: interest only.
    expect(invest.split.currentGbpm).toBeCloseTo(0, 6);
  });

  it('says when an earlier year costs well above the target year', () => {
    const now = price({ def3: 1 });
    expect(now.earlier?.year).toBe('2027-28');
    expect(now.earlier?.costGbpm).toBeGreaterThan(
      1.5 * (now.split.currentGbpm + now.split.capitalGbpm),
    );
    // A steady cost is not front-loaded.
    expect(price({ dip47: 1 }).earlier).toBeUndefined();
  });

  it('prices a swap with the option it replaces put back, never both at once', () => {
    const current = { dip47: 1 };
    const swap = optionPrice({
      outcomeOf,
      levers: ds.levers,
      current: { ...ESTIMATE, ...current },
      values: { def3: 1 },
      swapOut: { dip47: 0 },
    });
    expect(swap.headroomGbpm).toBeCloseTo(headroom(outcomeOf({ ...ESTIMATE, def3: 1 })), 6);
    const both = price({ def3: 1 }, current);
    expect(both.headroomGbpm).toBeLessThan(swap.headroomGbpm);
  });

  it('names the first year a move does anything, when it does nothing in the target year', () => {
    const later = price({ uitime: 1 });
    expect(Math.abs(later.headroomChangeGbpm)).toBeLessThan(50);
    expect(later.laterStart).toBe('2030-31');
    expect(later.laterCostGbpm).toBeLessThan(-1000);
  });

  it('prices any move, not only an option: a lever back to its default is the move undone', () => {
    const from = { ...ESTIMATE, itbr: 1 };
    const undo = priceMove({ outcomeOf, levers: ds.levers, from, to: ESTIMATE });
    const make = priceMove({ outcomeOf, levers: ds.levers, from: ESTIMATE, to: from });
    expect(undo.headroomChangeGbpm).toBeCloseTo(-make.headroomChangeGbpm, 6);
  });
});

describe('the review adds up (Phase 25)', () => {
  const budgets: Record<string, Record<string, number>> = {
    walk: { dip47: 1, moj: 10, hscl: 1, itbr: 1, ipt: 2, dhsc: -0.5 },
    'welfare savings': { rvpip: 1, csjmh: 1 },
    'investment alone': { cdel: 10 },
    'a front-loaded rise': { def3: 1 },
    nothing: {},
  };

  it('starts from the estimate before any measure: the macro settings alone', () => {
    expect(preBudgetValues({ ...ESTIMATE, itbr: 1, dhsc: 3 }, ds.levers)).toEqual(ESTIMATE);
    const pre = preBudget(outcomeOf, { ...ESTIMATE, itbr: 1 }, ds.levers);
    expect(headroom(pre)).toBeCloseTo(headroom(outcomeOf(ESTIMATE)), 6);
  });

  it('goes from the estimate to the bar through taxes, spending and interest, exactly', () => {
    for (const [name, policy] of Object.entries(budgets)) {
      const values = { ...ESTIMATE, ...policy };
      const outcome = outcomeOf(values);
      const r = reconcile(outcome, preBudget(outcomeOf, values, ds.levers));
      expect(r.endGbpm, name).toBeCloseTo(headroom(outcome), 6);
      expect(r.startGbpm + r.taxesGbpm - r.spendingGbpm - r.interestGbpm, name).toBeCloseTo(
        r.endGbpm,
        6,
      );
    }
    const walk = reconcile(outcomeOf({ ...ESTIMATE, ...budgets.walk }), outcomeOf(ESTIMATE));
    expect(walk.startGbpm).toBeCloseTo(6850, -1);
    expect(walk.taxesGbpm).toBeGreaterThan(30_000);
    // Less borrowing saves interest; savings read as negative spending.
    expect(walk.interestGbpm).toBeLessThan(0);
    const saved = reconcile(
      outcomeOf({ ...ESTIMATE, ...budgets['welfare savings'] }),
      outcomeOf(ESTIMATE),
    );
    expect(saved.spendingGbpm).toBeLessThan(0);
    expect(saved.taxesGbpm).toBe(0);
  });
});
