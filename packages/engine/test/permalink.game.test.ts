import { describe, expect, it } from 'vitest';
import {
  FINAL_STAGE,
  LEGACY_STAGE,
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

describe('the playthrough in the link (g=, Phase 24)', () => {
  it('writes nothing new for a Budget with no game, so old links are byte for byte the same', () => {
    expect(encodePermalink(base, ds.levers)).toBe('v=1&f=obr2603&r=ch2602&i=2027');
    const q = encodePermalink({ ...base, leverValues: { itbr: 1 } }, ds.levers);
    expect(q).not.toContain('g=');
    expect(q).not.toContain('S=');
  });

  it('round-trips a whole game: how far it has got and what was agreed', () => {
    const game: GamePermalink = { reached: 4, priorities: ['cost-of-living', 'defence'] };
    const q = encodePermalink(
      { ...base, leverValues: { itbr: 1, rate: 0.75, rpi: 0.5 }, game },
      ds.levers,
    );
    const { state, warnings } = decodePermalink(q, ds.levers);
    expect(warnings).toEqual([]);
    expect(state.game).toEqual(game);
    expect(state.leverValues).toEqual({ itbr: 1, rate: 0.75, rpi: 0.5 });
  });

  it('always writes the stage, so a g= marks a game even at the briefing', () => {
    expect(encodeGame(freshGame())).toBe('st.0');
    expect(encodeGame({ reached: 3, priorities: [] })).toBe('st.3');
    expect(encodeGame({ reached: 2, priorities: ['defence', 'cost-of-living'] })).toBe(
      'st.2_pr.defence+cost-of-living',
    );
    expect(decodePermalink('v=1&g=st.0', ds.levers).state.game).toEqual(freshGame());
  });

  it('keeps the stage inside the road', () => {
    expect(decodePermalink('v=1&g=st.9', ds.levers).state.game?.reached).toBe(FINAL_STAGE);
    expect(decodePermalink('v=1&g=st.-2', ds.levers).state.game?.reached).toBe(0);
    expect(decodePermalink('v=1&g=st.x_pr.nhs', ds.levers).state.game).toEqual({
      reached: 0,
      priorities: ['nhs'],
    });
  });

  it('opens a link from before Phase 24 on the stage that took its place, silently', () => {
    // Every Phase 8 to 23 game carried a seed and seven stages.
    expect(LEGACY_STAGE).toEqual([0, 1, 2, 3, 4, 4, 5]);
    const read = (st: number) =>
      decodePermalink(
        `v=1&g=s.417_st.${st}_pl.adviser_hr.30_pr.defence_dl.ufsm-2028_rv.1_rb.pubs_br.1&S=itbr.2`,
        ds.levers,
      );
    for (let st = 0; st <= 6; st += 1) {
      const { state, warnings } = read(st);
      expect(warnings, `st.${st}`).toEqual([]);
      expect(state.game, `st.${st}`).toEqual({
        reached: LEGACY_STAGE[st],
        priorities: ['defence'],
      });
    }
    // The forecast opens fine-tuning; the compromises and the add-ons the review, short of Budget
    // day; a finished Budget stays finished.
    expect(read(3).state.game?.reached).toBe(3);
    expect(read(5).state.game?.reached).toBe(4);
    expect(read(6).state.game?.reached).toBe(FINAL_STAGE);
    // The retired fields are gone from the type, and the snapshot is not read.
    expect(Object.keys(read(6).state.game ?? {}).sort()).toEqual(['priorities', 'reached']);
    expect(Object.keys(read(6).state)).not.toContain('snapshot');
  });

  it('opens a Phase 8 link: a theme reads as the priority that replaced it, the negotiation ignored', () => {
    const { state, warnings } = decodePermalink(
      'v=1&g=s.9_st.2_th.security_pr.prisons_pp.tax-lock+ct-cap_cn.tax-lock-narrowed_cp.2_dp.dip-gap',
      ds.levers,
    );
    expect(warnings).toEqual([]);
    // The theme leads; the old flagship id is kept here and dropped by rankedPriorities.
    expect(state.game).toEqual({ reached: 2, priorities: ['defence', 'prisons'] });
  });

  it('treats a g= with nothing it can read as a link without a game', () => {
    const { state, warnings } = decodePermalink('v=1&g=nonsense', ds.levers);
    expect(state.game).toBeUndefined();
    expect(warnings.some((w) => /nothing in it could be read/.test(w))).toBe(true);
  });

  it('ignores items it does not know, so a newer link still opens', () => {
    const { state } = decodePermalink('v=1&g=st.2_zz.9_pr.ufsm', ds.levers);
    expect(state.game).toEqual({ reached: 2, priorities: ['ufsm'] });
  });
});

describe('a list typed by hand', () => {
  it('reads a space where a browser turned a plus into one', () => {
    const warnings: string[] = [];
    const g = decodeGame('st.1_th.security_pr.dip-gap prisons', warnings);
    expect(g?.priorities).toEqual(['defence', 'dip-gap', 'prisons']);
    expect(warnings).toEqual([]);
  });
});
