import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  deliversTarget,
  freshGame,
  promiseBreaks,
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

describe('what the Chancellor promised the Prime Minister', () => {
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
      ambitionStatus(game, pm, run(values), ds.levers).promises.find(
        (p) => p.promise.id === 'fiscal-rules',
      );
    expect(rulesPromise({})?.kept).toBe(true);
    // Everything expensive at once misses the stability rule.
    const broken = ambitionStatus(
      game,
      pm,
      run({ def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 }),
      ds.levers,
    );
    expect(broken.promises.find((p) => p.promise.id === 'fiscal-rules')?.kept).toBe(false);
    expect(broken.broken).toBe(1);
  });

  it('holds every manifesto promise in force from the first screen to the last', () => {
    const status = ambitionStatus(freshGame(1), pm, run({}), ds.levers);
    expect(status.promises.map((p) => p.promise.id)).toEqual(pm.promises.map((p) => p.id));
    expect(status.broken).toBe(0);
    // A red line cannot be negotiated away: the data carries no push-backs or concessions.
    expect(pm.promises.every((p) => !('pushBack' in p))).toBe(true);
  });

  it('reports a priority funded, part-funded, unfunded or delayed against its target', () => {
    const game = { ...freshGame(1), priorities: ['nhs-above-sr', 'ufsm-all', 'send-settlement'] };
    const status = ambitionStatus(game, pm, run({ dhsc: 3, dfe: 2 }), ds.levers);
    const by = new Map(status.priorities.map((p) => [p.flagship.id, p] as const));
    expect(by.get('nhs-above-sr')?.status).toBe('funded');
    expect(by.get('send-settlement')?.status).toBe('part-funded');
    expect(by.get('ufsm-all')?.status).toBe('unfunded');
    expect(status.funded).toBe(1);
    // Overshooting the target still counts as delivering it.
    expect(deliversTarget(lever('dhsc'), 4, 3)).toBe(true);
    // A cut is delivered by going at least as far down.
    expect(deliversTarget(lever('fuel'), -10, -10)).toBe(true);
    expect(deliversTarget(lever('fuel'), -5, -10)).toBe(false);
  });

  it('marks a funded priority delayed when its start has been pushed back', () => {
    const game = { ...freshGame(1), priorities: ['ufsm-all'], delays: { ufsm: '2028-29' } };
    const status = ambitionStatus(game, pm, run({ ufsm: 1 }, game), ds.levers);
    expect(status.priorities[0]?.status).toBe('delayed');
    expect(status.priorities[0]?.delayedTo).toBe('2028-29');
    expect(status.funded).toBe(1);
  });

  it('reads each priority’s cost off the outcome in the target year', () => {
    const game = { ...freshGame(1), priorities: ['bus-cap', 'dip-gap'] };
    const status = ambitionStatus(game, pm, run({ bus2: 1, dip47: 1 }), ds.levers);
    const by = new Map(status.priorities.map((p) => [p.flagship.id, p.costGbpm] as const));
    expect(by.get('bus-cap')).toBeCloseTo(400, 6);
    expect(by.get('dip-gap')).toBeCloseTo(1175, 6);
  });
});
