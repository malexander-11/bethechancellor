import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodePermalink, encodePermalink, type PermalinkState } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const allLevers = loadDataset().levers;
/** The app hides deprecated levers; their codes stay decodable with a warning (tested below). */
const levers = allLevers.filter((l) => !l.deprecated);
const baseState: PermalinkState = {
  vintageCode: 'obr2603',
  rulesCode: 'ch2602',
  implementationYear: '2027-28',
  leverValues: {},
  debtInterestFeedback: true,
  assessAsOf: 'vintage',
};

const leverValuesArb = fc
  .tuple(
    ...levers.map((l) =>
      fc
        .integer({ min: 0, max: Math.round((l.control.max - l.control.min) / l.control.step) })
        .map((k) => Number((l.control.min + k * l.control.step).toFixed(6))),
    ),
  )
  .map((vals) => Object.fromEntries(levers.map((l, i) => [l.code, vals[i] ?? 0])));

describe('permalink codec', () => {
  it('round-trips any combination of lever settings and options', () => {
    fc.assert(
      fc.property(
        leverValuesArb,
        fc.boolean(),
        fc.boolean(),
        (leverValues, feedback, nextBudget) => {
          const state: PermalinkState = {
            ...baseState,
            leverValues,
            debtInterestFeedback: feedback,
            assessAsOf: nextBudget ? 'nextBudget' : 'vintage',
          };
          const { state: decoded, warnings } = decodePermalink(
            encodePermalink(state, levers),
            levers,
          );
          expect(warnings).toEqual([]);
          expect(decoded.vintageCode).toBe('obr2603');
          expect(decoded.rulesCode).toBe('ch2602');
          expect(decoded.implementationYear).toBe('2027-28');
          expect(decoded.debtInterestFeedback).toBe(feedback);
          expect(decoded.assessAsOf).toBe(state.assessAsOf);
          for (const l of levers) {
            const expected = leverValues[l.code] ?? l.control.default;
            expect(decoded.leverValues[l.code] ?? l.control.default).toBeCloseTo(expected, 9);
          }
        },
      ),
    );
  });

  it('omits default values and options', () => {
    const q = encodePermalink(baseState, levers);
    expect(q).toBe('v=1&f=obr2603&r=ch2602&i=2027');
  });

  it('puts macro sliders under M and is deterministic', () => {
    const q = encodePermalink(
      { ...baseState, leverValues: { rpi: 1, rate: 0.5 }, debtInterestFeedback: false },
      levers,
    );
    expect(q).toContain('M=rate.0.5_rpi.1');
    expect(q).toContain('o=dif0');
    expect(q).not.toContain('L=');
  });

  it('warns on unknown codes, malformed pairs, out-of-range values and version mismatches', () => {
    const { state, warnings } = decodePermalink(
      '?v=9&f=obr2603&M=rate.99_nope.1_bad&i=27x',
      levers,
    );
    expect(state.leverValues.rate).toBe(3);
    expect(warnings.some((w) => w.includes('clamped'))).toBe(true);
    expect(warnings.some((w) => w.includes('nope'))).toBe(true);
    expect(warnings.some((w) => w.includes('malformed lever'))).toBe(true);
    expect(warnings.some((w) => w.includes('version 9'))).toBe(true);
    expect(warnings.some((w) => w.includes('implementation year'))).toBe(true);
    expect(state.implementationYear).toBeUndefined();
  });

  it('keeps a deprecated lever setting from an old link and says so', () => {
    const ipt = allLevers.find((l) => l.code === 'ipt');
    expect(ipt?.deprecated).toBe(true);
    const { state, warnings } = decodePermalink('v=1&f=obr2603&r=ch2602&i=2027&L=ipt.2', allLevers);
    expect(state.leverValues.ipt).toBe(2);
    expect(warnings.some((w) => /deprecated/.test(w))).toBe(true);
    const hidden = decodePermalink('v=1&L=ipt.2', levers);
    expect(hidden.state.leverValues.ipt).toBeUndefined();
    expect(hidden.warnings.some((w) => /unknown lever code/.test(w))).toBe(true);
  });
});
