import { describe, expect, it } from 'vitest';
import { ambitionStatus, computeOutcome, promiseBreaks, promiseStrains } from '../src/index.js';
import { loadDataset } from './fixtures.js';
import { EMPLOYER_NICS, EVERYTHING_EXPENSIVE, PENNY, type Budget } from './scenarios.js';

const ds = loadDataset();
const pm = ds.pm;
const run = (leverValues: Budget) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const status = (values: Budget) => ambitionStatus(pm, run(values), ds.levers);

describe('the promises against the package', () => {
  it('breaks the tax lock on a higher headline rate or a lower allowance (ADR-0042)', () => {
    const lock = pm.promises.find((p) => p.id === 'tax-lock');
    if (!lock) throw new Error('no tax lock');
    expect(promiseBreaks({ itbr: 1 }, [lock], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ vats: 1 }, [lock], ds.levers)[0]?.brokenBy).toEqual([
      { code: 'vats', value: 1 },
    ]);
    // A cut in a rate is not a rise.
    expect(promiseBreaks({ itbr: -1 }, [lock], ds.levers)[0]?.kept).toBe(true);
    // A lower allowance asks more of every taxpayer at the same rates, so it breaks the lock too;
    // a higher one asks less and breaks nothing.
    expect(promiseBreaks({ itpa: -500 }, [lock], ds.levers)[0]?.brokenBy).toEqual([
      { code: 'itpa', value: -500 },
    ]);
    expect(promiseBreaks({ itpa: 500 }, [lock], ds.levers)[0]?.kept).toBe(true);
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
    expect(status(EMPLOYER_NICS).broken).toBe(0);
    expect(status(EMPLOYER_NICS).strained).toBe(1);
    expect(status({ ...EMPLOYER_NICS, ...PENNY }).broken).toBe(1);
    expect(status({ ...EMPLOYER_NICS, ...PENNY }).strained).toBe(0);
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
    expect(status({ wpens: -1 }).strained).toBe(1);
    expect(status({ wpens: -1 }).broken).toBe(0);
  });

  it('breaks the two-child promise when the limit is reinstated, and no other way', () => {
    const promise = pm.promises.find((p) => p.id === 'two-child');
    if (!promise) throw new Error('no two-child promise');
    expect(promiseBreaks({ rv2ch: 1 }, [promise], ds.levers)[0]?.kept).toBe(false);
    expect(promiseBreaks({ wuc: -5 }, [promise], ds.levers)[0]?.kept).toBe(true);
  });

  it('judges the fiscal-rules promise by the verdicts, since no lever names it', () => {
    const rulesPromise = (values: Record<string, number>) =>
      status(values).promises.find((p) => p.promise.id === 'fiscal-rules');
    expect(rulesPromise({})?.kept).toBe(true);
    // Everything expensive at once misses the stability rule.
    const broken = status(EVERYTHING_EXPENSIVE);
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
    const cut = status({ mod: -1, dhsc: -1 });
    expect(cut.broken).toBe(0);
    expect(cut.strains.filter((s) => s.strained).map((s) => s.promise.id)).toEqual([
      'defence-path',
      'nhs-18-weeks',
    ]);
  });

  it('holds every manifesto promise in force from the first screen to the last', () => {
    const s = status({});
    expect(s.promises.map((p) => p.promise.id)).toEqual(pm.promises.map((p) => p.id));
    expect(s.broken).toBe(0);
    // A red line cannot be negotiated away: the data carries no push-backs or concessions.
    expect(pm.promises.every((p) => !('pushBack' in p))).toBe(true);
    // The priorities agreed with the Prime Minister retired with the Chancellor's Budget as the
    // starting point (ADR-0045): the file carries promises and the sign-off, nothing to rank.
    expect('priorities' in pm).toBe(false);
  });
});
