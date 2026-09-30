import { describe, expect, it } from 'vitest';
import {
  formatGbpBn,
  fromForecast,
  optionPrice,
  preBudget,
  preBudgetValues,
  priceMove,
  reconcile,
  type Outcome,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  DEFENCE_GAP,
  FRONT_LOADED,
  HEALTH_ABOVE_PLAN,
  INVESTMENT,
  PENNY,
  WALK,
  todaysEstimate,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });
const headroom = (o: Outcome, kind: 'currentBudget' | 'stockFalling' = 'currentBudget') =>
  o.verdicts.find((v) => v.kind === kind)?.headroomGbpm ?? Number.NaN;
const price = (values: Budget, current: Budget = {}) =>
  optionPrice({
    outcomeOf,
    levers: ds.levers,
    current: { ...ESTIMATE, ...current },
    values,
  });

describe('one price per choice (Phase 25)', () => {
  it('is the change to the bar, interest included, so the price and what it leaves add up', () => {
    const gap = price(DEFENCE_GAP);
    const before = headroom(outcomeOf(ESTIMATE));
    const after = headroom(outcomeOf({ ...ESTIMATE, ...DEFENCE_GAP }));
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
    const off = price(DEFENCE_GAP);
    const on = optionPrice({
      outcomeOf,
      levers: ds.levers,
      current: { ...ESTIMATE, ...DEFENCE_GAP },
      values: DEFENCE_GAP,
      on: true,
    });
    expect(on.headroomChangeGbpm).toBeCloseTo(off.headroomChangeGbpm, 6);
  });

  it('prices investment on its own against the debt rule, which it touches', () => {
    const invest = price(INVESTMENT);
    expect(invest.rule).toBe('stockFalling');
    const before = headroom(outcomeOf(ESTIMATE), 'stockFalling');
    const after = headroom(outcomeOf({ ...ESTIMATE, ...INVESTMENT }), 'stockFalling');
    expect(invest.headroomChangeGbpm).toBeCloseTo(after - before, 6);
    expect(invest.headroomChangeGbpm).toBeLessThan(-10_000);
    // The day-to-day rule barely moves: interest only.
    expect(invest.split.currentGbpm).toBeCloseTo(0, 6);
  });

  it('says when an earlier year costs well above the target year', () => {
    const now = price(FRONT_LOADED);
    expect(now.earlier?.year).toBe('2027-28');
    expect(now.earlier?.costGbpm).toBeGreaterThan(
      1.5 * (now.split.currentGbpm + now.split.capitalGbpm),
    );
    // A steady cost is not front-loaded.
    expect(price(DEFENCE_GAP).earlier).toBeUndefined();
  });

  it('prices a swap with the option it replaces put back, never both at once', () => {
    const current = DEFENCE_GAP;
    const swap = optionPrice({
      outcomeOf,
      levers: ds.levers,
      current: { ...ESTIMATE, ...current },
      values: FRONT_LOADED,
      swapOut: Object.fromEntries(Object.keys(current).map((code) => [code, 0])),
    });
    expect(swap.headroomGbpm).toBeCloseTo(headroom(outcomeOf({ ...ESTIMATE, ...FRONT_LOADED })), 6);
    const both = price(FRONT_LOADED, current);
    expect(both.headroomGbpm).toBeLessThan(swap.headroomGbpm);
  });

  it('names the first year a move does anything, when it does nothing in the target year', () => {
    const later = price({ uitime: 1 });
    expect(Math.abs(later.headroomChangeGbpm)).toBeLessThan(50);
    expect(later.laterStart).toBe('2030-31');
    expect(later.laterCostGbpm).toBeLessThan(-1000);
  });

  it('prices any move, not only an option: a lever back to its default is the move undone', () => {
    const from = { ...ESTIMATE, ...PENNY };
    const undo = priceMove({ outcomeOf, levers: ds.levers, from, to: ESTIMATE });
    const make = priceMove({ outcomeOf, levers: ds.levers, from: ESTIMATE, to: from });
    expect(undo.headroomChangeGbpm).toBeCloseTo(-make.headroomChangeGbpm, 6);
  });
});

describe('the review adds up (Phase 25)', () => {
  const budgets: Record<string, Budget> = {
    walk: WALK,
    'welfare savings': { rvpip: 1, csjmh: 1 },
    'investment alone': INVESTMENT,
    'a front-loaded rise': FRONT_LOADED,
    nothing: {},
  };

  it('starts from the estimate before any measure: the macro settings alone', () => {
    expect(preBudgetValues({ ...ESTIMATE, ...PENNY, ...HEALTH_ABOVE_PLAN }, ds.levers)).toEqual(
      ESTIMATE,
    );
    const pre = preBudget(outcomeOf, { ...ESTIMATE, ...PENNY }, ds.levers);
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
    const walk = reconcile(outcomeOf({ ...ESTIMATE, ...WALK }), outcomeOf(ESTIMATE));
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

describe('from the March forecast to today’s estimate (Phase 28)', () => {
  // The March forecast's own headroom, with the tolerance the vintage checks it to.
  const check = ds.vintage.checks.stabilityHeadroomGbpm;

  it('is the OBR’s March figure, less what rates and prices do, coming to the estimate', () => {
    const f = fromForecast(outcomeOf(ESTIMATE));
    expect(f.year).toBe('2029-30');
    expect(f.year).toBe(check.year);
    // The March forecast, as the vintage checks it: what earns the Official figure badge.
    expect(Math.abs(f.forecastGbpm - check.value)).toBeLessThanOrEqual(check.toleranceGbpm);
    // Dearer borrowing and dearer prices, each the OBR's own sensitivity on today's settings.
    expect(f.steps.map((s) => s.code)).toEqual(['rate', 'rpi']);
    expect(f.steps[0]?.headroomGbpm).toBeCloseTo(-11_250, 6);
    expect(f.steps[1]?.headroomGbpm).toBeCloseTo(-5_500, 6);
    for (const step of f.steps) expect(step.badge).toBe('assumption');
    // Exactly, and as the page shows them: 23.6 − 11.3 − 5.5 = 6.8.
    const sum = f.forecastGbpm + f.steps.reduce((a, s) => a + s.headroomGbpm, 0);
    expect(sum).toBeCloseTo(f.estimateGbpm, 6);
    expect(f.estimateGbpm).toBeCloseTo(headroom(outcomeOf(ESTIMATE)), 6);
    const shown = (gbpm: number) => Number(formatGbpBn(gbpm, 1).replace(/[^\d.]/g, ''));
    const signed = (gbpm: number) => Math.sign(gbpm) * shown(gbpm);
    expect(
      signed(f.forecastGbpm) + f.steps.reduce((a, s) => a + signed(s.headroomGbpm), 0),
    ).toBeCloseTo(signed(f.estimateGbpm), 9);
    expect(formatGbpBn(f.estimateGbpm, 1)).toBe('£6.8bn');
  });

  it('has no steps with nothing set, and one for each setting that moves', () => {
    const march = fromForecast(outcomeOf({}));
    expect(march.steps).toEqual([]);
    expect(march.estimateGbpm).toBeCloseTo(march.forecastGbpm, 6);
    // Slower growth too: three steps, still adding up exactly.
    const three = fromForecast(outcomeOf({ ...ESTIMATE, ngdp: -0.1 }));
    expect(three.steps.map((s) => s.code).sort()).toEqual(['ngdp', 'rate', 'rpi']);
    expect(three.forecastGbpm + three.steps.reduce((a, s) => a + s.headroomGbpm, 0)).toBeCloseTo(
      three.estimateGbpm,
      6,
    );
    expect(three.estimateGbpm).toBeLessThan(fromForecast(outcomeOf(ESTIMATE)).estimateGbpm);
  });
});
