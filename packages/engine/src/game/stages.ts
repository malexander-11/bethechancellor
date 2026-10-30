import type { JourneyStep } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';

/**
 * The four stages of a playthrough, in order (ADR-0046): the walk through the Chancellor's
 * measures, agreeing or disagreeing with each; balancing the money; delivering the Budget; and the
 * feedback. The index is what a shared link carries (`st.N`, with `rd.3` to say it counts on this
 * road). The walk is one stage with a page a theme and the small print. Fine-tuning (ADR-0045), and
 * the briefing, the priorities and the flagships before it (ADR-0025), retired: their names still
 * appear in old links and authored data, and each reads as the walk.
 */
export const GAME_STAGES: readonly JourneyStep[] = ['measures', 'balance', 'review', 'budget-day'];

export const FINAL_STAGE = GAME_STAGES.length - 1;

/** The retired steps, by name, each read as the stage it led to. */
const ALIASES: Record<string, JourneyStep> = {
  outlook: 'measures',
  assumptions: 'measures',
  pm: 'measures',
  deliver: 'measures',
  finetune: 'measures',
};

/** The canonical stage a step belongs to: a retired step is the walk's. */
function canonical(step: string): JourneyStep {
  return ALIASES[step] ?? (step as JourneyStep);
}

/** Where a step sits in the playthrough; the start page is before everything, at −1. */
export function stageIndex(step: string): number {
  return GAME_STAGES.indexOf(canonical(step));
}

/**
 * Whether a step may be opened, given how far the game has got. With no game only the start page,
 * the Chancellor's Budget, is open: a link that carries measures but no game opens there, and its
 * button starts the game with those measures in it. The road runs one way: a stage is open once
 * the one before it has been left (`reached` is bumped by the button that leaves it), going back
 * is always allowed, and a link that jumps ahead is sent back to the furthest open stage. Budget
 * day opens from the review, because `reached` only becomes `FINAL_STAGE` on delivering, and a
 * finished, shared link is told from a game in play by that.
 */
export function enterable(step: string, game: GamePermalink | undefined): boolean {
  if (step === 'start') return true;
  if (!game) return false;
  const stage = canonical(step);
  if (stage === 'budget-day') return game.reached >= stageIndex('review');
  return stageIndex(stage) <= game.reached;
}

/** Where an early arrival is sent: the furthest open stage, or the start when there is no game. */
export function furthestStep(game: GamePermalink | undefined): JourneyStep {
  if (!game) return 'start';
  for (let i = GAME_STAGES.length - 1; i >= 0; i -= 1) {
    const stage = GAME_STAGES[i];
    if (stage && enterable(stage, game)) return stage;
  }
  return 'start';
}
