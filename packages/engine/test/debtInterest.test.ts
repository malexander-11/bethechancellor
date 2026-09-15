import { describe, expect, it } from 'vitest';
import { applyDebtInterestFeedback } from '../src/index.js';

describe('debt interest on extra borrowing (ADR-0005)', () => {
  const primary = [10000, 10000, 10000, 10000, 10000];
  const rates = [0.045, 0.045, 0.045, 0.045, 0.045];

  it('reproduces the worked example: £10bn a year at 4.5% with a half-year convention', () => {
    const r = applyDebtInterestFeedback(primary, rates, true);
    const bn = r.borrowing.map((v) => v / 1000);
    [10.23, 10.701, 11.194, 11.709, 12.248].forEach((expected, i) => {
      expect(bn[i]).toBeCloseTo(expected, 2);
    });
    r.interest.forEach((v, i) => expect(v).toBeCloseTo((r.borrowing[i] ?? 0) - 10000, 9));
    expect(r.extraDebt[4]).toBeCloseTo(
      r.borrowing.reduce((a, b) => a + b, 0),
      9,
    );
  });

  it('returns the primary path when disabled or at a zero rate', () => {
    expect(applyDebtInterestFeedback(primary, rates, false).borrowing).toEqual(primary);
    expect(applyDebtInterestFeedback(primary, rates, false).interest).toEqual([0, 0, 0, 0, 0]);
    expect(applyDebtInterestFeedback(primary, [0, 0, 0, 0, 0], true).borrowing).toEqual(primary);
  });

  it('charges interest on savings too: negative primary borrowing lowers interest', () => {
    const r = applyDebtInterestFeedback([-10000, -10000], [0.045, 0.045], true);
    expect(r.interest[0]).toBeLessThan(0);
    expect(r.borrowing[1]).toBeLessThan(-10000);
  });
});
