import { describe, expect, it } from 'vitest';
import { computeOutcome, taxHeadSeries, type Lever, type Settings } from '../src/index.js';
import { loadDataset, syntheticLever } from './fixtures.js';

/**
 * Linear costings (ADR-0004): value ÷ unit × a published per-unit effect, shifted to the start
 * year and carried on with a forecast series. The levers are made up, with round numbers, so a
 * real lever's re-costing never moves these; the vintage is the published one.
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
const effectOf = (lever: Lever, value: number, settings: Partial<Settings> = {}) => {
  const e = run([lever], { [lever.code]: value }, settings).leverEffects.find(
    (x) => x.code === lever.code,
  );
  if (!e) throw new Error(`no effect for ${lever.code}`);
  return e;
};
const head = taxHeadSeries(ds.vintage, 'incomeTax');
const h = (y: string) => head[y] ?? Number.NaN;
const PUBLISHED = { '2026-27': 1000, '2027-28': 1200, '2028-29': 1300 };
const linear = (code: string, costing: Record<string, unknown> = {}, control = {}) =>
  syntheticLever({
    code,
    control,
    costing: {
      kind: 'linearPerUnit',
      unitDelta: 1,
      perUnit: PUBLISHED,
      basis: 'accruals',
      symmetric: true,
      source: { sourceId: 'hmrc-trr-2025-06' },
      uprating: { method: 'growWithSeries', head: 'incomeTax', note: 'Grows with income tax.' },
      caveats: [],
      ...costing,
    },
  });
/** A rate costed from HMRC's three published years, carried on with income tax receipts. */
const RATE = linear('xrate');

describe('linear costings on a published per-unit table', () => {
  it('reproduces the published figures when the start year is the first published year', () => {
    const e = effectOf(RATE, 1, { implementationYear: '2026-27' });
    expect(e.receipts['2025-26']).toBe(0);
    expect(e.receipts['2026-27']).toBeCloseTo(1000, 6);
    expect(e.receipts['2027-28']).toBeCloseTo(1200, 6);
    expect(e.receipts['2028-29']).toBeCloseTo(1300, 6);
    // Beyond the published horizon the last year grows with the forecast series.
    expect(e.receipts['2029-30']).toBeCloseTo(1300 * (h('2029-30') / h('2028-29')), 6);
    expect(e.receipts['2030-31']).toBeCloseTo(1300 * (h('2030-31') / h('2028-29')), 6);
  });

  it('shifts the profile to a later start and scales each year with the series (worked example)', () => {
    const e = effectOf(RATE, 1);
    expect(e.receipts['2026-27']).toBe(0);
    expect(e.receipts['2027-28']).toBeCloseTo(1000 * (h('2027-28') / h('2026-27')), 6);
    expect(e.receipts['2028-29']).toBeCloseTo(1200 * (h('2028-29') / h('2027-28')), 6);
    expect(e.receipts['2029-30']).toBeCloseTo(1300 * (h('2029-30') / h('2028-29')), 6);
    expect(e.receipts['2030-31']).toBeCloseTo(1300 * (h('2030-31') / h('2028-29')), 6);
    expect(e.detail?.sourceYearFor['2029-30']).toBe('2028-29');
    expect(e.detail?.factor['2029-30']).toBeCloseTo(h('2029-30') / h('2028-29'), 9);
    expect(e.steps.some((s) => s.op === 'scale')).toBe(true);
  });

  it('carries the last published year on flat in cash, or not at all, when the lever says so', () => {
    const flat = effectOf(linear('xflat', { uprating: { method: 'flatCash', note: 'Flat.' } }), 1, {
      implementationYear: '2026-27',
    });
    expect(flat.receipts['2028-29']).toBeCloseTo(1300, 6);
    expect(flat.receipts['2030-31']).toBeCloseTo(1300, 6);
    expect(flat.steps.some((s) => s.op === 'extend')).toBe(true);
    const none = effectOf(linear('xnone', { uprating: { method: 'none' } }), 1, {
      implementationYear: '2026-27',
    });
    expect(none.receipts['2028-29']).toBeCloseTo(1300, 6);
    expect(none.receipts['2029-30']).toBe(0);
  });

  it('lifts the target year’s headroom by the uprated yield plus the interest it saves', () => {
    const base = run([RATE], {});
    const o = run([RATE], { [RATE.code]: 1 });
    const e = o.leverEffects.find((x) => x.code === RATE.code);
    const yieldY = e?.receipts['2029-30'] ?? 0;
    const headroom = (x: typeof o) =>
      x.verdicts.find((v) => v.ruleId === 'stability')?.headroomGbpm ?? 0;
    const delta = headroom(o) - headroom(base);
    // Receipts from the start year also cut debt interest: about a tenth on top by the target year.
    expect(delta).toBeGreaterThan(yieldY);
    expect(delta).toBeLessThan(yieldY * 1.15);
    const row = o.attribution.find((r) => r.code === RATE.code);
    expect(row?.kind).toBe('lever');
    expect(row?.currentBudgetGbpm).toBeCloseTo(-yieldY, 6);
    expect(o.attribution.some((r) => r.kind === 'debtInterest' && r.currentBudgetGbpm < 0)).toBe(
      true,
    );
  });

  it('uses the decrease table for a cut and the increase table for a rise', () => {
    const asymmetric = linear('xasym', {
      symmetric: false,
      perUnit: { '2026-27': 100, '2027-28': 200, '2028-29': 230 },
      decreasePerUnit: { '2026-27': -150, '2027-28': -335, '2028-29': -300 },
    });
    const at = (value: number) => effectOf(asymmetric, value, { implementationYear: '2026-27' });
    expect(at(1).receipts['2028-29']).toBeCloseTo(230, 6);
    expect(at(-1).receipts['2028-29']).toBeCloseTo(-300, 6);
    expect(at(-2).receipts['2027-28']).toBeCloseTo(-670, 6);
  });

  it('scales by the setting over the unit size, and keeps a setting the control allows', () => {
    // A threshold published per £104 a year, moved by £208.
    const threshold = linear(
      'xthresh',
      { unitDelta: 104, perUnit: { '2026-27': -250, '2027-28': -250, '2028-29': -250 } },
      { unit: 'GBP', min: -1040, max: 1040, step: 104 },
    );
    expect(
      effectOf(threshold, 208, { implementationYear: '2026-27' }).receipts['2028-29'],
    ).toBeCloseTo(-500, 6);
    // Half a point on a half-point control stays half a point; two points are twice one.
    const half = linear('xhalf', {}, { step: 0.5 });
    expect(effectOf(half, 0.5, { implementationYear: '2026-27' }).value).toBe(0.5);
    expect(effectOf(RATE, 2, { implementationYear: '2026-27' }).receipts['2028-29']).toBeCloseTo(
      2600,
      6,
    );
  });
});
