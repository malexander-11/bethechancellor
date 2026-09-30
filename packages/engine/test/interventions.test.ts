import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  freshGame,
  interventionsFor,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';
import {
  EMPLOYER_NICS,
  NHS_START,
  PENNY,
  PRISONS,
  SECURITY_FLAGSHIPS,
  gameWith,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();

function outcomeFor(leverValues: Budget) {
  return computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, implementationYear: '2027-28' },
  });
}

function advice(game: GamePermalink, leverValues: Budget) {
  const outcome = outcomeFor(leverValues);
  const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
  const headroomGbpm = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
  const ruleMissed = outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  return interventionsFor(ds.interventions, status, { headroomGbpm, ruleMissed });
}

describe('advisers who remember', () => {
  it('names the promise a lever breaks, and carries the promise’s own sources', () => {
    const game = freshGame();
    const items = advice(game, PENNY);
    const broken = items.find((x) => x.when === 'promise-broken');
    expect(broken?.text).toBe(
      'That is The tax lock, Chancellor: a manifesto red line, and the words are on the record. Nothing here will stop you. On Budget day the public’s rating starts at the floor, whatever else you do.',
    );
    expect(broken?.about).toBe('tax-lock');
    expect(
      broken?.sources.some((s) => s.sourceId === 'labour-manifesto-2024-strong-foundations'),
    ).toBe(true);
    // Corporation tax is untouched, so the cap gets no line.
    expect(items.filter((x) => x.when === 'promise-broken')).toHaveLength(1);
  });

  it('says a strained promise is tested, not broken, and says nothing once it is broken', () => {
    const game = freshGame();
    const strained = advice(game, EMPLOYER_NICS).find((x) => x.when === 'promise-strained');
    expect(strained?.text).toMatch(/^The tax lock is tested, not broken/);
    expect(strained?.about).toBe('tax-lock');
    expect(advice(game, EMPLOYER_NICS).some((x) => x.when === 'promise-broken')).toBe(false);
    const both = advice(game, { ...EMPLOYER_NICS, ...PENNY });
    expect(both.some((x) => x.when === 'promise-strained')).toBe(false);
    expect(both.some((x) => x.when === 'promise-broken')).toBe(true);
  });

  it('flags a priority nothing funds yet, then stops once the target is met', () => {
    const game = gameWith(['safer-streets', 'defence']);
    const before = advice(game, {});
    expect(before.filter((x) => x.when === 'priority-unfunded').map((x) => x.about)).toEqual([
      'safer-streets',
      'defence',
    ]);
    // Trimmed short of what was chosen, or with only a start behind it, a priority is started,
    // not delivered, and the line says so either way (Phase 25).
    const half = advice(
      game,
      Object.fromEntries(Object.entries(PRISONS).map(([code, value]) => [code, value / 2])),
    );
    const started = half.find((x) => x.about === 'safer-streets');
    expect(started?.when).toBe('priority-part-funded');
    expect(started?.short).toMatch(/is started, not delivered: nothing delivers it in full/);
    const care = advice(gameWith(['nhs']), NHS_START);
    expect(care.find((x) => x.about === 'nhs')?.when).toBe('priority-part-funded');
    const done = advice(game, SECURITY_FLAGSHIPS);
    expect(done.some((x) => x.when === 'priority-unfunded')).toBe(false);
    expect(done.some((x) => x.when === 'all-priorities-funded')).toBe(true);
  });

  it('has no target to hold the player to: the rules are the line (Phase 24)', () => {
    const items = advice(gameWith(['safer-streets']), PRISONS);
    expect(items.some((x) => x.when.startsWith('headroom'))).toBe(false);
    expect(ds.interventions.interventions.some((x) => x.when.startsWith('headroom'))).toBe(false);
  });

  it('puts the most pressing note first', () => {
    const game = gameWith(['safer-streets']);
    // A penny on the basic rate breaks the lock, health gets more, and prisons wait.
    const items = advice(game, { ...PENNY, dhsc: 5 });
    expect(items[0]?.when).toBe('promise-broken');
    const order = items.map((x) => x.when);
    expect(order.indexOf('priority-unfunded')).toBeGreaterThan(order.indexOf('promise-broken'));
    // A rule missed outranks an unfunded priority.
    const missed = advice(game, { dhsc: 10, dfe: 10, def3: 1 }).map((x) => x.when);
    expect(missed.indexOf('rule-missed')).toBeLessThan(missed.indexOf('priority-unfunded'));
  });
});
