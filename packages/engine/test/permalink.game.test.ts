import { describe, expect, it } from 'vitest';
import {
  decodeGame,
  decodePermalink,
  encodeGame,
  encodePermalink,
  freshGame,
  type GamePermalink,
  type PermalinkState,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const base: PermalinkState = {
  vintageCode: 'obr2603',
  rulesCode: 'ch2602',
  implementationYear: '2027-28',
  leverValues: {},
  debtInterestFeedback: true,
  assessAsOf: 'vintage',
};

describe('the playthrough in the link (g= and S=)', () => {
  it('writes nothing new for a Budget with no game, so old links are byte for byte the same', () => {
    expect(encodePermalink(base, ds.levers)).toBe('v=1&f=obr2603&r=ch2602&i=2027');
    const q = encodePermalink({ ...base, leverValues: { itbr: 1 } }, ds.levers);
    expect(q).not.toContain('g=');
    expect(q).not.toContain('S=');
  });

  it('round-trips a whole game and its snapshot', () => {
    const game: GamePermalink = {
      ...freshGame(417),
      reached: 5,
      planning: 'adviser',
      headroomTargetBn: 30,
      theme: 'cost-of-living',
      priorities: ['ufsm', 'dip47'],
      protectedPromises: ['tax-lock', 'ct-cap'],
      concessions: ['income-tax-on-the-table'],
      capital: 1,
      delays: { ufsm: '2028-29', dhsc: '2029-30' },
      revealed: true,
      rabbit: 'flagship:ufsm',
      breachAccepted: true,
    };
    const q = encodePermalink(
      { ...base, leverValues: { itbr: 1, rate: 0.75 }, game, snapshot: { itbr: 2, ufsm: 1 } },
      ds.levers,
    );
    const { state, warnings } = decodePermalink(q, ds.levers);
    expect(warnings).toEqual([]);
    expect(state.game).toEqual(game);
    expect(state.snapshot).toEqual({ itbr: 2, ufsm: 1 });
    expect(state.leverValues).toEqual({ itbr: 1, rate: 0.75 });
  });

  it('writes only what differs from a fresh game', () => {
    expect(encodeGame(freshGame(7))).toBe('s.7');
    expect(encodeGame({ ...freshGame(7), revealed: true, reached: 3 })).toBe('s.7_st.3_rv.1');
  });

  it('treats a link without a usable seed as a link without a game', () => {
    const { state, warnings } = decodePermalink('v=1&g=s.0_st.3', ds.levers);
    expect(state.game).toBeUndefined();
    expect(warnings.some((w) => /seed/.test(w))).toBe(true);
    expect(decodePermalink('v=1&g=nonsense', ds.levers).state.game).toBeUndefined();
  });

  it('ignores items it does not know, so a newer link still opens', () => {
    const { state } = decodePermalink('v=1&g=s.5_zz.9_pr.ufsm', ds.levers);
    expect(state.game?.seed).toBe(5);
    expect(state.game?.priorities).toEqual(['ufsm']);
  });

  it('drops a snapshot code that is not a lever, with a warning, and keeps the rest', () => {
    const { state, warnings } = decodePermalink('v=1&S=itbr.2_zzz.1', ds.levers);
    expect(state.snapshot).toEqual({ itbr: 2 });
    expect(warnings.some((w) => /zzz/.test(w))).toBe(true);
  });
});

describe('a list typed by hand', () => {
  it('reads a space where a browser turned a plus into one', () => {
    const warnings: string[] = [];
    const g = decodeGame('s.7_st.1_th.security_pr.dip-gap prisons', warnings);
    expect(g?.priorities).toEqual(['dip-gap', 'prisons']);
    expect(warnings).toEqual([]);
  });
});
