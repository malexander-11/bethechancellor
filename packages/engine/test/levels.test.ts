import { describe, expect, it } from 'vitest';
import {
  describeLevelChange,
  formatLevel,
  formatLeverValue,
  formatLeverValueShort,
  isShareOfSpending,
  levelValue,
  leverStanding,
  parseLever,
  sizeWords,
  type LevelDisplay,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const src = { sourceId: 'govuk-income-tax-rates' };
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing ${code}`);
  return found;
};

describe('level display helpers', () => {
  it('adds a change to a baseline rate or applies a percentage to a threshold', () => {
    const rate: LevelDisplay = {
      baseline: 20,
      unit: 'pct',
      apply: 'add',
      label: 'Basic rate',
      source: src,
    };
    expect(levelValue(rate, 1)).toBe(21);
    expect(formatLevel(rate, levelValue(rate, -1))).toBe('19.0%');
    const allowance: LevelDisplay = {
      baseline: 12570,
      unit: 'GBP',
      apply: 'add',
      label: 'Personal allowance',
      source: src,
    };
    expect(formatLevel(allowance, levelValue(allowance, 500))).toBe('£13,070');
    const threshold: LevelDisplay = {
      baseline: 50270,
      unit: 'GBP',
      apply: 'pctChange',
      label: 'Higher-rate threshold',
      source: src,
    };
    expect(levelValue(threshold, 10)).toBeCloseTo(55297, 6);
    expect(formatLevel(threshold, levelValue(threshold, 10))).toBe('£55,297');
    const fuel: LevelDisplay = {
      baseline: 57.95,
      unit: 'pence',
      apply: 'pctChange',
      label: 'Fuel duty',
      source: src,
    };
    expect(formatLevel(fuel, levelValue(fuel, 5))).toBe('60.85p');
    const cb: LevelDisplay = {
      baseline: 27.05,
      unit: 'GBPperWeek',
      apply: 'add',
      label: 'Child benefit',
      decimals: 2,
      source: src,
    };
    expect(formatLevel(cb, levelValue(cb, 1))).toBe('£28.05 a week');
    const dept: LevelDisplay = {
      baseline: 231977.319 / 1000,
      unit: 'GBPbn',
      apply: 'pctChange',
      label: 'Health',
      source: src,
    };
    expect(formatLevel(dept, levelValue(dept, 2))).toBe('£236.6bn');
  });

  it('describes a change as "from → to" only when the lever has level metadata', () => {
    const itbr = ds.levers.find((l) => l.code === 'itbr');
    const alc = ds.levers.find((l) => l.code === 'alc');
    if (!itbr || !alc) throw new Error('missing levers');
    expect(describeLevelChange(itbr, 1)).toBe('20% → 21%');
    expect(describeLevelChange(parseLever(itbr), -1)).toBe('20% → 19%');
    expect(describeLevelChange(alc, 5)).toBeNull();
  });

  it('formats a setting in its own unit: pence, points, per cent and pounds', () => {
    expect(formatLeverValue(lever('itbr'), -1)).toBe('−1p');
    // A point, never "pp" (Phase 25).
    expect(formatLeverValue(lever('nicm'), 0.5)).toBe('+0.5 points');
    expect(formatLeverValueShort(lever('nicm'), 1)).toBe('+1 point');
    expect(formatLeverValue(lever('fuel'), 10)).toBe('+10%');
    expect(formatLeverValue(lever('nicpt'), 1040)).toBe('+£1,040');
  });

  it('names a level the way its radio does', () => {
    expect(sizeWords(lever('vats'), 2)).toBe('22%');
    expect(sizeWords(lever('iht'), -40)).toBe('Abolish (0%)');
    expect(sizeWords(lever('dhsc'), -1)).toBe('1% less');
    expect(sizeWords(lever('dhsc'), 5)).toBe('5% more');
  });

  it('reads back where a moved lever stands: its level, its share of a budget, or the change', () => {
    expect(leverStanding(lever('itbr'), 1)).toBe('21%');
    expect(isShareOfSpending(lever('dhsc'))).toBe(true);
    expect(leverStanding(lever('dhsc'), -1)).toBe('1% less');
    expect(isShareOfSpending(lever('alc'))).toBe(false);
    expect(leverStanding(lever('alc'), 5)).toBe('+5%');
    // A tick box simply is on.
    expect(leverStanding(lever('rv2ch'), 1)).toBeUndefined();
  });
});
