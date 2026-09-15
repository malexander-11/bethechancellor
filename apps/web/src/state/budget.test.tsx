import { describe, expect, it } from 'vitest';
import { initialStateFromLocation, permalinkQuery, reducer } from './budget';

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
});
