import type { JourneyStep } from '../types/data.js';

/**
 * The seven stages of a playthrough, in order. Taxes, spending and policies are one stage with
 * three tabs, so the desk's three step ids map to one index. `assumptions` and `recommendations`
 * are the Phase 4 names that still appear in authored data.
 */
export const GAME_STAGES: readonly JourneyStep[] = [
  'outlook',
  'pm',
  'taxes',
  'forecast',
  'compromise',
  'rabbit',
  'budget-day',
];

export const FINAL_STAGE = GAME_STAGES.length - 1;

const ALIASES: Partial<Record<JourneyStep, JourneyStep>> = {
  assumptions: 'outlook',
  spending: 'taxes',
  policies: 'taxes',
  recommendations: 'taxes',
};

/** Where a step sits in the playthrough; the start page is before everything, at −1. */
export function stageIndex(step: JourneyStep): number {
  return GAME_STAGES.indexOf(ALIASES[step] ?? step);
}
