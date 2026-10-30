import { GAME_STAGES } from '@btc/engine';
import { STAGE_ROUTES } from '../journey/routes';
import { StepLink } from '../journey/links';
import { BOARD_TEXT } from '../board/words';
import { SHARE_TEXT } from '../share/words';
import { useBudget } from '../state/budget';

/**
 * The one way on from a page about other people's Budgets: back to this player's own game, at the
 * stage it has reached (not further: Budget day would deliver it), or, with nothing done yet, the
 * start of one. Every visit is a game from the first screen (ADR-0047), so a game is under way
 * once it has moved past the walk's start or changed something.
 */
export function BoardWayOn() {
  const { state } = useBudget();
  const playing =
    state.game !== undefined &&
    (state.game.reached > 0 || Object.keys(state.leverValues).length > 0);
  return state.game && playing ? (
    <StepLink
      to={STAGE_ROUTES[GAME_STAGES[state.game.reached] ?? 'measures']}
      className="btn btn--primary"
    >
      {BOARD_TEXT.back}
    </StepLink>
  ) : (
    <StepLink to="/" className="btn btn--primary">
      {SHARE_TEXT.play}
    </StepLink>
  );
}
