import { describe, expect, it } from 'vitest';
import {
  BALANCE_SETTLED_GBPM,
  balanceFileSchema,
  balanceGbpm,
  balanceHolds,
  balanceState,
  cardOf,
  gameOutcomeOf,
  linesFigure,
  optionBack,
  optionNext,
  optionSteps,
  promiseBreaks,
  promiseStrains,
  smallPrint,
  validateDataset,
  type BalanceFile,
  type Lever,
} from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

/**
 * The balance page (ADR-0046): what a player saved by disagreeing is spent from one menu, what
 * they gave up is found from the other, and the headroom may not end below the Chancellor's. These
 * tests hold the menus to their sides on the engine, whichever levers the data puts on them.
 */
const ds = loadDataset();
const outcomeOf = gameOutcomeOf(ds);
const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
const lever = (code: string): Lever => {
  const found = byCode.get(code);
  if (!found) throw new Error(`no lever ${code}`);
  return found;
};
const balanceOf = (values: Record<string, number>) =>
  balanceGbpm(outcomeOf, outcomeOf(values), ds.levers);

/** Every value an option reaches, pressed again and again from where its lever rests. */
function presses(code: string, step: number): number[] {
  const out: number[] = [];
  let value = lever(code).control.default;
  for (;;) {
    const next = optionNext(lever(code), value, step);
    if (next === undefined) return out;
    out.push(next);
    value = next;
  }
}

/** What validate:data says of a copy of the menus changed by `patch`. */
function tamper(patch: (b: BalanceFile) => void): string {
  const copy: BalanceFile = structuredClone(ds.balance);
  patch(copy);
  return validateDataset({ ...ds, balance: copy }).join('\n');
}

describe('the money a player has to play with (ADR-0046)', () => {
  it('is nothing on the Chancellor’s Budget, and holds there', () => {
    expect(balanceOf({})).toBe(0);
    expect(balanceState(0)).toBe('settled');
    expect(balanceHolds(0)).toBe(true);
    expect(balanceState(-BALANCE_SETTLED_GBPM)).toBe('short');
    expect(balanceHolds(-BALANCE_SETTLED_GBPM)).toBe(false);
    expect(balanceState(BALANCE_SETTLED_GBPM)).toBe('spare');
  });

  it('goes below nothing when a tax rise is reversed, and above it when spending is', () => {
    const taxRises = ds.budget.themes
      .flatMap((t) => t.cards)
      .filter((c) => lever(c.lever).category === 'tax');
    const disagreed = (code: string) => balanceOf({ [code]: 1 });
    // Reversing the HMRC package gives its money up; reversing the extra admin cut does too, and
    // reversing the extra social homes, which are investment, saves only their interest.
    expect(disagreed('b6hmrc')).toBeLessThan(-1500);
    expect(disagreed('b6civil')).toBeLessThan(-500);
    expect(disagreed('b6ai')).toBeGreaterThan(100);
    expect(Math.abs(disagreed('b6homes'))).toBeLessThan(100);
    expect(taxRises.length).toBeGreaterThan(0);
  });
});

describe('the balance page’s menus (ADR-0046)', () => {
  it('passes validation as the data stands', () => {
    expect(balanceFileSchema.safeParse(ds.balance).success).toBe(true);
    expect(validateDataset(ds)).toEqual([]);
  });

  it('finds money with every press of a raise option, and spends it with every spend option', () => {
    for (const [side, sign] of [
      ['raise', 1],
      ['spend', -1],
    ] as const) {
      for (const option of ds.balance[side]) {
        let before = 0;
        let values: Record<string, number> = {};
        const reached = presses(option.code, option.step);
        expect(reached.length, option.code).toBeGreaterThan(0);
        for (const value of reached) {
          values = { [option.code]: value };
          const after = balanceOf(values);
          // Each press moves the money its menu's way by at least what the page calls a move.
          expect(
            sign * (after - before),
            `${side} ${option.code} at ${value}`,
          ).toBeGreaterThanOrEqual(BALANCE_SETTLED_GBPM);
          before = after;
        }
      }
    }
  });

  it('breaks no promise however far an option goes; a strain is allowed and shown', () => {
    const strained: string[] = [];
    for (const option of [...ds.balance.raise, ...ds.balance.spend]) {
      const last = presses(option.code, option.step).at(-1) ?? 0;
      const values = { [option.code]: last };
      const broken = promiseBreaks(values, ds.pm.promises, ds.levers).filter((p) => !p.kept);
      expect(
        broken.map((p) => p.promise.id),
        option.code,
      ).toEqual([]);
      if (promiseStrains(values, ds.pm.promises, ds.levers).some((p) => p.strained)) {
        strained.push(option.code);
      }
    }
    // Employer National Insurance keeps the tax lock's words and strains its spirit.
    expect(strained).toContain('nicer');
  });

  it('refuses a lever a card asks about, investment, a toggle stepped by two, or a step off the lever', () => {
    expect(
      tamper((b) => {
        b.raise[0] = { ...b.raise[0]!, code: 'b6save', step: 1 };
      }),
    ).toMatch(/b6save is a measure's lever/);
    expect(
      tamper((b) => {
        b.spend[0] = { ...b.spend[0]!, code: 'cdel', step: 5 };
      }),
    ).toMatch(/cdel is investment/);
    expect(
      tamper((b) => {
        b.spend[0] = { ...b.spend[0]!, code: 'ufsm', step: 2 };
      }),
    ).toMatch(/ufsm switches a toggle on with a step of 2/);
    expect(
      tamper((b) => {
        b.spend[0] = { ...b.spend[0]!, code: 'dhsc', step: 0.3 };
      }),
    ).toMatch(/dhsc's first step, 0.3, is off the lever \(steps\)/);
    expect(
      tamper((b) => {
        b.raise[0] = { ...b.raise[0]!, code: 'nosuch' };
      }),
    ).toMatch(/nosuch names an unknown lever/);
  });

  it('offers a lever once, on one menu', () => {
    const twice = structuredClone(ds.balance);
    twice.spend.push({ ...twice.raise[0]! });
    expect(balanceFileSchema.safeParse(twice).success).toBe(false);
  });
});

describe('an option pressed again and again', () => {
  it('steps along the lever’s own grid, and stops at the end of its range', () => {
    const dhsc = lever('dhsc');
    expect(optionNext(dhsc, 0, 1)).toBe(1);
    expect(optionNext(dhsc, 9.5, 1)).toBeUndefined();
    expect(optionNext(dhsc, 9, 1)).toBe(10);
    expect(optionSteps(dhsc, 3, 1)).toBe(3);
    expect(optionBack(dhsc, 3, 1)).toBe(2);
    // A value moved the other way is not the option's to take back.
    expect(optionSteps(dhsc, -2, 1)).toBe(0);
    expect(optionBack(dhsc, -2, 1)).toBeUndefined();
    // Half a point at a time, with no float's dust.
    const nicm = lever('nicm');
    expect(optionNext(nicm, -0.5, -0.5)).toBe(-1);
    expect(optionSteps(nicm, -1.5, -0.5)).toBe(3);
  });

  it('switches a toggle on once, and back off', () => {
    const ufsm = lever('ufsm');
    expect(optionNext(ufsm, 0, 1)).toBe(1);
    expect(optionNext(ufsm, 1, 1)).toBeUndefined();
    expect(optionSteps(ufsm, 1, 1)).toBe(1);
    expect(optionBack(ufsm, 1, 1)).toBe(0);
  });
});

describe('the walk through the measures (ADR-0046)', () => {
  const scorecard = loadExtracts().scorecards?.[ds.budget.scorecard];
  if (!scorecard) throw new Error('no extract');

  it('asks about every measure a player can reverse once, a few cards a page', () => {
    const cards = ds.budget.themes.flatMap((t) => t.cards);
    const reversible = new Set(
      ds.budget.measures.flatMap((m) => (m.leverCode ? [m.leverCode] : [])),
    );
    expect(new Set(cards.map((c) => c.lever))).toEqual(reversible);
    expect(cards.length).toBe(reversible.size);
    for (const theme of ds.budget.themes)
      expect(theme.cards.length, theme.id).toBeLessThanOrEqual(8);
    for (const code of reversible) expect(cardOf(ds.budget, code), code).toBeDefined();
  });

  it('leaves the rest to the small print, every one of them once', () => {
    const small = smallPrint(ds.budget);
    expect(small.every((m) => !m.leverCode)).toBe(true);
    expect(small.length + ds.budget.measures.filter((m) => m.leverCode).length).toBe(
      ds.budget.measures.length,
    );
  });

  it('sums a card’s lines into one figure, on the scorecard’s own sign', () => {
    // The high street reliefs are three lines, over before the year the rules bite.
    const lines = ds.budget.measures.filter((m) => m.leverCode === 'b6brr').map((m) => m.line);
    expect(lines.length).toBe(3);
    const figure = linesFigure(scorecard, lines, '2029-30');
    expect(figure?.group).toBe('taxCut');
    expect(figure?.words).toMatch(/^nothing in 2029-30; costs £\d\.\dbn in 20\d\d-\d\d$/);
  });

  it('refuses a measure’s lever on no card, and a card that reverses nothing', () => {
    const copy = structuredClone(ds.budget);
    const first = copy.themes[0]!;
    const dropped = first.cards.shift()!;
    first.cards.push({ ...dropped, lever: 'dhsc' });
    const said = validateDataset({ ...ds, budget: copy }).join('\n');
    expect(said).toMatch(new RegExp(`lever ${dropped.lever} is on no card`));
    expect(said).toMatch(/budget card dhsc in income reverses no measure/);
  });
});
