import type { JourneyStep } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';

/**
 * The seven stages of a playthrough, in order. Taxes and spending are one stage with two screens,
 * so the package's two step ids map to one index. `assumptions` is the Phase 4 name that still
 * appears in authored data.
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
  // The guided screens of the package (Phase 18): the same stage as the desk.
  deliver: 'taxes',
  afford: 'taxes',
};

/** Where a step sits in the playthrough; the start page is before everything, at −1. */
export function stageIndex(step: JourneyStep): number {
  return GAME_STAGES.indexOf(ALIASES[step] ?? step);
}

/** The canonical stage a step belongs to: the package's two screens are `taxes`, and so on. */
function canonical(step: JourneyStep): JourneyStep {
  return ALIASES[step] ?? step;
}

/** With no game the package and Budget day are a sandbox; the stages that tell the story are not. */
const SANDBOX_OPEN: ReadonlySet<JourneyStep> = new Set(['outlook', 'taxes', 'budget-day']);

/**
 * Whether a step may be opened, given how far the game has got. The road runs one way: a stage is
 * open once the one before it has been left (`reached` is bumped by the button that leaves it),
 * going back is always allowed, and a link that jumps ahead is sent back to the furthest open
 * stage. Budget day opens from the rabbit, because `reached` only becomes `FINAL_STAGE` at the
 * close, and `opensEverything` keys on that to tell a finished, shared link from a game in play.
 */
export function enterable(step: JourneyStep, game: GamePermalink | undefined): boolean {
  if (step === 'start') return true;
  const stage = canonical(step);
  if (!game) return SANDBOX_OPEN.has(stage);
  if (stage === 'budget-day') return game.reached >= stageIndex('rabbit');
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
