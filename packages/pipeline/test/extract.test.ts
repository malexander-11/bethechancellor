import { describe, expect, it } from 'vitest';
import {
  extractAutumnBudget2024Scorecard,
  extractBudget2025Scorecard,
} from '../src/extract-budget-2025-scorecard.js';
import { extractHmrcReadyReckoner, slugify } from '../src/extract-hmrc-trr.js';
import { cleanSr25Label, extractSr25DelTables } from '../src/extract-sr25.js';
import { extractTaxReliefs, parseReliefNumber } from '../src/extract-tax-reliefs.js';

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

describe('Autumn Budget 2024 scorecard extraction', () => {
  it('reads the measures with the same conventions as Budget 2025', async () => {
    const extract = await extractAutumnBudget2024Scorecard();
    expect(extract.sourceId).toBe('hmt-autumn-budget-2024-table-5-1');
    expect(extract.years).toEqual([
      '2024-25',
      '2025-26',
      '2026-27',
      '2027-28',
      '2028-29',
      '2029-30',
    ]);
    expect(extract.measures.length).toBeGreaterThan(60);
    const cgt = extract.measures.find((m) => m.number === 27);
    expect(cgt?.type).toBe('Tax');
    expect(
      cgt?.title.startsWith('Capital Gains Tax: Increase the main rates of CGT to 18% and 24%'),
    ).toBe(true);
    expect(cgt?.values).toEqual({
      '2024-25': 90,
      '2025-26': 1440,
      '2026-27': 1370,
      '2027-28': 1350,
      '2028-29': 2180,
      '2029-30': 2490,
    });
    expect(extract.measures.find((m) => m.number === 25)?.values['2029-30']).toBe(310);
  });
});

describe('HMRC tax relief cost extraction', () => {
  it('reads Table 2 in £ million with markers kept for unpublished cells', () => {
    const extract = extractTaxReliefs();
    expect(extract.years).toEqual([
      '2020-21',
      '2021-22',
      '2022-23',
      '2023-24',
      '2024-25',
      '2025-26',
    ]);
    expect(extract.rows.length).toBeGreaterThan(150);
    const food = extract.rows.find((r) => r.rowId === 'vat-ns7');
    expect(food?.name).toBe('Food');
    expect(food?.taxType).toBe('VAT');
    expect(food?.values['2025-26']).toBe(27400);
    expect(food?.values['2022-23']).toBe(23800);
    expect(food?.values['2023-24']).toBe(26100);
    const fuel = extract.rows.find((r) => r.rowId === 'vat-ns4');
    expect(fuel?.values['2025-26']).toBe(7000);
    const hospitality = extract.rows.find((r) =>
      r.name.startsWith('Temporary reduced rate of VAT'),
    );
    expect(hospitality?.values['2025-26']).toBeNull();
    expect(hospitality?.markers['2025-26']).toBe('Not available');
    expect(extract.rows.some((r) => Object.values(r.markers).includes('Disclosive'))).toBe(true);
  });

  it('parses published numbers, negligible and markers', () => {
    expect(parseReliefNumber('27,400')).toEqual({ value: 27400, negligible: false, marker: null });
    expect(parseReliefNumber('Negligible')).toEqual({
      value: null,
      negligible: true,
      marker: 'Negligible',
    });
    expect(parseReliefNumber('Disclosive')).toEqual({
      value: null,
      negligible: false,
      marker: 'Disclosive',
    });
  });
});
