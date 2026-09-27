import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_WARNING,
  initialStateFromLocation,
  isJourneyPath,
  onEstimate,
  permalinkQuery,
  reducer,
} from './budget';

describe('budget state', () => {
  it('hydrates from a permalink and encodes back to the same query', () => {
    const state = initialStateFromLocation('?v=1&f=obr2603&r=ch2602&i=2027&M=rate.0.75&o=nb1');
    expect(state.leverValues).toEqual({ rate: 0.75 });
    expect(state.assessAsOf).toBe('nextBudget');
    expect(permalinkQuery(state)).toBe('v=1&f=obr2603&r=ch2602&i=2027&M=rate.0.75&o=nb1');
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
    const started = reducer(sandbox, { type: 'startGame' });
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
    // A sandbox link keeps whatever economy it carried, the March forecast included.
    const sandbox = initialStateFromLocation('?L=itbr.1');
    expect(sandbox.leverValues).toEqual({ itbr: 1 });
    expect(sandbox.warnings).toEqual([]);
  });
});
