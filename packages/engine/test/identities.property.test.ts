import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { policyYearsOf, runFiscalArithmetic, type Deltas } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const { vintage } = loadDataset();
const years = policyYearsOf(vintage);

const yearValues = (arb: fc.Arbitrary<number>) =>
  fc
    .array(arb, { minLength: years.length, maxLength: years.length })
    .map((arr) => Object.fromEntries(years.map((y, i) => [y, arr[i] ?? 0])));

const money = fc.integer({ min: -60000, max: 60000 });
const deltasArb: fc.Arbitrary<Deltas> = fc
  .record({
    receipts: yearValues(money),
    currentSpending: yearValues(money),
    capitalSpending: yearValues(money),
    welfareInCap: yearValues(money),
    financialTransactions: yearValues(fc.integer({ min: 0, max: 60000 })),
    macroPsnb: yearValues(money),
    share: fc.double({ min: 0, max: 1, noNaN: true }),
  })
  .map(({ share, ...rest }) => ({
    ...rest,
    macroCurrent: Object.fromEntries(years.map((y) => [y, (rest.macroPsnb[y] ?? 0) * share])),
  }));

function run(deltas: Deltas, feedback: boolean, growth = 0, rateAdj = 0) {
  return runFiscalArithmetic({
    vintage,
    deltas,
    growthAdjPp: growth,
    marginalRateAdjPp: rateAdj,
    debtInterestFeedback: feedback,
  });
}

describe('accounting identities hold for arbitrary lever vectors', () => {
  it('PSNFL change minus PSNB equals the baseline other flows in every year', () => {
    fc.assert(
      fc.property(deltasArb, fc.boolean(), (deltas, feedback) => {
        const p = run(deltas, feedback);
        for (let i = 1; i < p.years.length; i += 1) {
          const y = p.years[i] ?? '';
          const prev = p.years[i - 1] ?? '';
          const policyFlow =
            (p.policy.psnfl[y] ?? 0) - (p.policy.psnfl[prev] ?? 0) - (p.policy.psnb[y] ?? 0);
          const baseFlow =
            (p.baseline.psnfl[y] ?? 0) - (p.baseline.psnfl[prev] ?? 0) - (p.baseline.psnb[y] ?? 0);
          expect(policyFlow).toBeCloseTo(baseFlow, 6);
        }
      }),
    );
  });

  it('without feedback: receipts hit the current budget one-for-one, capital hits borrowing only', () => {
    fc.assert(
      fc.property(deltasArb, (deltas) => {
        const p = run(deltas, false);
        for (const y of years) {
          const expectedCb =
            (deltas.currentSpending[y] ?? 0) -
            (deltas.receipts[y] ?? 0) +
            (deltas.macroCurrent[y] ?? 0);
          const expectedPsnb =
            (deltas.currentSpending[y] ?? 0) +
            (deltas.capitalSpending[y] ?? 0) -
            (deltas.receipts[y] ?? 0) +
            (deltas.macroPsnb[y] ?? 0);
          expect(p.deltas.currentBudget[y]).toBeCloseTo(expectedCb, 6);
          expect(p.deltas.borrowing[y]).toBeCloseTo(expectedPsnb, 6);
          expect(p.deltas.debtInterest[y]).toBe(0);
        }
      }),
    );
  });

  it('current budget deficit always equals PSNB minus PSNI', () => {
    fc.assert(
      fc.property(deltasArb, fc.boolean(), (deltas, feedback) => {
        const p = run(deltas, feedback);
        for (const y of years) {
          expect((p.policy.psnb[y] ?? 0) - (p.policy.psni[y] ?? 0)).toBeCloseTo(
            p.policy.currentBudgetDeficit[y] ?? 0,
            6,
          );
        }
      }),
    );
  });

  it('with feedback: extra spending accrues non-negative interest that grows over time', () => {
    const nonNegative = fc.integer({ min: 0, max: 60000 });
    const spendOnly = fc
      .record({
        currentSpending: yearValues(nonNegative),
        capitalSpending: yearValues(nonNegative),
      })
      .map((d) => ({
        ...d,
        receipts: Object.fromEntries(years.map((y) => [y, 0])),
        welfareInCap: Object.fromEntries(years.map((y) => [y, 0])),
        financialTransactions: Object.fromEntries(years.map((y) => [y, 0])),
        macroPsnb: Object.fromEntries(years.map((y) => [y, 0])),
        macroCurrent: Object.fromEntries(years.map((y) => [y, 0])),
      }));
    fc.assert(
      fc.property(spendOnly, (deltas) => {
        const p = run(deltas, true);
        let last = 0;
        for (const y of years) {
          const interest = p.deltas.debtInterest[y] ?? 0;
          expect(interest).toBeGreaterThanOrEqual(0);
          expect(interest).toBeGreaterThanOrEqual(last - 1e-9);
          expect(p.deltas.borrowing[y]).toBeGreaterThanOrEqual(p.deltas.primaryBorrowing[y] ?? 0);
          last = interest;
        }
      }),
    );
  });

  it('a growth adjustment changes ratios only through the denominators', () => {
    fc.assert(
      fc.property(fc.double({ min: -0.5, max: 0.5, noNaN: true }), (g) => {
        const zero: Deltas = {
          receipts: {},
          currentSpending: {},
          capitalSpending: {},
          welfareInCap: {},
          financialTransactions: {},
          macroPsnb: {},
          macroCurrent: {},
        };
        const p = run(zero, true, g);
        expect(p.policy.psnb).toEqual(p.baseline.psnb);
        const last = years[years.length - 1] ?? '';
        const factor = (1 + g / 100) ** vintage.years.forecast.length;
        expect(
          (p.policy.nominalGdpFy[last] ?? 0) / (p.baseline.nominalGdpFy[last] ?? 1),
        ).toBeCloseTo(factor, 9);
        expect(p.policy.nominalGdpFy[vintage.years.inYear]).toBe(
          p.baseline.nominalGdpFy[vintage.years.inYear],
        );
      }),
    );
  });
});
