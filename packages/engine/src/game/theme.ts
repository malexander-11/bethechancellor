import type { PmFile } from '../types/data.js';
import { MAX_PRIORITIES } from './options.js';
import { prioritiesInWords } from './verdict.js';

/**
 * The theme of the Budget, written by the game from the ranked priorities (Phase 23): what the
 * Comms team tells voters the Budget is for, and what the advisers propose ways to deliver. "A
 * Budget for the NHS"; "A Budget for defence and the cost of living". Nothing is typed: the words
 * are the priorities' own nouns in rank order, so the theme can never drift from the ranking. With
 * nothing ranked there is no theme yet, and the page says so in its own words.
 */
export function budgetTheme(pm: PmFile, priorities: readonly string[]): string | undefined {
  const words = prioritiesInWords(pm, priorities.slice(0, MAX_PRIORITIES));
  return words ? `A Budget for ${words}` : undefined;
}
