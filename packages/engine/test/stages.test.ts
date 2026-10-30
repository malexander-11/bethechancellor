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

describe('the road through the game (four steps since ADR-0046)', () => {
  it('has four stages, from the measures to the feedback', () => {
    expect(GAME_STAGES).toEqual(['measures', 'balance', 'review', 'budget-day']);
    expect(FINAL_STAGE).toBe(3);
  });

  it('opens a stage once the one before it has been left, and never sooner', () => {
    expect(enterable('measures', game(0))).toBe(true);
    expect(stageIndex('measures')).toBe(0);
    expect(enterable('balance', game(0))).toBe(false);
    expect(enterable('balance', game(1))).toBe(true);
    expect(enterable('review', game(1))).toBe(false);
    expect(enterable('review', game(2))).toBe(true);
  });

  it('reads the retired steps as the walk, and has no step for what went before them', () => {
    // Fine-tuning (ADR-0045), and the briefing, the priorities and the flagships before it
    // (ADR-0025), retired; their names in old links and data open the walk through the measures.
    for (const step of ['outlook', 'assumptions', 'pm', 'deliver', 'finetune']) {
      expect(stageIndex(step), step).toBe(0);
      expect(enterable(step, game(0)), step).toBe(true);
      expect(enterable(step, undefined), step).toBe(false);
    }
    for (const step of ['outlook', 'assumptions', 'pm', 'deliver']) {
      expect(journeyStepSchema.safeParse(step).success, step).toBe(false);
    }
    // The forecast, the compromises and the add-ons open the review; the desk's two screens open
    // the walk: the app routes their old addresses.
    for (const step of ['afford', 'forecast', 'compromise', 'rabbit', 'taxes', 'spending']) {
      expect(journeyStepSchema.safeParse(step).success, step).toBe(false);
    }
  });

  it('opens Budget day from the review, because reached only becomes final on delivering', () => {
    expect(enterable('budget-day', game(1))).toBe(false);
    expect(enterable('budget-day', game(2))).toBe(true);
    expect(enterable('budget-day', game(FINAL_STAGE))).toBe(true);
  });

  it('always lets you go back, and always opens the start', () => {
    for (let reached = 0; reached <= FINAL_STAGE; reached += 1) {
      expect(enterable('start', game(reached))).toBe(true);
      expect(enterable('measures', game(reached))).toBe(true);
    }
    expect(enterable('balance', game(FINAL_STAGE))).toBe(true);
    expect(enterable('review', game(FINAL_STAGE))).toBe(true);
  });

  it('opens only the start to a link with no game: its measures wait for the game it starts', () => {
    expect(enterable('start', undefined)).toBe(true);
    for (const step of ['measures', 'balance', 'review', 'budget-day'] as const) {
      expect(enterable(step, undefined), step).toBe(false);
    }
  });

  it('sends an early arrival to the furthest open stage', () => {
    expect(furthestStep(undefined)).toBe('start');
    expect(furthestStep(game(0))).toBe('measures');
    expect(furthestStep(game(1))).toBe('balance');
    // At the review, Budget day is already open.
    expect(furthestStep(game(2))).toBe('budget-day');
    expect(furthestStep(game(FINAL_STAGE))).toBe('budget-day');
  });
});
