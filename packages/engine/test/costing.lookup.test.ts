import { describe, expect, it } from 'vitest';
import {
  EngineError,
  computeOutcome,
  interpolateLookup,
  type Lever,
  type Settings,
} from '../src/index.js';
import { loadDataset, syntheticLever } from './fixtures.js';

/**
 * Lookup-table costings (HMRC's non-linear rows): a published point is read as it stands, and a
 * setting between two points on the straight line joining them, never beyond the last. The lever
 * is made up, with round numbers, so a real lever's re-costing never moves these.
 */
const ds = loadDataset();
const effectOf = (lever: Lever, value: number, settings: Partial<Settings> = {}) => {
  const e = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: [lever],
    settings: { leverValues: { [lever.code]: value }, implementationYear: '2026-27', ...settings },
  }).leverEffects.find((x) => x.code === lever.code);
  if (!e) throw new Error(`no effect for ${lever.code}`);
  return e;
};
const POINTS = [
  { input: 0, effect: { '2026-27': 0, '2027-28': 0, '2028-29': 0 } },
  { input: 1, effect: { '2026-27': 40, '2027-28': 80, '2028-29': 90 } },
  { input: 5, effect: { '2026-27': -170, '2027-28': -235, '2028-29': -870 } },
  { input: 10, effect: { '2026-27': -600, '2027-28': -1500, '2028-29': -3565 } },
];
/** A rate on gains whose published points show a loss for a rise, as HMRC's can. */
const GAINS = syntheticLever({
  code: 'xgains',
  control: { min: 0, max: 10 },
  costing: {
    kind: 'lookupTable',
    input: 'pp',
    points: POINTS,
    interpolation: 'linear',
    extrapolation: 'forbid',
    source: { sourceId: 'hmrc-trr-2025-06' },
    uprating: { method: 'growWithSeries', head: 'capitalTaxes', note: 'Grows with capital taxes.' },
    caveats: [],
  },
});

describe('lookup-table costings (HMRC non-linear rows)', () => {
  it('reads a published point as it stands in its own years', () => {
    const at5 = effectOf(GAINS, 5);
    expect(at5.receipts['2026-27']).toBeCloseTo(-170, 6);
    expect(at5.receipts['2027-28']).toBeCloseTo(-235, 6);
    expect(at5.receipts['2028-29']).toBeCloseTo(-870, 6);
    expect(effectOf(GAINS, 10).receipts['2028-29']).toBeCloseTo(-3565, 6);
  });

  it('interpolates in a straight line between published points', () => {
    const mid = interpolateLookup(POINTS, 7.5);
    expect(mid.effect['2028-29']).toBeCloseTo((-870 + -3565) / 2, 6);
    expect(mid.lower).toBe(5);
    expect(mid.upper).toBe(10);
    const quarter = interpolateLookup(POINTS, 2);
    expect(quarter.effect['2027-28']).toBeCloseTo(80 + 0.25 * (-235 - 80), 6);
    // The engine reads the same line for a setting between points.
    expect(effectOf(GAINS, 2).receipts['2027-28']).toBeCloseTo(80 + 0.25 * (-235 - 80), 6);
  });

  it('refuses to extrapolate beyond the published range', () => {
    expect(() => interpolateLookup(POINTS, 11)).toThrow(EngineError);
    // The control range is inside the table, so a setting past it is clamped before costing.
    expect(effectOf(GAINS, 11).value).toBe(10);
  });
});

describe('the personal allowance comes down as well as up (ADR-0035)', () => {
  it('costs a cut as HMRC’s rise with the sign reversed, and says that is an assumption', () => {
    const allowance = ds.levers.find((l) => l.code === 'itpa');
    if (allowance?.costing.kind !== 'lookupTable') throw new Error('no personal allowance table');
    const points = allowance.costing.points;
    const cuts = points.filter((p) => p.input < 0);
    expect(cuts.length).toBeGreaterThan(0);
    for (const cut of cuts) {
      const rise = points.find((p) => p.input === -cut.input);
      expect(rise, `${cut.input}`).toBeDefined();
      for (const [year, value] of Object.entries(rise?.effect ?? {})) {
        expect(cut.effect[year], `${cut.input} ${year}`).toBeCloseTo(-value, 6);
      }
    }
    expect(allowance.control.min).toBeLessThan(allowance.control.default);
    expect(
      allowance.costing.caveats.some((c) => /sign reversed/.test(c) && /assumption/.test(c)),
    ).toBe(true);
  });
});
