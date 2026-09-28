import { describe, expect, it } from 'vitest';
import {
  FINAL_STAGE,
  GAME_STAGES,
  enterable,
  freshGame,
  furthestStep,
  journeyStepSchema,
  stageIndex,
} from '../src/index.js';

const game = (reached: number) => ({ ...freshGame(), reached });

describe('the road through the game (Phase 24: six steps)', () => {
  it('has six stages, from the briefing to the feedback', () => {
    expect(GAME_STAGES).toEqual(['outlook', 'pm', 'deliver', 'finetune', 'review', 'budget-day']);
    expect(FINAL_STAGE).toBe(5);
  });

  it('opens a stage once the one before it has been left, and never sooner', () => {
    expect(enterable('pm', game(0))).toBe(false);
    expect(enterable('pm', game(1))).toBe(true);
    expect(enterable('deliver', game(1))).toBe(false);
    expect(enterable('deliver', game(2))).toBe(true);
    expect(enterable('finetune', game(2))).toBe(false);
    expect(enterable('finetune', game(3))).toBe(true);
    // The desk is fine-tuning's side room: it opens with it.
    expect(enterable('taxes', game(2))).toBe(false);
    expect(enterable('spending', game(3))).toBe(true);
    expect(stageIndex('taxes')).toBe(stageIndex('finetune'));
    expect(stageIndex('spending')).toBe(3);
    expect(enterable('review', game(3))).toBe(false);
    expect(enterable('review', game(4))).toBe(true);
  });

  it('has no step for what Phase 24 retired: their old addresses open the review', () => {
    for (const step of ['afford', 'forecast', 'compromise', 'rabbit']) {
      expect(journeyStepSchema.safeParse(step).success, step).toBe(false);
    }
  });

  it('opens Budget day from the review, because reached only becomes final on delivering', () => {
    expect(enterable('budget-day', game(3))).toBe(false);
    expect(enterable('budget-day', game(4))).toBe(true);
    expect(enterable('budget-day', game(FINAL_STAGE))).toBe(true);
  });

  it('always lets you go back, and always opens the start and the briefing', () => {
    for (let reached = 0; reached <= FINAL_STAGE; reached += 1) {
      expect(enterable('start', game(reached))).toBe(true);
      expect(enterable('outlook', game(reached))).toBe(true);
      expect(enterable('assumptions', game(reached))).toBe(true);
    }
    expect(enterable('taxes', game(FINAL_STAGE))).toBe(true);
    expect(enterable('pm', game(FINAL_STAGE))).toBe(true);
  });

  it('opens only the briefing to a link with no game: the desk and its sandbox have gone', () => {
    // Every lever is a policy on step 4 (Phase 26); a link's measures wait on the briefing for the
    // game it starts, and a finished game carries its own g= to Budget day.
    expect(enterable('outlook', undefined)).toBe(true);
    expect(enterable('assumptions', undefined)).toBe(true);
    for (const step of [
      'pm',
      'deliver',
      'finetune',
      'taxes',
      'spending',
      'review',
      'budget-day',
    ] as const) {
      expect(enterable(step, undefined), step).toBe(false);
    }
  });

  it('sends an early arrival to the furthest open stage', () => {
    expect(furthestStep(undefined)).toBe('outlook');
    expect(furthestStep(game(0))).toBe('outlook');
    expect(furthestStep(game(1))).toBe('pm');
    expect(furthestStep(game(2))).toBe('deliver');
    expect(furthestStep(game(3))).toBe('finetune');
    // At the review, Budget day is already open.
    expect(furthestStep(game(4))).toBe('budget-day');
    expect(furthestStep(game(FINAL_STAGE))).toBe('budget-day');
  });
});
