import { describe, expect, it } from 'vitest';
import { FINAL_STAGE, enterable, freshGame, furthestStep, stageIndex } from '../src/index.js';

const game = (reached: number) => ({ ...freshGame(7), reached });

describe('the road through the game', () => {
  it('opens a stage once the one before it has been left, and never sooner', () => {
    expect(enterable('pm', game(0))).toBe(false);
    expect(enterable('pm', game(1))).toBe(true);
    expect(enterable('taxes', game(1))).toBe(false);
    expect(enterable('spending', game(2))).toBe(true);
    expect(enterable('policies', game(2))).toBe(true);
    expect(enterable('forecast', game(2))).toBe(false);
    expect(enterable('forecast', game(3))).toBe(true);
    expect(enterable('compromise', game(3))).toBe(false);
    expect(enterable('compromise', game(4))).toBe(true);
    expect(enterable('rabbit', game(4))).toBe(false);
    expect(enterable('rabbit', game(5))).toBe(true);
  });

  it('opens Budget day from the rabbit, because reached only becomes final at the close', () => {
    expect(enterable('budget-day', game(4))).toBe(false);
    expect(enterable('budget-day', game(5))).toBe(true);
    expect(enterable('budget-day', game(FINAL_STAGE))).toBe(true);
  });

  it('always lets you go back, and always opens the start and the outlook', () => {
    for (let reached = 0; reached <= FINAL_STAGE; reached += 1) {
      expect(enterable('start', game(reached))).toBe(true);
      expect(enterable('outlook', game(reached))).toBe(true);
      expect(enterable('assumptions', game(reached))).toBe(true);
    }
    expect(enterable('taxes', game(FINAL_STAGE))).toBe(true);
    expect(enterable('pm', game(FINAL_STAGE))).toBe(true);
  });

  it('treats a link with no game as a sandbox: the desk and Budget day open, the story shut', () => {
    for (const step of ['outlook', 'taxes', 'spending', 'policies', 'budget-day'] as const) {
      expect(enterable(step, undefined), step).toBe(true);
    }
    for (const step of ['pm', 'forecast', 'compromise', 'rabbit'] as const) {
      expect(enterable(step, undefined), step).toBe(false);
    }
  });

  it('sends an early arrival to the furthest open stage', () => {
    expect(furthestStep(undefined)).toBe('outlook');
    expect(furthestStep(game(0))).toBe('outlook');
    expect(furthestStep(game(1))).toBe('pm');
    expect(furthestStep(game(2))).toBe('taxes');
    expect(furthestStep(game(3))).toBe('forecast');
    expect(furthestStep(game(4))).toBe('compromise');
    expect(furthestStep(game(5))).toBe('budget-day');
    expect(furthestStep(game(FINAL_STAGE))).toBe('budget-day');
    expect(stageIndex(furthestStep(game(4)))).toBe(4);
  });
});
