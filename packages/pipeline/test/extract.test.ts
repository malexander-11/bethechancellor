import { describe, expect, it } from 'vitest';
import { extractBudget2025Scorecard } from '../src/extract-budget-2025-scorecard.js';
import { extractHmrcReadyReckoner, slugify } from '../src/extract-hmrc-trr.js';

describe('HMRC ready reckoner extraction', () => {
  const extract = extractHmrcReadyReckoner();

  it('reads the three fiscal-year columns and the published rows', () => {
    expect(extract.years).toEqual(['2026-27', '2027-28', '2028-29']);
    expect(extract.rows.length).toBeGreaterThan(60);
    const basic = extract.rows.find((r) => r.rowId === 'income-tax-rates--change-basic-rate-by-1p');
    expect(basic?.section).toBe('Income Tax rates');
    expect(basic?.values).toEqual({ '2026-27': 6900, '2027-28': 8250, '2028-29': 8200 });
  });

  it('keeps negligible values as null with a flag and preserves negative yields', () => {
    const starting = extract.rows.find(
      (r) =>
        r.rowId === 'income-tax-limits--change-starting-rate-limit-for-savings-income-by-gbp-100',
    );
    expect(starting?.values['2026-27']).toBeNull();
    expect(starting?.negligible['2026-27']).toBe(true);
    const cgt = extract.rows.find(
      (r) =>
        r.rowId ===
        'capital-gains-tax--increase-higher-capital-gains-tax-rate-by-10-percentage-points',
    );
    expect(cgt?.values).toEqual({ '2026-27': -540, '2027-28': -2060, '2028-29': -3565 });
  });

  it('slugifies labels deterministically', () => {
    expect(slugify('Cut residential 5% marginal rate by 1 percentage point (Cost)')).toBe(
      'cut-residential-5-pct-marginal-rate-by-1-percentage-point-cost',
    );
    expect(slugify('Change personal allowance by £100')).toBe(
      'change-personal-allowance-by-gbp-100',
    );
  });
});

describe('Budget 2025 scorecard extraction', () => {
  it('reads all 88 measures with HMT sign convention', async () => {
    const extract = await extractBudget2025Scorecard();
    expect(extract.years).toEqual([
      '2025-26',
      '2026-27',
      '2027-28',
      '2028-29',
      '2029-30',
      '2030-31',
    ]);
    expect(extract.measures).toHaveLength(88);
    const freeze = extract.measures.find((m) => m.number === 46);
    expect(freeze?.type).toBe('Tax');
    expect(freeze?.title.startsWith('Personal Tax: Maintain the personal income tax')).toBe(true);
    expect(freeze?.values).toEqual({
      '2025-26': 0,
      '2026-27': 0,
      '2027-28': -25,
      '2028-29': 3365,
      '2029-30': 7780,
      '2030-31': 12435,
    });
  });
});
