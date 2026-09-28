import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_WARNING,
  EXPERT_WARNING,
  MEASURES_NOTE,
  initialStateFromLocation,
  isJourneyPath,
  onEstimate,
  permalinkQuery,
  reducer,
} from './budget';

describe('budget state', () => {
  it('hydrates from a permalink and encodes back to the same query', () => {
    const query = 'v=1&f=obr2603&r=ch2602&i=2027&L=itbr.1&M=rate.0.75_rpi.0.5&g=st.3_pr.defence';
    const state = initialStateFromLocation(`?${query}`);
    expect(state.leverValues).toEqual({ itbr: 1, rate: 0.75, rpi: 0.5 });
    expect(state.game).toEqual({ reached: 3, priorities: ['defence'] });
    expect(state.warnings).toEqual([]);
    expect(permalinkQuery(state)).toBe(query);
  });

  it('reads a link that set a retired expert switch without it, and says so', () => {
    // Interest on the Budget's own borrowing is always counted, and the rules are the rules as
    // they stand (Phase 26): an old link's o= flags are dropped, with one line to say why.
    for (const flag of ['nb1', 'dif0']) {
      const state = initialStateFromLocation(
        `?v=1&f=obr2603&r=ch2602&i=2027&M=rate.0.75&o=${flag}`,
      );
      expect(state.debtInterestFeedback).toBe(true);
      expect(state.assessAsOf).toBe('vintage');
      expect(state.warnings).toEqual([EXPERT_WARNING]);
      expect(permalinkQuery(state)).toBe('v=1&f=obr2603&r=ch2602&i=2027&M=rate.0.75');
    }
  });

  it('drops a lever from the URL when it returns to the OBR default', () => {
    const start = initialStateFromLocation('');
    const moved = reducer(start, { type: 'setLever', code: 'rate', value: 0.5 });
    expect(moved.leverValues).toEqual({ rate: 0.5 });
    const back = reducer(moved, { type: 'setLever', code: 'rate', value: 0 });
    expect(back.leverValues).toEqual({});
    expect(permalinkQuery(back)).toBe('v=1&f=obr2603&r=ch2602&i=2027');
  });

  it('merges several settings at once and drops those back at the OBR default', () => {
    const start = initialStateFromLocation('?L=itbr.1');
    const merged = reducer(start, { type: 'setLevers', values: { rate: 0.75, rpi: 0.5, ngdp: 0 } });
    expect(merged.leverValues).toEqual({ itbr: 1, rate: 0.75, rpi: 0.5 });
    const cleared = reducer(merged, { type: 'setLevers', values: { rate: 0, rpi: 0 } });
    expect(cleared.leverValues).toEqual({ itbr: 1 });
  });

  it('keeps the budget in the URL on every journey page but not the reference pages', () => {
    for (const path of [
      '/',
      '/assumptions',
      '/budget/deliver',
      '/budget/deliver/2',
      '/finetune/tax',
      '/finetune/spending',
      '/review',
      '/budget/taxes',
      '/budget/spending',
      '/budget-day',
      '/b',
    ]) {
      expect(isJourneyPath(path)).toBe(true);
    }
    expect(isJourneyPath('/methodology')).toBe(false);
    expect(isJourneyPath('/about')).toBe(false);
  });

  it('starts a game on today’s estimate, and keeps a game under way as it is', () => {
    const sandbox = initialStateFromLocation('?L=itbr.1&M=rate.0.25');
    expect(sandbox.warnings).toEqual([MEASURES_NOTE]);
    const started = reducer(sandbox, { type: 'startGame' });
    // The measures are in the game now, so the note that promised them has done its job.
    expect(started.warnings).toEqual([]);
    expect(started.game).toEqual({ reached: 0, priorities: [] });
    // Whatever economy the sandbox had, the game plays on the estimate; the policy stays.
    expect(started.leverValues).toEqual({ itbr: 1, rate: 0.75, rpi: 0.5 });
    expect(onEstimate(started.leverValues)).toBe(true);
    const playing = { ...started, game: { reached: 3, priorities: ['defence'] } };
    expect(reducer(playing, { type: 'startGame' }).game).toEqual(playing.game);
  });

  it('puts every lever back without ending the game or touching the economy', () => {
    const state = initialStateFromLocation(
      '?g=st.3_pr.defence&M=rate.0.75_rpi.0.5&L=itbr.1_moj.10',
    );
    const back = reducer(state, { type: 'resetPolicy' });
    expect(back.leverValues).toEqual({ rate: 0.75, rpi: 0.5 });
    expect(back.game).toEqual({ reached: 3, priorities: ['defence'] });
    // A reset proper ends the game and the economy with it.
    const gone = reducer(state, { type: 'reset' });
    expect(gone.game).toBeUndefined();
    expect(gone.leverValues).toEqual({});
  });

  it('opens every game on today’s estimate, saying so when the link carried other figures', () => {
    // A game on the estimate opens as it was, with nothing to say.
    const fine = initialStateFromLocation('?g=st.2&M=rate.0.75_rpi.0.5&L=moj.10');
    expect(fine.leverValues).toEqual({ moj: 10, rate: 0.75, rpi: 0.5 });
    expect(fine.warnings).toEqual([]);
    // A Phase 23 game drew its own forecast and kept a snapshot: both give way to the estimate.
    const old = initialStateFromLocation(
      '?g=s.417_st.5_pl.pessimistic_hr.30_pr.defence_rb.pubs&M=rate.0.75_rpi.1&L=moj.10&S=moj.10',
    );
    expect(old.game).toEqual({ reached: 4, priorities: ['defence'] });
    expect(old.leverValues).toEqual({ moj: 10, rate: 0.75, rpi: 0.5 });
    expect(old.warnings).toEqual([ESTIMATE_WARNING]);
    expect(permalinkQuery(old)).not.toContain('S=');
    // A link with no game opens the briefing (Phase 26): its measures wait for the game it
    // starts, and one line says so. An economy alone is not a measure, and needs no line.
    const measures = initialStateFromLocation('?L=itbr.1');
    expect(measures.leverValues).toEqual({ itbr: 1 });
    expect(measures.warnings).toEqual([MEASURES_NOTE]);
    expect(initialStateFromLocation('?M=rate.0.25').warnings).toEqual([]);
  });
});
