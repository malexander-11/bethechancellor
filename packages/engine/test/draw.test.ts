import { describe, expect, it } from 'vitest';
import {
  candidatesFor,
  computeOutcome,
  drawForecast,
  drawSettings,
  macroLeverFor,
  mix,
  outcomeOdds,
  pickOutcome,
  revisionsFor,
  SEED_MAX,
  SEED_MIN,
  type DrawOutcome,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context file');
const draws = ds.draws;

function headroomOf(values: Record<string, number>): number {
  const o = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values },
  });
  return o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? Number.NaN;
}

describe('the seeded OBR draw (ADR-0012)', () => {
  it('is deterministic: one seed, one outcome, every time', () => {
    for (let seed = SEED_MIN; seed <= 60; seed += 1) {
      expect(pickOutcome(seed, draws.outcomes).id).toBe(pickOutcome(seed, draws.outcomes).id);
      expect(mix(seed)).toBe(mix(seed));
    }
  });

  it('spreads every possible seed across the outcomes in proportion to their weights', () => {
    const counts = new Map<string, number>();
    for (let seed = SEED_MIN; seed <= SEED_MAX; seed += 1) {
      const id = pickOutcome(seed, draws.outcomes).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const odds = outcomeOdds(draws);
    const seeds = SEED_MAX - SEED_MIN + 1;
    for (const outcome of draws.outcomes) {
      const share = (counts.get(outcome.id) ?? 0) / seeds;
      // Nine hundred and ninety-nine seeds through a 32-bit mixer: within three points of the weight.
      expect(Math.abs(share - (odds[outcome.id] ?? 0))).toBeLessThan(0.03);
    }
    // The centre is the most common outcome, as the brief asks.
    const central = draws.outcomes.reduce((a, b) => (a.weight >= b.weight ? a : b));
    const most = [...counts.entries()].reduce((a, b) => (a[1] >= b[1] ? a : b));
    expect(most[0]).toBe(central.id);
  });

  it('only ever lands on a published candidate for each slider', () => {
    for (const outcome of draws.outcomes) {
      const { values, settings } = drawSettings(outcome, context, ds.levers);
      for (const reading of context.readings) {
        const lever = macroLeverFor(reading, ds.levers);
        if (!lever) continue;
        const name = outcome.macro[lever.code] ?? 'obr';
        const candidate = candidatesFor(reading, lever)[name];
        expect(candidate, `${outcome.id} ${lever.code} ${name}`).toBeDefined();
        expect(values[lever.code]).toBe(candidate?.value);
      }
      expect(settings).toHaveLength(Object.keys(values).length);
    }
  });

  it('never moves the growth slider, because no published range reaches it', () => {
    for (const outcome of draws.outcomes) {
      expect(drawSettings(outcome, context, ds.levers).values.ngdp).toBe(0);
    }
  });

  it('gets worse for the public finances in the authored order', () => {
    const headrooms = draws.outcomes.map((o) =>
      headroomOf(drawSettings(o, context, ds.levers).values),
    );
    for (let i = 1; i < headrooms.length; i += 1) {
      expect(headrooms[i]).toBeLessThanOrEqual(headrooms[i - 1] as number);
    }
    // The kindest is the optimistic card; the centre is the adviser's view.
    expect(headrooms[0]).toBeCloseTo(31100, -2);
    const central = draws.outcomes.findIndex((o) => o.id === 'adviser-right');
    expect(headrooms[central]).toBeCloseTo(6850, -2);
  });

  it('re-scores only levers that carry the named caveat, and never a certified row', () => {
    for (const outcome of draws.outcomes) {
      const revisions = revisionsFor(outcome, ds.levers);
      for (const [code, revision] of Object.entries(revisions)) {
        const lever = ds.levers.find((l) => l.code === code);
        expect(lever).toBeDefined();
        expect(lever?.considerations.some((c) => c.id === revision.considerationId)).toBe(true);
        expect(lever?.category).not.toBe('macro');
        // Treasury scorecard lines are OBR-certified costings; the draw must leave them alone.
        const raw = lever?.costing.kind === 'schedule' ? lever.costing.rawSource : undefined;
        expect(raw?.kind).not.toBe('hmtScorecard');
        expect(revision.factor).toBeLessThanOrEqual(1);
      }
    }
    // The kindest outcome revises nothing; the harshest revises the most.
    expect(Object.keys(revisionsFor(draws.outcomes[0] as DrawOutcome, ds.levers))).toHaveLength(0);
    const hardest = draws.outcomes[draws.outcomes.length - 1] as DrawOutcome;
    expect(Object.keys(revisionsFor(hardest, ds.levers)).length).toBeGreaterThan(5);
  });

  it('knows nothing about the outlook the player chose', () => {
    // The whole forecast comes from the seed and the data; there is no argument for a plan.
    const a = drawForecast(417, draws, context, ds.levers, ds.vintage);
    const b = drawForecast(417, draws, context, ds.levers, ds.vintage);
    expect(a.outcome.id).toBe(b.outcome.id);
    expect(a.values).toEqual(b.values);
    expect(a.revisions).toEqual(b.revisions);
  });
});
