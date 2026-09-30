import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  freshGame,
  receptions,
  type GamePermalink,
  type Reception,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  MOVES,
  SECURITY,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

/**
 * The recalibrated audiences over a seeded sample of Budgets (Phase 25, ADR-0026). The sample pins
 * properties, not counts: the scale still reaches both ends for every audience, and missing a rule
 * never pleases the markets more than doing nothing.
 */
const ds = loadDataset();
const ESTIMATE = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds);
const typicalErrorGbpm = typicalError(ds);

const GAMES: GamePermalink[] = [gameWith(SECURITY), gameWith(['nhs']), freshGame()];
const budget = fc.record({
  moves: fc.subarray([...MOVES], { minLength: 1, maxLength: 5 }),
  game: fc.constantFrom(...GAMES),
});
const SAMPLE = fc.sample(budget, { numRuns: 300, seed: 20260928 });

function rate(policy: Budget, game: GamePermalink): Reception[] {
  const outcome = outcomeOf({ ...ESTIMATE, ...policy });
  return receptions({
    outcome,
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    outcomeOf,
    pm: ds.pm,
    incidence: ds.incidence,
    game,
    status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers),
  });
}

describe('the audiences over 300 seeded Budgets (Phase 25)', () => {
  const rated = SAMPLE.map(({ moves, game }) => {
    const policy = moves.reduce<Record<string, number>>((acc, m) => ({ ...acc, ...m }), {});
    const outcome = outcomeOf({ ...ESTIMATE, ...policy });
    const missed = outcome.verdicts.some(
      (v) => (v.kind === 'currentBudget' || v.kind === 'stockFalling') && v.status === 'notMet',
    );
    return { missed, room: rate(policy, game) };
  });
  const ratingOf = (room: Reception[], audience: Reception['audience']) =>
    room.find((r) => r.audience === audience)?.rating ?? 0;

  it('still uses the whole scale, one to five, for every audience', () => {
    for (const audience of ['backbenchers', 'markets', 'public'] as const) {
      const seen = new Set(rated.map((r) => ratingOf(r.room, audience)));
      expect([...seen].sort(), audience).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('never lets a Budget that misses a rule please the markets more than doing nothing', () => {
    const nothing = ratingOf(rate({}, freshGame()), 'markets');
    expect(nothing).toBe(2);
    const missing = rated.filter((r) => r.missed);
    expect(missing.length).toBeGreaterThan(20);
    for (const r of missing) {
      expect(ratingOf(r.room, 'markets')).toBe(1);
      expect(ratingOf(r.room, 'backbenchers')).toBeLessThanOrEqual(3);
      expect(ratingOf(r.room, 'public')).toBeLessThanOrEqual(3);
    }
  });
});
