import type { JourneyStep } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';

/**
 * The six stages of a playthrough, in order (Phase 24, ADR-0025): the briefing, the priorities,
 * the flagship policies, fine-tuning tax and spending, delivering the Budget, and the feedback.
 * The index is what a shared link carries (`st.N`). Fine-tuning is one stage with its two screens;
 * `assumptions`, and the desk's `taxes` and `spending`, are older names that still appear in
 * authored data.
 */
export const GAME_STAGES: readonly JourneyStep[] = [
  'outlook',
  'pm',
  'deliver',
  'finetune',
  'review',
  'budget-day',
];

export const FINAL_STAGE = GAME_STAGES.length - 1;

const ALIASES: Partial<Record<JourneyStep, JourneyStep>> = {
  assumptions: 'outlook',
  // The desk's two screens, retired in Phase 26: every lever they held is a policy on step 4.
  taxes: 'finetune',
  spending: 'finetune',
};

/** Where a step sits in the playthrough; the start page is before everything, at −1. */
export function stageIndex(step: JourneyStep): number {
  return GAME_STAGES.indexOf(ALIASES[step] ?? step);
}

/** The canonical stage a step belongs to: the desk's two screens are `finetune`, and so on. */
function canonical(step: JourneyStep): JourneyStep {
  return ALIASES[step] ?? step;
}

/**
 * With no game only the briefing is open (Phase 26, ADR-0027). The desk and its sandbox have gone:
 * every lever is a policy on step 4, and a link that carries measures but no game opens on the
 * briefing, whose button starts the game with those measures in it. A finished game is shared
 * with its `g=`, so its link still opens Budget day.
 */
const SANDBOX_OPEN: ReadonlySet<JourneyStep> = new Set(['outlook']);

/**
 * Whether a step may be opened, given how far the game has got. The road runs one way: a stage is
 * open once the one before it has been left (`reached` is bumped by the button that leaves it),
 * going back is always allowed, and a link that jumps ahead is sent back to the furthest open
 * stage. Budget day opens from the review, because `reached` only becomes `FINAL_STAGE` on
 * delivering, and a finished, shared link is told from a game in play by that.
 */
export function enterable(step: JourneyStep, game: GamePermalink | undefined): boolean {
  if (step === 'start') return true;
  const stage = canonical(step);
  if (!game) return SANDBOX_OPEN.has(stage);
  if (stage === 'budget-day') return game.reached >= stageIndex('review');
  return stageIndex(stage) <= game.reached;
}

/** Where an early arrival is sent: the furthest open stage, or the outlook when there is no game. */
export function furthestStep(game: GamePermalink | undefined): JourneyStep {
  if (!game) return 'outlook';
  for (let i = GAME_STAGES.length - 1; i >= 0; i -= 1) {
    const stage = GAME_STAGES[i];
    if (stage && enterable(stage, game)) return stage;
  }
  return 'outlook';
}
