import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  deliversTarget,
  freshGame,
  promiseBreaks,
  rankedPriorities,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const pm = ds.pm;
const run = (leverValues: Record<string, number>, game?: Partial<GamePermalink>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: {
      leverValues,
      implementationYearByCode: game?.delays,
    },
  });
const lever = (code: string) => ds.levers.find((l) => l.code === code);
const status = (game: GamePermalink, values: Record<string, number>) =>
  ambitionStatus(game, pm, ds.options, run(values, game), ds.levers);

describe('what the Chancellor agreed with the Prime Minister', () => {
  it('breaks the tax lock on exactly the levers the manifesto names', () => {
    const lock = pm.promises.find((p) => p.id === 'tax-lock');
    if (!lock) throw new Error('no tax lock');
    expect(promiseBreaks({ itbr: 1 }, [lock], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ vats: 1 }, [lock], ds.levers)[0]?.brokenBy).toEqual([
      { code: 'vats', value: 1 },
    ]);
    // A cut is not a rise, and a threshold is not a rate.
    expect(promiseBreaks({ itbr: -1 }, [lock], ds.levers)[0]?.kept).toBe(true);
    expect(promiseBreaks({ itpa: 500 }, [lock], ds.levers)[0]?.kept).toBe(true);
  });

  it('breaks the two-child promise when the limit is reinstated, and no other way', () => {
    const promise = pm.promises.find((p) => p.id === 'two-child');
    if (!promise) throw new Error('no two-child promise');
    expect(promiseBreaks({ rv2ch: 1 }, [promise], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ wuc: -5 }, [promise], ds.levers)[0]?.kept).toBe(true);
  });

  it('judges the fiscal-rules promise by the verdicts, since no lever names it', () => {
    const game = freshGame(1);
    const rulesPromise = (values: Record<string, number>) =>
      status(game, values).promises.find((p) => p.promise.id === 'fiscal-rules');
    expect(rulesPromise({})?.kept).toBe(true);
    // Everything expensive at once misses the stability rule.
    const broken = status(game, { def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 });
    expect(broken.promises.find((p) => p.promise.id === 'fiscal-rules')?.kept).toBe(false);
    expect(broken.broken).toBe(1);
  });

  it('holds every manifesto promise in force from the first screen to the last', () => {
    const s = status(freshGame(1), {});
    expect(s.promises.map((p) => p.promise.id)).toEqual(pm.promises.map((p) => p.id));
    expect(s.broken).toBe(0);
    // A red line cannot be negotiated away: the data carries no push-backs or concessions.
    expect(pm.promises.every((p) => !('pushBack' in p))).toBe(true);
  });

  it('ranks only priorities the data knows, first three, in the order given', () => {
    const game = {
      ...freshGame(1),
      priorities: ['nhs', 'prisons', 'defence', 'families', 'schools-send'],
    };
    expect(rankedPriorities(game, pm).map((p) => p.id)).toEqual(['nhs', 'defence', 'families']);
    expect(status(game, {}).priorities.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it('reads a priority delivered, part or undelivered from the state of its options', () => {
    const game = { ...freshGame(1), priorities: ['nhs', 'schools-send', 'families'] };
    const s = status(game, { dhsc: 3, dfe: 2 });
    const by = new Map(s.priorities.map((p) => [p.priority.id, p] as const));
    expect(by.get('nhs')?.status).toBe('delivered');
    expect(by.get('schools-send')?.status).toBe('part');
    expect(by.get('families')?.status).toBe('undelivered');
    expect(s.delivered).toBe(1);
    const health = by.get('nhs')?.options.find((o) => o.option.id === 'health-above-sr');
    expect(health?.state).toBe('on');
    const send = by.get('schools-send')?.options.find((o) => o.option.id === 'send-settlement');
    expect(send?.state).toBe('adjusted');
    // Overshooting the value still counts as delivering it.
    expect(deliversTarget(lever('dhsc'), 4, 3)).toBe(true);
    // A cut is delivered by going at least as far down.
    expect(deliversTarget(lever('fuel'), -10, -10)).toBe(true);
    expect(deliversTarget(lever('fuel'), -5, -10)).toBe(false);
  });

  it('records a delay on the option whose lever was pushed back', () => {
    const game = { ...freshGame(1), priorities: ['cost-of-living'], delays: { ufsm: '2028-29' } };
    const s = status(game, { ufsm: 1 });
    const meals = s.priorities[0]?.options.find((o) => o.option.id === 'free-school-meals');
    expect(meals?.state).toBe('on');
    expect(meals?.delayedTo).toBe('2028-29');
    expect(s.priorities[0]?.status).toBe('delivered');
    expect(s.delivered).toBe(1);
  });

  it('reads each option’s cost off the outcome in the target year, and sums it by priority', () => {
    const game = { ...freshGame(1), priorities: ['cost-of-living', 'defence'] };
    const s = status(game, { bus2: 1, dip47: 1 });
    const options = new Map(
      s.priorities.flatMap((p) => p.options).map((o) => [o.option.id, o.costGbpm] as const),
    );
    expect(options.get('bus-cap')).toBeCloseTo(400, 6);
    expect(options.get('dip-gap')).toBeCloseTo(1175, 6);
    expect(options.get('free-school-meals')).toBe(0);
    expect(s.priorities.find((p) => p.priority.id === 'defence')?.costGbpm).toBeCloseTo(1175, 6);
  });
});
