import { describe, expect, it } from 'vitest';
import { computeOutcome } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });

describe('interaction notices', () => {
  it('appear only when both levers of an authored pair are moved', () => {
    expect(run({ itbr: 1 }).interactions).toEqual([]);
    const both = run({ itbr: 1, itbrl: 5 }).interactions;
    expect(both).toHaveLength(1);
    expect(both[0]?.codes.sort()).toEqual(['itbr', 'itbrl']);
    expect(both[0]?.text.length).toBeGreaterThan(20);
  });

  it('are de-duplicated when both sides declare the pair and warn for overlapping fuel duty changes', () => {
    const fuel = run({ fuel: 5, rvfuel: 1 }).interactions;
    expect(fuel).toHaveLength(1);
    expect(fuel[0]?.severity).toBe('warn');
  });
});
