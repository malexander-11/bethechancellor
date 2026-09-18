import { describe, expect, it } from 'vitest';
import {
  checkRawSourceConsistency,
  computeOutcome,
  DataError,
  headSeries,
  normaliseLeverValue,
  parseLever,
  type Lever,
} from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();
const lever = (code: string): Lever => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing ${code}`);
  return found;
};
const IHT_ROW =
  'inheritance-tax--increase-standard-rate-for-estates-left-on-death-by-1-percentage-point';
const IHT_LABEL = 'Increase standard rate for estates left on death by 1 percentage point';
const perPoint = { '2026-27': 105, '2027-28': 240, '2028-29': 290 };
const times = (k: number) =>
  Object.fromEntries(Object.entries(perPoint).map(([y, v]) => [y, v * k]));

/** An inheritance tax rate lever with abolition: HMRC's 1pp row for rises and mirrored cuts, the OBR line for −40pp. */
function ihtLookup(): Lever {
  const base = lever('iht');
  return parseLever({
    ...base,
    control: {
      kind: 'select',
      unit: 'pp',
      min: -40,
      max: 10,
      step: 5,
      default: 0,
      labels: {
        '-40': 'Abolish (0%)',
        '-10': '30%',
        '-5': '35%',
        '0': '40%',
        '5': '45%',
        '10': '50%',
      },
    },
    costing: {
      kind: 'lookupTable',
      input: 'pp',
      points: [
        {
          input: -40,
          effect: { '2026-27': -9500, '2027-28': -11200, '2028-29': -12800 },
          from: { vintageSeries: 'receiptsByTax.inheritanceTax', multiplier: -1 },
        },
        { input: -10, effect: times(-10), from: { rowIds: [IHT_ROW], multiplier: -10 } },
        { input: -5, effect: times(-5), from: { rowIds: [IHT_ROW], multiplier: -5 } },
        { input: 0, effect: times(0) },
        { input: 5, effect: times(5), from: { rowIds: [IHT_ROW], multiplier: 5 } },
        { input: 10, effect: times(10), from: { rowIds: [IHT_ROW], multiplier: 10 } },
      ],
      interpolation: 'linear',
      extrapolation: 'forbid',
      source: { sourceId: 'hmrc-trr-2025-06', table: 'Publication_Format' },
      rawSource: {
        kind: 'hmrcReadyReckoner',
        sourceId: 'hmrc-trr-2025-06',
        years: ['2026-27', '2027-28', '2028-29'],
        rows: [
          {
            rowId: IHT_ROW,
            label: IHT_LABEL,
            hmrcSign: 'yield',
            role: 'increase',
            values: perPoint,
          },
        ],
      },
      uprating: {
        method: 'growWithSeries',
        head: 'receiptsByTax.inheritanceTax',
        note: 'grows with the OBR inheritance tax line',
      },
      caveats: [],
    },
  });
}

describe("relief-cost toggles reproduce from HMRC's relief statistics", () => {
  const vats = lever('vats');
  const foodToggle = parseLever({
    ...vats,
    id: 'vat-on-food-test',
    code: 'vfood',
    title: 'Charge VAT on food',
    control: { kind: 'toggle', unit: 'bool', min: 0, max: 1, step: 1, default: 0 },
    costing: {
      kind: 'linearPerUnit',
      unitDelta: 1,
      perUnit: { '2025-26': 27400 },
      basis: 'accruals',
      symmetric: true,
      source: { sourceId: 'hmrc-tax-reliefs-2026-01', table: 'Table 2' },
      rawSource: {
        kind: 'hmrcReliefCost',
        sourceId: 'hmrc-tax-reliefs-2026-01',
        rows: [{ rowId: 'vat-ns7', name: 'Food', values: { '2025-26': 27400 } }],
      },
      uprating: { method: 'growWithSeries', head: 'vat', note: 'grows with VAT receipts' },
      caveats: [],
    },
    interactions: undefined,
  });

  it('accepts the published cost and rejects a tampered figure or name', () => {
    expect(checkRawSourceConsistency(foodToggle, extracted, ds.vintage)).toEqual([]);
    const tampered = structuredClone(foodToggle);
    if (tampered.costing.kind === 'linearPerUnit') tampered.costing.perUnit['2025-26'] = 20000;
    expect(checkRawSourceConsistency(tampered, extracted, ds.vintage).length).toBeGreaterThan(0);
    const wrongRow = structuredClone(foodToggle);
    if (
      wrongRow.costing.kind === 'linearPerUnit' &&
      wrongRow.costing.rawSource?.kind === 'hmrcReliefCost'
    ) {
      const first = wrongRow.costing.rawSource.rows[0];
      if (first) first.name = 'Food and drink';
    }
    expect(checkRawSourceConsistency(wrongRow, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('costs the toggle as the relief cost grown with VAT receipts from the start year', () => {
    const vat = headSeries(ds.vintage, 'vat');
    const o = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: [...ds.levers, foodToggle],
      settings: { leverValues: { vfood: 1 } },
    });
    const e = o.leverEffects.find((x) => x.code === 'vfood');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2027-28']).toBeCloseTo(
      27400 * ((vat['2027-28'] ?? 0) / (vat['2025-26'] ?? 1)),
      6,
    );
    expect(e?.receipts['2029-30']).toBeCloseTo(
      27400 * ((vat['2029-30'] ?? 0) / (vat['2025-26'] ?? 1)),
      6,
    );
  });
});

describe('scorecard-backed toggles can use Autumn Budget 2024 lines', () => {
  const rvfrz = lever('rvfrz');
  const rvcgt = parseLever({
    ...rvfrz,
    id: 'reverse-cgt-rise-test',
    code: 'rvcgtt',
    title: 'Reverse the October 2024 CGT rate rise',
    classification: { ...rvfrz.classification, taxHead: 'capitalTaxes' },
    costing: {
      kind: 'linearPerUnit',
      unitDelta: 1,
      perUnit: { '2027-28': -1350, '2028-29': -2180, '2029-30': -2490 },
      basis: 'accruals',
      symmetric: true,
      source: { sourceId: 'hmt-autumn-budget-2024-table-5-1', table: 'Table 5.1' },
      rawSource: {
        kind: 'hmtScorecard',
        sourceId: 'hmt-autumn-budget-2024-table-5-1',
        lines: [
          {
            number: 27,
            title:
              "Capital Gains Tax: Increase the main rates of CGT to 18% and 24% from 30 October 2024, and the Business Asset Disposal Relief (BADR) and Investors' Relief (IR) rate to 14% from 6 April 2025 and to 18% from 6 April 2026 ",
            values: {
              '2024-25': 90,
              '2025-26': 1440,
              '2026-27': 1370,
              '2027-28': 1350,
              '2028-29': 2180,
              '2029-30': 2490,
            },
          },
        ],
        signConvention: 'positiveReducesBorrowing',
      },
      uprating: { method: 'growWithSeries', head: 'capitalTaxes', note: 'extends 2030-31' },
      caveats: [],
    },
    interactions: undefined,
  });

  it('reproduces minus the line for the cited years and flags a wrong sign', () => {
    expect(checkRawSourceConsistency(rvcgt, extracted, ds.vintage)).toEqual([]);
    const flipped = structuredClone(rvcgt);
    if (flipped.costing.kind === 'linearPerUnit') flipped.costing.perUnit['2029-30'] = 2490;
    expect(checkRawSourceConsistency(flipped, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('applies the line year by year and extends 2030-31 with capital taxes', () => {
    const o = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: [...ds.levers, rvcgt],
      settings: { leverValues: { rvcgtt: 1 } },
    });
    const e = o.leverEffects.find((x) => x.code === 'rvcgtt');
    expect(e?.receipts['2027-28']).toBeCloseTo(-1350, 6);
    expect(e?.receipts['2029-30']).toBeCloseTo(-2490, 6);
    expect(e?.receipts['2030-31']).toBeLessThan(-2490);
  });
});

describe('inheritance tax with abolition: lookup points from HMRC rows and the OBR receipts line', () => {
  const iht = ihtLookup();

  it('passes the consistency check only with the vintage and only with the right figures', () => {
    expect(checkRawSourceConsistency(iht, extracted, ds.vintage)).toEqual([]);
    expect(checkRawSourceConsistency(iht, extracted).some((p) => /no vintage/.test(p))).toBe(true);
    const wrong = structuredClone(iht);
    if (wrong.costing.kind === 'lookupTable') {
      const abolition = wrong.costing.points.find((p) => p.input === -40);
      if (abolition) abolition.effect['2028-29'] = -12000;
    }
    expect(checkRawSourceConsistency(wrong, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('abolition costs exactly the OBR inheritance tax line in every year', () => {
    const o = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: [...ds.levers.filter((l) => l.code !== 'iht'), iht],
      settings: { leverValues: { iht: -40 } },
    });
    const e = o.leverEffects.find((x) => x.code === 'iht');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2027-28']).toBeCloseTo(-11200, 3);
    expect(e?.receipts['2028-29']).toBeCloseTo(-12800, 3);
    expect(e?.receipts['2029-30']).toBeCloseTo(-13700, 3);
    expect(e?.receipts['2030-31']).toBeCloseTo(-14700, 3);
    const rise = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: [...ds.levers.filter((l) => l.code !== 'iht'), iht],
      settings: { leverValues: { iht: 5 }, implementationYear: '2026-27' },
    }).leverEffects.find((x) => x.code === 'iht');
    expect(rise?.receipts['2026-27']).toBeCloseTo(525, 6);
  });

  it('snaps a select to its nearest offered option and rejects a select without its default', () => {
    expect(normaliseLeverValue(iht, -33)).toBe(-40);
    expect(normaliseLeverValue(iht, -6)).toBe(-5);
    expect(normaliseLeverValue(iht, 3)).toBe(5);
    expect(normaliseLeverValue(iht, 99)).toBe(10);
    expect(() =>
      parseLever({
        ...iht,
        control: { ...iht.control, labels: { '-40': 'Abolish', '10': '50%' } },
      }),
    ).toThrow(DataError);
  });
});

describe("a second relief-cost extract: HMRC's pension statistics", () => {
  const nicpen = lever('nicpen');

  it('reproduces the employer NICs relief row and rejects a tampered figure or source', () => {
    expect(checkRawSourceConsistency(nicpen, extracted, ds.vintage)).toEqual([]);
    const tampered = structuredClone(nicpen);
    if (tampered.costing.kind === 'linearPerUnit') tampered.costing.perUnit['2024-25'] = 17700;
    expect(checkRawSourceConsistency(tampered, extracted, ds.vintage).length).toBeGreaterThan(0);
    const wrongSource = structuredClone(nicpen);
    if (
      wrongSource.costing.kind === 'linearPerUnit' &&
      wrongSource.costing.rawSource?.kind === 'hmrcReliefCost'
    ) {
      wrongSource.costing.rawSource.sourceId = 'hmrc-tax-reliefs-2026-01';
    }
    expect(checkRawSourceConsistency(wrongSource, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('costs the charge as the 2024-25 relief grown with National Insurance receipts', () => {
    const nics = headSeries(ds.vintage, 'nics');
    const o = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: { leverValues: { nicpen: 1 } },
    });
    const e = o.leverEffects.find((x) => x.code === 'nicpen');
    expect(e?.receipts['2026-27']).toBe(0);
    expect(e?.receipts['2029-30']).toBeCloseTo(
      14300 * ((nics['2029-30'] ?? 0) / (nics['2024-25'] ?? 1)),
      6,
    );
    expect(e?.receipts['2029-30'] ?? 0).toBeGreaterThan(19000);
  });
});

describe('a weighted sum of published figures backs a schedule', () => {
  const pens30 = lever('pens30');

  it('reproduces the flat-rate saving from the by-rate relief, grown with income tax receipts', () => {
    expect(checkRawSourceConsistency(pens30, extracted, ds.vintage)).toEqual([]);
    const incomeTax = headSeries(ds.vintage, 'incomeTax');
    if (pens30.costing.kind !== 'schedule') throw new Error('schedule expected');
    const grown = (2542 * (incomeTax['2029-30'] ?? 0)) / (incomeTax['2024-25'] ?? 1);
    expect(Math.abs((pens30.costing.effect['2029-30'] ?? 0) - grown)).toBeLessThanOrEqual(1);
  });

  it('rejects a tampered factor, a wrong result and a tampered schedule', () => {
    const factor = structuredClone(pens30);
    if (
      factor.costing.kind === 'schedule' &&
      factor.costing.rawSource?.kind === 'derivedFromPublished' &&
      factor.costing.rawSource.method.name === 'weightedSum'
    ) {
      const basic = factor.costing.rawSource.method.terms[2];
      if (basic) basic.factor = -0.25;
    }
    expect(checkRawSourceConsistency(factor, extracted, ds.vintage).length).toBeGreaterThan(0);
    const result = structuredClone(pens30);
    if (
      result.costing.kind === 'schedule' &&
      result.costing.rawSource?.kind === 'derivedFromPublished' &&
      result.costing.rawSource.method.name === 'weightedSum'
    ) {
      result.costing.rawSource.method.resultGbpm = 4000;
    }
    expect(checkRawSourceConsistency(result, extracted, ds.vintage).length).toBeGreaterThan(0);
    const schedule = structuredClone(pens30);
    if (schedule.costing.kind === 'schedule') schedule.costing.effect['2029-30'] = 5000;
    expect(checkRawSourceConsistency(schedule, extracted, ds.vintage).length).toBeGreaterThan(0);
  });
});
