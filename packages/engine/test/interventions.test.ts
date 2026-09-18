import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  freshGame,
  interventionsFor,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();

function outcomeFor(leverValues: Record<string, number>) {
  return computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, implementationYear: '2027-28' },
  });
}

function advice(game: GamePermalink, leverValues: Record<string, number>) {
  const outcome = outcomeFor(leverValues);
  const status = ambitionStatus(game, ds.pm, outcome, ds.levers);
  const headroomGbpm = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
  const ruleMissed = outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  return interventionsFor(ds.interventions, status, {
    headroomGbpm,
    targetGbpm: game.headroomTargetBn * 1000,
    ruleMissed,
  });
}

describe('advisers who remember', () => {
  it('names the promise a lever breaks, and carries the promise’s own sources', () => {
    const game = freshGame(7);
    const items = advice(game, { itbr: 1 });
    const broken = items.find((x) => x.when === 'promise-broken');
    expect(broken?.text).toBe(
      'That is The tax lock, Chancellor: a manifesto red line, and the words are on the record. The desk will let you, and the public will notice.',
    );
    expect(broken?.about).toBe('tax-lock');
    expect(
      broken?.sources.some((s) => s.sourceId === 'labour-manifesto-2024-strong-foundations'),
    ).toBe(true);
    // Corporation tax is untouched, so the cap gets no line.
    expect(items.filter((x) => x.when === 'promise-broken')).toHaveLength(1);
  });

  it('flags a priority nothing funds yet, then stops once the target is met', () => {
    const game = { ...freshGame(7), themes: ['security'], priorities: ['prisons', 'dip-gap'] };
    const before = advice(game, {});
    expect(before.filter((x) => x.when === 'priority-unfunded').map((x) => x.about)).toEqual([
      'prisons',
      'dip-gap',
    ]);
    const half = advice(game, { moj: 5 });
    expect(half.find((x) => x.about === 'prisons')?.when).toBe('priority-part-funded');
    const done = advice(game, { moj: 10, dip47: 1 });
    expect(done.some((x) => x.when === 'priority-unfunded')).toBe(false);
    expect(done.some((x) => x.when === 'all-priorities-funded')).toBe(true);
  });

  it('reads headroom against the target the player set, and says nothing when there is no target', () => {
    const tight = advice({ ...freshGame(7), headroomTargetBn: 30 }, {});
    expect(tight.some((x) => x.when === 'headroom-below-target')).toBe(true);
    const easy = advice({ ...freshGame(7), headroomTargetBn: 10 }, {});
    expect(easy.some((x) => x.when === 'headroom-above-target')).toBe(true);
    const none = advice({ ...freshGame(7), headroomTargetBn: 0 }, {});
    expect(none.some((x) => x.when.startsWith('headroom'))).toBe(false);
  });

  it('puts the most pressing note first', () => {
    const game = { ...freshGame(7), priorities: ['prisons'], headroomTargetBn: 30 };
    // A penny on the basic rate breaks the lock; the health money eats the headroom it raised.
    const items = advice(game, { itbr: 1, dhsc: 5 });
    expect(items[0]?.when).toBe('promise-broken');
    const order = items.map((x) => x.when);
    expect(order.indexOf('priority-unfunded')).toBeLessThan(order.indexOf('headroom-below-target'));
  });
});
