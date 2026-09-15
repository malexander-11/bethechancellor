import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeOutcome,
  computeReactions,
  distributionalNotes,
  parseReactions,
  readings,
} from '../src/index.js';
import { DATA_DIR, loadDataset } from './fixtures.js';

const ds = loadDataset();
const reactions = parseReactions(
  JSON.parse(readFileSync(path.join(DATA_DIR, 'journey/reactions.json'), 'utf8')),
);
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);
const run = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const signalsFor = (leverValues: Record<string, number>) =>
  computeReactions({ outcome: run(leverValues), levers: ds.levers, reactions, typicalErrorGbpm });
const find = (leverValues: Record<string, number>, id: string) => {
  const s = signalsFor(leverValues).find((x) => x.id === id);
  if (!s) throw new Error(`no signal ${id}`);
  return s;
};

describe('Budget day reads back as feedback, not a table', () => {
  it('covers all four audiences and every signal carries a source', () => {
    const signals = signalsFor({});
    expect(new Set(signals.map((s) => s.audience))).toEqual(
      new Set(['rules', 'markets', 'parliament', 'public']),
    );
    expect(signals.every((s) => s.sources.length > 0)).toBe(true);
    expect(signals.every((s) => s.headline.length > 0 && s.detail.length > 0)).toBe(true);
  });

  it('is deterministic: the same Budget always gives the same signals', () => {
    const budget = { itbr: 2, dhsc: 1, water: 1 };
    expect(signalsFor(budget)).toEqual(signalsFor(budget));
  });

  it('no signal text exists outside the data file', () => {
    const authored = new Set(
      reactions.signals.flatMap((s) => s.bands.flatMap((b) => [b.headline, b.detail])),
    );
    for (const signal of signalsFor({ itbr: 3, def5: 1 })) {
      expect(authored.has(signal.headline)).toBe(true);
      expect(authored.has(signal.detail)).toBe(true);
    }
  });

  it('a Budget that misses the stability rule always gets the worst rules signal', () => {
    const outcome = run({ def5: 1 });
    expect(outcome.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('notMet');
    const signal = find({ def5: 1 }, 'rules-stability');
    expect(signal.level).toBe('bad');
    expect(signal.reading.value).toBeLessThan(0);
  });

  it('a big tax rise reads as more headroom and a higher tax take', () => {
    const budget = { itbr: 5, ithr: 5 };
    expect(find(budget, 'rules-stability').level).toBe('good');
    expect(find(budget, 'markets-borrowing').reading.value).toBeLessThan(0);
    expect(find(budget, 'public-tax-take').reading.value).toBeGreaterThan(0);
    expect(find(budget, 'public-tax-take').level).not.toBe('good');
  });

  it('the baseline Budget sits where the March forecast left it', () => {
    const base = readings({ outcome: run({}), levers: ds.levers, reactions, typicalErrorGbpm });
    expect(base.stabilityHeadroomGbpm).toBeCloseTo(23600, -2);
    expect(base.borrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(base.recommendationsAdopted).toBe(0);
    expect(base.budget2025Reversals).toBe(0);
    // Above the cap but inside the 5% margin, as the March forecast has it.
    expect(base.welfareCapStatus).toBe(1);
    expect(find({}, 'rules-welfare-cap').level).toBe('mixed');
  });

  it('counts what you adopted and what you reversed', () => {
    const base = readings({
      outcome: run({ def5: 1, airet: 1, rvfrz: 1, rv2ch: 1 }),
      levers: ds.levers,
      reactions,
      typicalErrorGbpm,
    });
    expect(base.recommendationsAdopted).toBe(2);
    expect(base.budget2025Reversals).toBe(2);
    expect(find({ def5: 1, airet: 1 }, 'parliament-recommendations').level).toBe('neutral');
    expect(find({}, 'parliament-recommendations').level).toBe('mixed');
  });

  it('a wafer-thin margin is flagged against the OBR’s own forecast error', () => {
    const thin = find({ dhsc: 8 }, 'rules-forecast-error');
    expect(thin.level).not.toBe('good');
    expect(find({ itbr: 5, ithr: 5, vats: 3 }, 'rules-forecast-error').level).toBe('good');
  });

  it('the public panel carries the distributional notes of the levers you moved', () => {
    const outcome = run({ itbr: 2, nonuk: 1 });
    const notes = distributionalNotes(outcome, ds.levers, '2029-30');
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.sources.length > 0)).toBe(true);
    // Ordered by the size of the measure, so the biggest thing you did comes first.
    expect(notes[0]?.leverTitle).toBeDefined();
    expect(distributionalNotes(run({}), ds.levers, '2029-30')).toEqual([]);
  });

  it('bands are ordered so every reading lands in exactly one', () => {
    for (const signal of reactions.signals) {
      const thresholds = signal.bands.map((b) => b.upTo).filter((t) => t !== undefined);
      expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
      expect(signal.bands[signal.bands.length - 1]?.upTo).toBeUndefined();
    }
  });
});
