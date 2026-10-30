import { describe, expect, it } from 'vitest';
import {
  FINAL_STAGE,
  LEGACY_STAGE,
  ROAD,
  SIX_STAGE,
  THREE_STAGE,
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
  vintageCode: 'obr2610',
  rulesCode: 'ch2602',
  implementationYear: '2027-28',
  leverValues: {},
  debtInterestFeedback: true,
  assessAsOf: 'vintage',
};

describe('the playthrough in the link (g=, Phase 24; three stages since ADR-0045)', () => {
  it('writes nothing new for a Budget with no game, so old links are byte for byte the same', () => {
    expect(encodePermalink(base, ds.levers)).toBe('v=1&f=obr2610&r=ch2602&i=2027');
    const q = encodePermalink({ ...base, leverValues: { itbr: 1 } }, ds.levers);
    expect(q).not.toContain('g=');
    expect(q).not.toContain('S=');
  });

  it('round-trips a whole game: how far it has got, on this road', () => {
    const game: GamePermalink = { reached: 1 };
    const q = encodePermalink(
      { ...base, leverValues: { itbr: 1, rate: 0.75, rpi: 0.5 }, game },
      ds.levers,
    );
    expect(q).toContain(`g=st.1_rd.${ROAD}`);
    const { state, warnings } = decodePermalink(q, ds.levers);
    expect(warnings).toEqual([]);
    expect(state.game).toEqual(game);
    expect(state.leverValues).toEqual({ itbr: 1, rate: 0.75, rpi: 0.5 });
  });

  it('always writes the stage and the road, so a g= marks a game even on the walk', () => {
    expect(ROAD).toBe(3);
    expect(encodeGame(freshGame())).toBe('st.0_rd.3');
    expect(encodeGame({ reached: 3 })).toBe('st.3_rd.3');
    expect(decodePermalink('v=1&g=st.0_rd.3', ds.levers).state.game).toEqual(freshGame());
  });

  it('keeps the stage inside the road', () => {
    expect(decodePermalink('v=1&g=st.9_rd.3', ds.levers).state.game?.reached).toBe(FINAL_STAGE);
    expect(decodePermalink('v=1&g=st.-2_rd.3', ds.levers).state.game?.reached).toBe(0);
    expect(decodePermalink('v=1&g=st.x_rd.3', ds.levers).state.game).toEqual({ reached: 0 });
  });

  it('opens a link from the three-stage road on the stage that took its place', () => {
    // Fine-tuning opens the walk through the measures; the review and Budget day keep their place,
    // so a Budget shared from that road is still finished (ADR-0046).
    expect(THREE_STAGE).toEqual([0, 2, 3]);
    for (let st = 0; st <= 2; st += 1) {
      const { state, warnings } = decodePermalink(`v=1&g=st.${st}_rd.2`, ds.levers);
      expect(warnings, `st.${st}`).toEqual([]);
      expect(state.game, `st.${st}`).toEqual({ reached: THREE_STAGE[st] });
    }
    expect(decodePermalink('v=1&g=st.2_rd.2', ds.levers).state.game?.reached).toBe(FINAL_STAGE);
  });

  it('opens a link from the six-stage road through the three-stage one, its priorities dropped', () => {
    // The briefing, the priorities and the flagships open the walk; the rest keep their place.
    expect(SIX_STAGE).toEqual([0, 0, 0, 0, 1, 2]);
    for (let st = 0; st <= 5; st += 1) {
      const { state, warnings } = decodePermalink(`v=1&g=st.${st}_pr.defence+nhs`, ds.levers);
      expect(warnings, `st.${st}`).toEqual([]);
      expect(state.game, `st.${st}`).toEqual({ reached: THREE_STAGE[SIX_STAGE[st] ?? 0] });
    }
    expect(decodePermalink('v=1&g=st.4', ds.levers).state.game?.reached).toBe(2);
    expect(decodePermalink('v=1&g=st.5', ds.levers).state.game?.reached).toBe(FINAL_STAGE);
    // A stage past that road's end still ends the game.
    expect(decodePermalink('v=1&g=st.9', ds.levers).state.game?.reached).toBe(FINAL_STAGE);
  });

  it('opens a link from before Phase 24 through both roads, silently', () => {
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
        reached: THREE_STAGE[SIX_STAGE[LEGACY_STAGE[st] ?? 0] ?? 0],
      });
    }
    // The forecast opens the walk; the compromises and the add-ons the review, short of Budget
    // day; a finished Budget stays finished.
    expect(read(3).state.game?.reached).toBe(0);
    expect(read(5).state.game?.reached).toBe(2);
    expect(read(6).state.game?.reached).toBe(FINAL_STAGE);
    // The retired fields are gone from the type, and the snapshot is not read.
    expect(Object.keys(read(6).state.game ?? {})).toEqual(['reached']);
    expect(Object.keys(read(6).state)).not.toContain('snapshot');
  });

  it('opens a Phase 8 link: the theme and the negotiation ignored', () => {
    const { state, warnings } = decodePermalink(
      'v=1&g=s.9_st.2_th.security_pr.prisons_pp.tax-lock+ct-cap_cn.tax-lock-narrowed_cp.2_dp.dip-gap',
      ds.levers,
    );
    expect(warnings).toEqual([]);
    expect(state.game).toEqual({ reached: 0 });
  });

  it('treats a g= with nothing it can read as a link without a game', () => {
    const { state, warnings } = decodePermalink('v=1&g=nonsense', ds.levers);
    expect(state.game).toBeUndefined();
    expect(warnings.some((w) => /nothing in it could be read/.test(w))).toBe(true);
  });

  it('ignores items it does not know, so a newer link still opens', () => {
    const { state } = decodePermalink('v=1&g=st.2_rd.3_zz.9_pr.ufsm', ds.levers);
    expect(state.game).toEqual({ reached: 2 });
  });

  it('reads a game from its priorities alone, as a link that only ranked them once was', () => {
    const warnings: string[] = [];
    expect(decodeGame('pr.defence+nhs', warnings)).toEqual({ reached: 0 });
    expect(warnings).toEqual([]);
  });
});
