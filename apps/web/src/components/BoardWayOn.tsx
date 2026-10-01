import { GAME_STAGES } from '@btc/engine';
import { STAGE_ROUTES } from '../journey/routes';
import { StepLink } from '../journey/links';
import { BOARD_TEXT } from '../board/words';
import { SHARE_TEXT } from '../share/words';
import { useBudget } from '../state/budget';

/**
 * The one way on from a page about other people's Budgets: back to this player's own game, at the
 * stage it has reached (not further: Budget day would deliver it), or, with none under way, the
 * start of one.
 */
export function BoardWayOn() {
  const { state } = useBudget();
  return state.game ? (
    <StepLink
      to={STAGE_ROUTES[GAME_STAGES[state.game.reached] ?? 'outlook']}
      className="btn btn--primary"
    >
      {BOARD_TEXT.back}
    </StepLink>
  ) : (
    <StepLink to="/outlook" className="btn btn--primary">
      {SHARE_TEXT.play}
    </StepLink>
  );
}
