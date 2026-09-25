import type { JourneyStep } from '../types/data.js';
import type { GamePermalink } from '../types/engine.js';

/**
 * The seven stages of a playthrough, in order. The package is one stage with four screens: the
 * two guided ones (ways to deliver, ways to afford) and the two desk screens behind them (taxes,
 * spending), so all four step ids map to one index. The index is what a shared link carries
 * (`st.N`), so it never changes; only the name of the canonical screen has, from `taxes` to
 * `deliver` (Phase 18, ADR-0022). `assumptions` is the Phase 4 name that still appears in
 * authored data.
 */
export const GAME_STAGES: readonly JourneyStep[] = [
  'outlook',
  'pm',
  'deliver',
  'forecast',
  'compromise',
  'rabbit',
  'budget-day',
];

export const FINAL_STAGE = GAME_STAGES.length - 1;

const ALIASES: Partial<Record<JourneyStep, JourneyStep>> = {
  assumptions: 'outlook',
  // The package's other three screens: the second guided screen and the two desk screens.
  afford: 'deliver',
  taxes: 'deliver',
  spending: 'deliver',
};

/** Where a step sits in the playthrough; the start page is before everything, at −1. */
export function stageIndex(step: JourneyStep): number {
  return GAME_STAGES.indexOf(ALIASES[step] ?? step);
}

/** The canonical stage a step belongs to: the package's four screens are `deliver`, and so on. */
function canonical(step: JourneyStep): JourneyStep {
  return ALIASES[step] ?? step;
}

/**
 * With no game the package and Budget day are a sandbox; the stages that tell the story are not.
 * The guided screens need a game to have anything to show, so they send a sandbox on to the desk
 * themselves; the stage stays open so the redirect has somewhere to land.
 */
const SANDBOX_OPEN: ReadonlySet<JourneyStep> = new Set(['outlook', 'deliver', 'budget-day']);

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
