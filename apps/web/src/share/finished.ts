import {
  FINAL_STAGE,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
  type FinishedBudget,
  type SummaryWords,
} from '@btc/engine';
import { useMemo } from 'react';
import { gameData } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { permalinkQuery, useBudget } from '../state/budget';

/** The Budget as it ends, ready to share or post (ADR-0044). */
export interface SharedBudget {
  budget: FinishedBudget;
  words: SummaryWords;
  /** The shared page's address on this site. */
  page: string;
  /** The picture's address on this site. */
  picture: string;
}

/**
 * The player's Budget as it ends, written as every link to it is: what the picture, the shared
 * page and the leaderboard are made from. None without a game.
 */
export function useSharedBudget(): SharedBudget | null {
  const { state } = useBudget();
  const outcomeOf = useOutcomeOf();
  const { leverValues, game } = state;
  return useMemo(() => {
    if (!game) return null;
    const query = permalinkQuery({
      leverValues,
      warnings: [],
      game: { ...game, reached: FINAL_STAGE },
    });
    const budget = readFinishedBudget(gameData, query);
    if (!budget) return null;
    return {
      budget,
      words: summaryWords(summariseBudget(gameData, budget, outcomeOf)),
      page: `${window.location.origin}/shared?${budget.query}`,
      picture: `/api/card?${budget.query}`,
    };
  }, [leverValues, game, outcomeOf]);
}
