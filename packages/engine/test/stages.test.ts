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

describe('the road through the game (three steps since ADR-0045)', () => {
  it('has three stages, from fine-tuning to the feedback', () => {
    expect(GAME_STAGES).toEqual(['finetune', 'review', 'budget-day']);
    expect(FINAL_STAGE).toBe(2);
  });

  it('opens a stage once the one before it has been left, and never sooner', () => {
    expect(enterable('finetune', game(0))).toBe(true);
    expect(stageIndex('finetune')).toBe(0);
    expect(enterable('review', game(0))).toBe(false);
    expect(enterable('review', game(1))).toBe(true);
  });

  it('reads the retired steps as fine-tuning, and has no step for what went before them', () => {
    // The briefing, the priorities and the flagships (ADR-0025) retired with the Chancellor's
    // Budget as the starting point; their names in old links and data open fine-tuning.
    for (const step of ['outlook', 'assumptions', 'pm', 'deliver']) {
      expect(stageIndex(step), step).toBe(0);
      expect(journeyStepSchema.safeParse(step).success, step).toBe(false);
      expect(enterable(step, game(0)), step).toBe(true);
      expect(enterable(step, undefined), step).toBe(false);
    }
    // The forecast, the compromises and the add-ons open the review; the desk's two screens open
    // step 4, which took their levers: the app routes their old addresses.
    for (const step of ['afford', 'forecast', 'compromise', 'rabbit', 'taxes', 'spending']) {
      expect(journeyStepSchema.safeParse(step).success, step).toBe(false);
    }
  });

  it('opens Budget day from the review, because reached only becomes final on delivering', () => {
    expect(enterable('budget-day', game(0))).toBe(false);
    expect(enterable('budget-day', game(1))).toBe(true);
    expect(enterable('budget-day', game(FINAL_STAGE))).toBe(true);
  });

  it('always lets you go back, and always opens the start', () => {
    for (let reached = 0; reached <= FINAL_STAGE; reached += 1) {
      expect(enterable('start', game(reached))).toBe(true);
      expect(enterable('finetune', game(reached))).toBe(true);
    }
    expect(enterable('review', game(FINAL_STAGE))).toBe(true);
  });

  it('opens only the start to a link with no game: its measures wait for the game it starts', () => {
    expect(enterable('start', undefined)).toBe(true);
    for (const step of ['finetune', 'review', 'budget-day'] as const) {
      expect(enterable(step, undefined), step).toBe(false);
    }
  });

  it('sends an early arrival to the furthest open stage', () => {
    expect(furthestStep(undefined)).toBe('start');
    expect(furthestStep(game(0))).toBe('finetune');
    // At the review, Budget day is already open.
    expect(furthestStep(game(1))).toBe('budget-day');
    expect(furthestStep(game(FINAL_STAGE))).toBe('budget-day');
  });
});
