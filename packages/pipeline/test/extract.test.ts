import { describe, expect, it } from 'vitest';
import { extractBudget2025Scorecard } from '../src/extract-budget-2025-scorecard.js';
import { extractHmrcReadyReckoner, slugify } from '../src/extract-hmrc-trr.js';
import { cleanSr25Label, extractSr25DelTables } from '../src/extract-sr25.js';

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

describe('Spending Review 2025 DEL tables extraction', () => {
  it('reads resource and capital DEL by department in £ million', async () => {
    const extract = await extractSr25DelTables();
    const rdel = extract.tables.find((t) => t.sheet === 'Table 5.3 RDELex');
    const cdel = extract.tables.find((t) => t.sheet === 'Table 5.4 CDEL');
    expect(rdel?.years).toEqual(['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29']);
    expect(rdel?.realGrowthPeriods).toEqual(['2025-26 to 2028-29', '2023-24 to 2028-29']);
    const health = rdel?.rows.find((r) => r.rowId === 'health-and-social-care');
    expect(health?.label).toBe('Health and Social Care');
    expect(health?.memo).toBe(false);
    expect(health?.values['2028-29']).toBeCloseTo(231977.319, 3);
    expect(health?.averageAnnualRealGrowth['2025-26 to 2028-29']).toBeCloseTo(0.0279, 4);
    expect(rdel?.rows.find((r) => r.rowId === 'of-which-nhs-england')?.memo).toBe(true);
    const total = rdel?.rows.find((r) => r.rowId === 'total-resource-del-excluding-depreciation');
    expect(total?.values['2028-29']).toBeCloseTo(567807.634, 3);
    expect(rdel?.rows.find((r) => r.rowId === 'reserves')?.values['2023-24']).toBeNull();
    expect(cdel?.years.at(-1)).toBe('2029-30');
    expect(cdel?.rows.find((r) => r.rowId === 'total-capital-del')?.values['2029-30']).toBeCloseTo(
      151912.568,
      3,
    );
  });

  it('strips glued footnote markers but keeps numbers that belong to the name', () => {
    expect(cleanSr25Label('Health and Social Care4')).toBe('Health and Social Care');
    expect(cleanSr25Label('Transport (excl. High Speed 2)6')).toBe(
      'Transport (excl. High Speed 2)',
    );
    expect(cleanSr25Label('Energy Security and Net Zero - Sizewell C7')).toBe(
      'Energy Security and Net Zero - Sizewell C',
    );
    expect(cleanSr25Label('Cabinet Office10')).toBe('Cabinet Office');
    expect(cleanSr25Label(' Scottish Government ')).toBe('Scottish Government');
    expect(
      cleanSr25Label('Total Resource DEL excluding depreciation and technical changes for IFRS9'),
    ).toBe('Total Resource DEL excluding depreciation and technical changes for IFRS9');
  });
});
