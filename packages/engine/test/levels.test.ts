import { describe, expect, it } from 'vitest';
import {
  describeLevelChange,
  formatLevel,
  levelValue,
  parseLever,
  type LevelDisplay,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const src = { sourceId: 'govuk-income-tax-rates' };

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
});
