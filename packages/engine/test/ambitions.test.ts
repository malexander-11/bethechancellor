import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  deliversTarget,
  freshGame,
  promiseBreaks,
  promisesInForce,
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
    const game = { ...freshGame(1), protectedPromises: ['fiscal-rules'] };
    const kept = ambitionStatus(game, pm, run({}), ds.levers);
    expect(kept.promises[0]?.kept).toBe(true);
    // Everything expensive at once misses the stability rule.
    const broken = ambitionStatus(
      game,
      pm,
      run({ def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 }),
      ds.levers,
    );
    expect(broken.promises[0]?.kept).toBe(false);
    expect(broken.broken).toBe(1);
  });

  it('treats a concession as a promise of its own, in force once accepted', () => {
    const game = { ...freshGame(1), protectedPromises: ['tax-lock-narrowed', 'ct-cap'] };
    const inForce = promisesInForce(game, pm).map((p) => p.id);
    expect(inForce).toEqual(['tax-lock-narrowed', 'ct-cap']);
    // The narrowed lock releases the additional rate and nothing else.
    const status = ambitionStatus(game, pm, run({ itar: 5 }), ds.levers);
    expect(status.promises.find((p) => p.promise.id === 'tax-lock-narrowed')?.kept).toBe(true);
    const basic = ambitionStatus(game, pm, run({ itbr: 1 }), ds.levers);
    expect(basic.promises.find((p) => p.promise.id === 'tax-lock-narrowed')?.kept).toBe(false);
  });

  it('holds every promise in force until the conversation has happened', () => {
    expect(promisesInForce(freshGame(1), pm)).toHaveLength(pm.promises.length);
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
