import { describe, expect, it } from 'vitest';
import { computeOutcome, EngineError, interpolateLookup } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (leverValues: Record<string, number>, implementationYear = '2026-27') =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, implementationYear },
  });

describe('lookup-table costings (HMRC non-linear rows)', () => {
  it('reproduces the CGT higher-rate points and shows the revenue loss HMRC publishes', () => {
    const at5 = run({ cgth: 5 }).leverEffects.find((x) => x.code === 'cgth');
    expect(at5?.receipts['2026-27']).toBeCloseTo(-170, 6);
    expect(at5?.receipts['2027-28']).toBeCloseTo(-235, 6);
    expect(at5?.receipts['2028-29']).toBeCloseTo(-870, 6);
    const at10 = run({ cgth: 10 }).leverEffects.find((x) => x.code === 'cgth');
    expect(at10?.receipts['2028-29']).toBeCloseTo(-3565, 6);
  });

  it('interpolates in a straight line between published points', () => {
    const lever = ds.levers.find((l) => l.code === 'cgth');
    if (!lever || lever.costing.kind !== 'lookupTable') throw new Error('cgth lever missing');
    const mid = interpolateLookup(lever.costing.points, 7.5);
    expect(mid.effect['2028-29']).toBeCloseTo((-870 + -3565) / 2, 6);
    expect(mid.lower).toBe(5);
    expect(mid.upper).toBe(10);
    const quarter = interpolateLookup(lever.costing.points, 2);
    expect(quarter.effect['2027-28']).toBeCloseTo(80 + 0.25 * (-235 - 80), 6);
  });

  it('refuses to extrapolate beyond HMRC’s published range', () => {
    const lever = ds.levers.find((l) => l.code === 'cgth');
    if (!lever || lever.costing.kind !== 'lookupTable') throw new Error('cgth lever missing');
    const points = lever.costing.points;
    expect(() => interpolateLookup(points, 11)).toThrow(EngineError);
    // The control range is inside the table, so slider values are clamped before costing.
    expect(run({ cgth: 11 }).leverEffects[0]?.value).toBe(10);
  });

  it('handles thresholds: the higher-rate threshold and personal allowance points', () => {
    const cut = run({ itbrl: -10 }).leverEffects.find((x) => x.code === 'itbrl');
    expect(cut?.receipts['2027-28']).toBeCloseTo(7200, 6);
    const rise = run({ itbrl: 10 }).leverEffects.find((x) => x.code === 'itbrl');
    expect(rise?.receipts['2027-28']).toBeCloseTo(-6250, 6);
    const one = run({ itbrl: 1 }).leverEffects.find((x) => x.code === 'itbrl');
    expect(one?.receipts['2027-28']).toBeCloseTo(-665, 6);
    const pa = run({ itpa: 1250 }).leverEffects.find((x) => x.code === 'itpa');
    // Between HMRC's +£100 and +£1,257 points; 1,250 is within 1% of the 10% point.
    expect(pa?.receipts['2027-28']).toBeLessThan(-11500);
    expect(pa?.receipts['2027-28']).toBeGreaterThan(-11650);
    const hundred = run({ itpa: 100 }).leverEffects.find((x) => x.code === 'itpa');
    expect(hundred?.receipts['2027-28']).toBeCloseTo(-1050, 6);
  });
});
