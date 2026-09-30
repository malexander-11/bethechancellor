import { describe, expect, it } from 'vitest';
import { computeOutcome, validateDataset } from '../src/index.js';
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
  it('notice every authored pair of live levers once, when both of them move', () => {
    const byId = new Map(ds.levers.map((l) => [l.id, l] as const));
    const moved = (l: (typeof ds.levers)[number]) =>
      l.control.default + (l.control.max > l.control.default ? 1 : -1) * l.control.step;
    for (const lever of ds.levers.filter((l) => !l.deprecated)) {
      for (const interaction of lever.interactions ?? []) {
        const other = byId.get(interaction.withLever);
        if (!other || other.deprecated) continue;
        const values = { [lever.code]: moved(lever), [other.code]: moved(other) };
        const notices = run(values).interactions.filter(
          (n) => n.codes.includes(lever.code) && n.codes.includes(other.code),
        );
        expect(notices, `${lever.code} × ${other.code}`).toHaveLength(1);
      }
    }
  });

  it('appear only when both levers of an authored pair are moved', () => {
    expect(run({ itbr: 1 }).interactions).toEqual([]);
    const both = run({ itbr: 1, itbrl: 5 }).interactions;
    expect(both).toHaveLength(1);
    expect(both[0]?.codes.sort()).toEqual(['itbr', 'itbrl']);
    expect(both[0]?.text.length).toBeGreaterThan(20);
  });

  it('are de-duplicated when both sides declare the pair and warn for overlapping fuel duty changes', () => {
    // Ending the freeze early and the basic rate each name the other: one notice, not two.
    expect(run({ itbr: 1, rvfrz: 1 }).interactions).toHaveLength(1);
    const fuel = run({ fuel: 5, fuelfrz: 1 }).interactions;
    expect(fuel).toHaveLength(1);
    expect(fuel[0]?.severity).toBe('warn');
  });

  it('say when two measures count the same money, and only ever from one side (Phase 25)', () => {
    const both = run({ cgtdth: 1, cgtexit: 1 }).interactions;
    expect(both).toHaveLength(1);
    expect(both[0]?.severity).toBe('excludes');
    expect(both[0]?.text).toMatch(/together they count it twice/);
    // An excludes pair is one fact about the pair: authored twice, the validator says so.
    const broken = structuredClone(ds);
    const exit = broken.levers.find((l) => l.code === 'cgtexit');
    if (!exit) throw new Error('no cgtexit');
    exit.interactions = [
      ...(exit.interactions ?? []),
      { withLever: 'cgt-on-death', text: 'Counted twice.', severity: 'warn' },
    ];
    expect(validateDataset(broken).some((p) => /authored once/.test(p))).toBe(true);
    expect(validateDataset(ds)).toEqual([]);
  });
});
