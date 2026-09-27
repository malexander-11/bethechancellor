import type { JourneyStep } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';

/**
 * The six stages of a playthrough, in order (Phase 24, ADR-0025): the briefing, the priorities,
 * the flagship policies, fine-tuning tax and spending, delivering the Budget, and the feedback.
 * The index is what a shared link carries (`st.N`). Fine-tuning is one stage with its two
 * curated screens and the desk's two screens behind them; `assumptions` is the Phase 4 name that
 * still appears in authored data. The steps Phase 24 retired (`afford`, `forecast`,
 * `compromise`, `rabbit`) read as the stage that took their place, so authored data that names
 * them keeps validating until it is gone.
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
  // The desk's two screens are fine-tuning's side room: every tax and every spending lever.
  taxes: 'finetune',
  spending: 'finetune',
  // Retired in Phase 24: paying for it became fine-tuning; the forecast, the compromises and the
  // add-ons went, and the review took their place on the road.
  afford: 'finetune',
  forecast: 'review',
  compromise: 'review',
  rabbit: 'review',
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
 * With no game the desk and Budget day are a sandbox, and the briefing is open to read; the stages
 * that tell the story are not. The curated screens need a game to have anything to show, so they
 * send a sandbox on to the desk themselves; the stage stays open so the redirect lands.
 */
const SANDBOX_OPEN: ReadonlySet<JourneyStep> = new Set(['outlook', 'finetune', 'budget-day']);

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
