import { describe, expect, it } from 'vitest';
import {
  decomposeForecast,
  drawForecast,
  macroCodesOf,
  pickOutcome,
  revisedMeasures,
  scenarioCards,
  SEED_MAX,
  SEED_MIN,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const MACRO = macroCodesOf(context.readings);
const cards = scenarioCards(context, ds.levers, ds.vintage);

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, ds.draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}

function decompose(seed: number, planning: string, policy: Record<string, number>) {
  const draw = drawForecast(seed, ds.draws, context!, ds.levers, ds.vintage);
  return {
    draw,
    d: decomposeForecast({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: {
        implementationYear: '2027-28',
        debtInterestFeedback: true,
        assessAsOf: 'vintage',
      },
      policy,
      planningMacro: cards.find((c) => c.kind === planning)?.values ?? {},
      drawMacro: draw.values,
      revisions: draw.revisions,
      macroCodes: MACRO,
    }),
  };
}

describe('taking the OBR’s forecast apart (ADR-0012)', () => {
  it('adds up exactly: economy plus costings is the whole move, for every outcome', () => {
    const policy = { ufsm: 1, wealth: 1, vatfood: 1, dhsc: 2, itbr: 1 };
    for (const outcome of ds.draws.outcomes) {
      const { d } = decompose(seedFor(outcome.id), 'adviser', policy);
      expect(d.economyGbpm + d.costingsGbpm).toBeCloseTo(d.totalGbpm, 6);
      expect(d.headroom.planned + d.totalGbpm).toBeCloseTo(d.headroom.revised, 6);
    }
  });

  it('shows an economy line of nought when the player planned on what arrived', () => {
    const { d } = decompose(seedFor('adviser-right'), 'adviser', { ufsm: 1 });
    expect(d.economyGbpm).toBe(0);
    const worse = decompose(seedFor('adviser-right'), 'optimistic', { ufsm: 1 }).d;
    expect(worse.economyGbpm).toBeLessThan(0);
    const better = decompose(seedFor('kindest'), 'pessimistic', { ufsm: 1 }).d;
    expect(better.economyGbpm).toBeGreaterThan(0);
  });

  it('puts a re-scoring on the costings line and nowhere else', () => {
    const { d, draw } = decompose(seedFor('hard-line'), 'adviser', { wealth: 1, itbr: 1 });
    expect(draw.revisions.wealth?.factor).toBe(0.6);
    expect(d.costingsGbpm).toBeLessThan(0);
    // A package the OBR has nothing to doubt gets no costings line at all.
    const certified = decompose(seedFor('hard-line'), 'adviser', { itbr: 1, dhsc: 2 }).d;
    expect(certified.costingsGbpm).toBe(0);
  });

  it('lists what was re-scored with the figure before and after', () => {
    const { d } = decompose(seedFor('hard-line'), 'adviser', { wealth: 1, itbr: 1, cgtdth: 1 });
    const rows = revisedMeasures(d.revised, d.targetYear);
    expect(rows.map((r) => r.effect.code).sort()).toEqual(['cgtdth', 'wealth']);
    for (const r of rows) {
      expect(r.revisedGbpm).toBeCloseTo(r.asScoredGbpm * r.revision.factor, 6);
      expect(r.effect.badge).toBe('assumption');
    }
    expect(revisedMeasures(d.planned, d.targetYear)).toEqual([]);
  });
});
