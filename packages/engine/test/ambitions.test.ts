import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  deliversTarget,
  freshGame,
  promiseBreaks,
  promiseStrains,
  rankedPriorities,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';
import {
  DEFENCE_GAP,
  EMPLOYER_NICS,
  EVERYTHING_EXPENSIVE,
  HEALTH_ABOVE_PLAN,
  NHS_START,
  PENNY,
  gameWith,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const pm = ds.pm;
const run = (leverValues: Budget) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const lever = (code: string) => ds.levers.find((l) => l.code === code);
const status = (game: GamePermalink, values: Budget) =>
  ambitionStatus(game, pm, ds.options, run(values), ds.levers);

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
    // Nor is a lower allowance, though it asks more of every taxpayer (ADR-0035): the manifesto
    // named rates, and a lower threshold neither breaks nor strains its words.
    expect(promiseBreaks({ itpa: -500 }, [lock], ds.levers)[0]?.kept).toBe(true);
    expect(promiseStrains({ itpa: -500 }, [lock], ds.levers)[0]?.strained).toBe(false);
  });

  it('marks the employer-side NICs charges and the new top rate as straining the lock, not breaking it', () => {
    const lock = pm.promises.find((p) => p.id === 'tax-lock');
    if (!lock) throw new Error('no tax lock');
    const cases: Record<string, number>[] = [
      { nicer: 1 },
      { nicst: -104 },
      { nicpen: 1 },
      { nicllp: 1 },
      { it50: 1 },
    ];
    for (const values of cases) {
      expect(promiseBreaks(values, [lock], ds.levers)[0]?.kept, JSON.stringify(values)).toBe(true);
      expect(promiseStrains(values, [lock], ds.levers)[0]?.strained, JSON.stringify(values)).toBe(
        true,
      );
    }
    // The threshold strained downwards only; a cut in the rate strains nothing.
    expect(promiseStrains({ nicst: 104 }, [lock], ds.levers)[0]?.strained).toBe(false);
    expect(promiseStrains({ nicer: -1 }, [lock], ds.levers)[0]?.strained).toBe(false);
    const by = promiseStrains({ nicer: 1 }, [lock], ds.levers)[0]?.strainedBy[0];
    expect(by?.code).toBe('nicer');
    expect(by?.text).toMatch(/still National Insurance/);
    // The status counts a strain once, and a promise both broken and strained once, as broken.
    const game = gameWith();
    expect(status(game, EMPLOYER_NICS).broken).toBe(0);
    expect(status(game, EMPLOYER_NICS).strained).toBe(1);
    expect(status(game, { ...EMPLOYER_NICS, ...PENNY }).broken).toBe(1);
    expect(status(game, { ...EMPLOYER_NICS, ...PENNY }).strained).toBe(0);
  });

  it('strains the triple lock when pensioner benefits are cut below plan, and breaks it only by the lock levers (Phase 25)', () => {
    const lock = pm.promises.find((p) => p.id === 'triple-lock');
    if (!lock) throw new Error('no triple lock');
    // Most of the line is the state pension, but a cut could fall on pension credit or winter
    // fuel: the words of the lock may be kept, so amber, never red.
    for (const cut of [-0.5, -1, -5]) {
      expect(promiseBreaks({ wpens: cut }, [lock], ds.levers)[0]?.kept).toBe(true);
      const strain = promiseStrains({ wpens: cut }, [lock], ds.levers)[0];
      expect(strain?.strained).toBe(true);
      expect(strain?.strainedBy[0]?.text).toMatch(/state pension/);
    }
    expect(promiseStrains({ wpens: 1 }, [lock], ds.levers)[0]?.strained).toBe(false);
    expect(promiseBreaks({ cpilock: 1 }, [lock], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ pensmth: 1 }, [lock], ds.levers)[0]?.kept).toBe(false);
    const game = gameWith();
    expect(status(game, { wpens: -1 }).strained).toBe(1);
    expect(status(game, { wpens: -1 }).broken).toBe(0);
  });

  it('breaks the two-child promise when the limit is reinstated, and no other way', () => {
    const promise = pm.promises.find((p) => p.id === 'two-child');
    if (!promise) throw new Error('no two-child promise');
    expect(promiseBreaks({ rv2ch: 1 }, [promise], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ wuc: -5 }, [promise], ds.levers)[0]?.kept).toBe(true);
  });

  it('judges the fiscal-rules promise by the verdicts, since no lever names it', () => {
    const game = freshGame();
    const rulesPromise = (values: Record<string, number>) =>
      status(game, values).promises.find((p) => p.promise.id === 'fiscal-rules');
    expect(rulesPromise({})?.kept).toBe(true);
    // Everything expensive at once misses the stability rule.
    const broken = status(game, EVERYTHING_EXPENSIVE);
    expect(broken.promises.find((p) => p.promise.id === 'fiscal-rules')?.kept).toBe(false);
    // A missed rule is counted as a missed rule, where the rules are shown, not also as a broken
    // promise on the bar (Phase 25).
    expect(broken.broken).toBe(0);
  });

  it('knows where each promise comes from: only the manifesto’s own words are red lines (Phase 25)', () => {
    const origin = (id: string) => pm.promises.find((p) => p.id === id)?.origin;
    expect(origin('tax-lock')).toBe('manifesto-2024');
    expect(origin('ct-cap')).toBe('manifesto-2024');
    expect(origin('triple-lock')).toBe('manifesto-2024');
    expect(origin('two-child')).toBe('budget-2025');
    expect(origin('fiscal-rules')).toBe('government');
    // The triple lock now cites the manifesto's own words.
    const lock = pm.promises.find((p) => p.id === 'triple-lock');
    expect(lock?.sources.some((s) => s.sourceId === 'labour-manifesto-2024-opportunity')).toBe(
      true,
    );
    // A cut to defence or health can only strain, and is scored by no audience: it is counted
    // with the cuts it is.
    for (const [id, code] of [
      ['defence-path', 'mod'],
      ['nhs-18-weeks', 'dhsc'],
    ] as const) {
      const promise = pm.promises.find((p) => p.id === id);
      expect(promise?.breaks, id).toEqual([]);
      expect(
        promise?.strains.map((s) => [s.code, s.scored]),
        id,
      ).toEqual([[code, false]]);
    }
    const cut = status(freshGame(), { mod: -1, dhsc: -1 });
    expect(cut.broken).toBe(0);
    expect(cut.strains.filter((s) => s.strained).map((s) => s.promise.id)).toEqual([
      'defence-path',
      'nhs-18-weeks',
    ]);
  });

  it('holds every manifesto promise in force from the first screen to the last', () => {
    const s = status(freshGame(), {});
    expect(s.promises.map((p) => p.promise.id)).toEqual(pm.promises.map((p) => p.id));
    expect(s.broken).toBe(0);
    // A red line cannot be negotiated away: the data carries no push-backs or concessions.
    expect(pm.promises.every((p) => !('pushBack' in p))).toBe(true);
  });

  it('ranks only priorities the data knows, first three, in the order given', () => {
    const game = {
      ...freshGame(),
      priorities: ['nhs', 'prisons', 'defence', 'families', 'schools-send'],
    };
    expect(rankedPriorities(game, pm).map((p) => p.id)).toEqual(['nhs', 'defence', 'families']);
    expect(status(game, {}).priorities.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it('reads a priority delivered, settled lower, started or not funded from its options (Phase 25)', () => {
    const game = gameWith(['nhs', 'schools-send', 'families']);
    const s = status(game, { ...HEALTH_ABOVE_PLAN, dfe: 2 });
    const by = new Map(s.priorities.map((p) => [p.priority.id, p] as const));
    expect(by.get('nhs')?.status).toBe('delivered');
    // Chosen in full and trimmed short of it on step 4: settled lower, not delivered.
    expect(by.get('schools-send')?.status).toBe('settledLower');
    expect(by.get('families')?.status).toBe('notFunded');
    expect(s.delivered).toBe(1);
    expect(s.settledLower).toBe(1);
    expect(s.notFunded).toBe(1);
    // A way that only makes a start is a start, however it is ticked.
    const starts = status(game, { ...NHS_START, rvplan2: 1, ucfloor: 1 });
    expect(starts.priorities.map((p) => p.status)).toEqual(['started', 'started', 'started']);
    expect(starts.delivered).toBe(0);
    expect(starts.started).toBe(3);
    const health = by.get('nhs')?.options.find((o) => o.option.id === 'health-above-sr');
    expect(health?.state).toBe('on');
    const send = by.get('schools-send')?.options.find((o) => o.option.id === 'send-settlement');
    expect(send?.state).toBe('adjusted');
    // Overshooting the value still counts as delivering it.
    expect(deliversTarget(lever('dhsc'), 4, 3)).toBe(true);
    // A cut is delivered by going at least as far down.
    expect(deliversTarget(lever('fuel'), -10, -10)).toBe(true);
    expect(deliversTarget(lever('fuel'), -5, -10)).toBe(false);
    // Cutting a flagship's own budget is against it, and funds nothing.
    const cut = status(game, { dhsc: -2 });
    const cutHealth = cut.priorities[0]?.options.find((o) => o.option.id === 'health-above-sr');
    expect(cutHealth?.state).toBe('against');
    expect(cut.priorities[0]?.status).toBe('notFunded');
    expect(cutHealth?.spendingGbpm).toBe(0);
  });

  it('reads what each option puts behind its priority in the target year, and sums it', () => {
    const game = gameWith(['cost-of-living', 'defence']);
    const values = { bus2: 1, ...DEFENCE_GAP };
    const outcome = run(values);
    const s = ambitionStatus(game, pm, ds.options, outcome, ds.levers);
    // An option counts what its levers spend, less what they raise, in the target year.
    const target = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
    const net = (code: string) => {
      const e = outcome.leverEffects.find((x) => x.code === code);
      return (
        (e?.currentSpending[target] ?? 0) +
        (e?.capitalSpending[target] ?? 0) -
        (e?.receipts[target] ?? 0)
      );
    };
    for (const p of s.priorities) {
      for (const o of p.options) {
        const counted = o.state === 'on' || o.state === 'adjusted';
        const want = counted ? Object.keys(o.option.values).reduce((a, c) => a + net(c), 0) : 0;
        expect(o.spendingGbpm, o.option.id).toBeCloseTo(want, 6);
      }
      expect(p.spendingGbpm, p.priority.id).toBeCloseTo(
        p.options.reduce((a, o) => a + o.spendingGbpm, 0),
        6,
      );
      // A way in full delivers its priority; a start only makes a start.
      const on = p.options.filter((o) => o.state === 'on').map((o) => o.option.scale.kind);
      expect(p.status, p.priority.id).toBe(on.includes('full') ? 'delivered' : 'started');
    }
    expect(s.priorities.every((p) => p.spendingGbpm > 0)).toBe(true);
  });

  it('gives every option a sourced scale, and every priority a way to deliver it in full', () => {
    for (const option of ds.options.deliver) {
      expect(option.scale.badge).toBe('simulated');
      expect(option.scale.sources.length).toBeGreaterThan(0);
      expect(option.scale.why.split(/\s+/).length, option.id).toBeLessThanOrEqual(14);
    }
    for (const priority of pm.priorities) {
      expect(
        ds.options.deliver.some((o) => o.priority === priority.id && o.scale.kind === 'full'),
        priority.id,
      ).toBe(true);
    }
    // The defence plan's gap is the whole published bill: in full, whatever its size.
    expect(ds.options.deliver.find((o) => o.id === 'dip-gap')?.scale.kind).toBe('full');
  });
});
