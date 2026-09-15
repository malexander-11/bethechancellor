import { describe, expect, it } from 'vitest';
import { initialStateFromLocation, isJourneyPath, permalinkQuery, reducer } from './budget';

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
});
