import { describe, expect, it } from 'vitest';
import {
  THIN_HEADROOM_GBPM,
  ambitionStatus,
  isMissed,
  priceMove,
  promiseBreaks,
  promiseStrains,
  type Outcome,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  BIG_BROAD_TAX_RISE,
  CORPORATION_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  DEBT_RULE_MISSED,
  DEFENCE_GAP,
  EMPLOYER_NICS,
  ESTATES_AND_HOMES_PAY,
  EVERYTHING_EXPENSIVE,
  FRONT_LOADED,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  INVESTMENT,
  INVESTMENT_WITHIN_RULES,
  MOVES,
  NEEDED_LOCK_BREAK,
  NHS_START,
  NICS_WALK,
  PENNY,
  PRISONS,
  SECURITY,
  SECURITY_FLAGSHIPS,
  TAXES_AT_THE_TOP,
  TWO_CHILD_LIMIT,
  WALK,
  gameWith,
  latestContext,
  todaysEstimate,
  type Budget,
} from './scenarios.js';

/**
 * Each named Budget still plays the part its name says, on today's estimate. When the data
 * changes under one, this is where it fails, and scenarios.ts is where it is mended.
 */
const ds = loadDataset();
const estimate = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds);
const run = (budget: Budget): Outcome => outcomeOf({ ...estimate, ...budget });
const broken = (budget: Budget) =>
  promiseBreaks(budget, ds.pm.promises, ds.levers)
    .filter((r) => !r.kept)
    .map((r) => r.promise.id);
const strained = (budget: Budget) =>
  promiseStrains(budget, ds.pm.promises, ds.levers)
    .filter((r) => r.strained)
    .map((r) => r.promise.id);
const missed = (budget: Budget) =>
  run(budget)
    .verdicts.filter(isMissed)
    .map((v) => v.kind);
const headroom = (budget: Budget) =>
  run(budget).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? Number.NaN;
const fates = (priorities: readonly string[], budget: Budget) =>
  ambitionStatus(gameWith(priorities), ds.pm, ds.options, run(budget), ds.levers).priorities.map(
    (p) => p.status,
  );
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`no lever ${code}`);
  return found;
};

describe('the named Budgets play their parts', () => {
  it('the walk delivers both security priorities inside the rules, and breaks the tax lock', () => {
    expect(fates(SECURITY, WALK)).toEqual(['delivered', 'delivered']);
    expect(missed(WALK)).toEqual([]);
    expect(broken(WALK)).toEqual(['tax-lock']);
    // Paid for by employer National Insurance alone, the lock is strained, not broken.
    expect(fates(SECURITY, NICS_WALK)).toEqual(['delivered', 'delivered']);
    expect(missed(NICS_WALK)).toEqual([]);
    expect(broken(NICS_WALK)).toEqual([]);
    expect(strained(NICS_WALK)).toContain('tax-lock');
  });

  it('each flagship delivers its priority, and a down-payment only makes a start', () => {
    expect(fates(['defence'], DEFENCE_GAP)).toEqual(['delivered']);
    expect(fates(['safer-streets'], PRISONS)).toEqual(['delivered']);
    expect(fates(SECURITY, PRISONS)).toEqual(['notFunded', 'delivered']);
    expect(fates(SECURITY, SECURITY_FLAGSHIPS)).toEqual(['delivered', 'delivered']);
    expect(fates(['nhs'], HEALTH_ABOVE_PLAN)).toEqual(['delivered']);
    expect(fates(['nhs'], NHS_START)).toEqual(['started']);
    // Prisons paid for out of the headroom leave a thin margin, every rule still met.
    expect(missed(PRISONS)).toEqual([]);
    expect(headroom(PRISONS)).toBeGreaterThan(0);
    expect(headroom(PRISONS)).toBeLessThan(THIN_HEADROOM_GBPM);
  });

  it('the penny breaks the tax lock on a certified row; employer National Insurance strains it', () => {
    expect(broken(PENNY)).toEqual(['tax-lock']);
    for (const code of Object.keys(PENNY)) {
      expect(lever(code).badge, code).toBe('direct');
      expect(lever(code).earliestStart, code).toBeUndefined();
    }
    expect(broken(EMPLOYER_NICS)).toEqual([]);
    expect(strained(EMPLOYER_NICS)).toEqual(['tax-lock']);
    // Health above its plan needs the penny to meet the rules: a break the rules needed.
    expect(missed(HEALTH_ABOVE_PLAN)).toContain('currentBudget');
    expect(missed(NEEDED_LOCK_BREAK)).toEqual([]);
    expect(broken(NEEDED_LOCK_BREAK)).toEqual(['tax-lock']);
    // Two points of it are a big broad rise on a certified row: more headroom than March left.
    expect(broken(BIG_BROAD_TAX_RISE)).toEqual([]);
    expect(strained(BIG_BROAD_TAX_RISE)).toEqual(['tax-lock']);
    for (const code of Object.keys(BIG_BROAD_TAX_RISE)) expect(lever(code).badge).toBe('direct');
    const march = outcomeOf({}).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm;
    expect(headroom(BIG_BROAD_TAX_RISE)).toBeGreaterThan(march ?? Number.NaN);
  });

  it('taxes on estates and home buyers break no promise; a cut for everyone is borrowed past the rules', () => {
    expect(broken(ESTATES_AND_HOMES_PAY)).toEqual([]);
    expect(strained(ESTATES_AND_HOMES_PAY)).toEqual([]);
    expect(headroom(ESTATES_AND_HOMES_PAY)).toBeGreaterThan(headroom({}));
    expect(broken(BASIC_RATE_CUT)).toEqual([]);
    expect(missed(BASIC_RATE_CUT).length).toBeGreaterThan(0);
    // The top rate and a wealth tax fall on the best-off; a point on corporation tax on business,
    // breaking the manifesto's cap.
    for (const code of Object.keys(TAXES_AT_THE_TOP)) {
      expect(ds.incidence.levers[code], code).toBe('top');
    }
    expect(broken(TAXES_AT_THE_TOP)).toEqual([]);
    for (const code of Object.keys(CORPORATION_TAX_RISE)) {
      expect(ds.incidence.levers[code], code).toBe('business');
    }
    expect(broken(CORPORATION_TAX_RISE)).toEqual(['ct-cap']);
  });

  it('a cut to health keeps the rules; the two-child limit breaks a promise of the last Budget', () => {
    expect(missed(HEALTH_CUT)).toEqual([]);
    expect(broken(HEALTH_CUT)).toEqual([]);
    expect(headroom(HEALTH_CUT)).toBeGreaterThan(headroom({}));
    expect(broken(TWO_CHILD_LIMIT)).toEqual(['two-child']);
    expect(ds.pm.promises.find((p) => p.id === 'two-child')?.origin).toBe('budget-2025');
  });

  it('each rule miss misses its own rule, and investment is all capital', () => {
    expect(missed(INVESTMENT_WITHIN_RULES)).toEqual([]);
    expect(missed(DEBT_RULE_MISSED)).toEqual(['stockFalling']);
    expect(missed(DAY_TO_DAY_RULE_MISSED)).toContain('currentBudget');
    expect(missed(EVERYTHING_EXPENSIVE)).toContain('currentBudget');
    for (const budget of [INVESTMENT_WITHIN_RULES, INVESTMENT, DEBT_RULE_MISSED]) {
      for (const code of Object.keys(budget)) {
        expect(lever(code).classification?.currentOrCapital, code).toBe('capital');
      }
    }
  });

  it('the front-loaded rise costs more in an earlier year than in the target year', () => {
    const price = priceMove({
      outcomeOf,
      levers: ds.levers,
      from: estimate,
      to: { ...estimate, ...FRONT_LOADED },
    });
    expect(price.earlier).toBeDefined();
  });

  it('the moves name only levers the data has, each off where it rests', () => {
    for (const move of MOVES) {
      for (const [code, value] of Object.entries(move)) {
        expect(value, code).not.toBe(lever(code).control.default);
      }
    }
    expect(latestContext(ds).readings.length).toBeGreaterThan(0);
  });
});
