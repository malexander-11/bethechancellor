import { describe, expect, it } from 'vitest';
import { householdReactions } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const react = (values: Record<string, number>, themed = false) =>
  householdReactions(ds.electorate, values, ds.levers, () => 1, null, themed);

describe('the electorate as five households', () => {
  it('leaves everyone untouched by an empty Budget, and puzzled without a theme', () => {
    const out = react({});
    expect(out).toHaveLength(5);
    expect(out.every((r) => r.net === 'untouched' && !r.understood)).toBe(true);
    expect(out.every((r) => r.line.text === r.household.puzzled.text)).toBe(true);
  });

  it('fires the lines of the levers that touch a household, in the direction moved', () => {
    const family = react({ rv2ch: 1, ufsm: 1 }).find((r) => r.household.id === 'uc-family');
    expect(family?.net).toBe('mixed');
    expect(family?.said.map((s) => s.lever.code).sort()).toEqual(['rv2ch', 'ufsm']);
    const couple = react({ itbr: -1 }).find((r) => r.household.id === 'mortgage-couple');
    expect(couple?.net).toBe('gains');
    expect(couple?.said[0]?.touch.line.text).toMatch(/penny off/);
    const couplePays = react({ itbr: 1 }).find((r) => r.household.id === 'mortgage-couple');
    expect(couplePays?.net).toBe('pays');
  });

  it('never quotes a number that is not a sourced fact', () => {
    for (const h of ds.electorate.households) {
      const lines = [h.fact, h.untouched, h.understood, h.puzzled, ...h.touches.map((t) => t.line)];
      for (const line of lines) {
        expect(line.badge).toBe('simulated');
        if (/£\d|\d{3},\d{3}|\d+%/.test(line.text)) {
          expect(
            line.sources.length,
            `${h.id}: "${line.text}" quotes a figure without a source`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});
