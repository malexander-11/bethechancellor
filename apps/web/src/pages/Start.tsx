import { Link } from 'react-router-dom';
import { BOARD_TEXT } from '../board/words';
import { JourneyLayout } from '../components/JourneyLayout';
import { BudgetBox } from '../components/Motifs';
import { StepLink } from '../journey/links';
import { usePageTitle } from '../journey/title';

/**
 * The cover: an invitation to play, not a step, so it shows no road (ADR-0033). The red Budget box,
 * the premise in one sentence and the one button, as one composition that fills the screen: the box
 * above the words on a phone, beside them on a wide screen, centred between the header and the
 * footer, and the button in view either way; under it, a quiet link to the leaderboard (ADR-0044).
 * No tutorial: each screen says what to do when you reach it. The advisers, the rules, the figures
 * and the red lines wait for the screens where they matter.
 */
export function StartPage() {
  usePageTitle('Become Chancellor');
  return (
    <JourneyLayout step="start" intro={false}>
      <section className="opening" aria-labelledby="opening-title">
        <div className="opening__art">
          <BudgetBox />
        </div>
        <div className="opening__words">
          <h1 id="opening-title" className="opening__title">
            It’s your Budget now.
          </h1>
          <p className="opening__lede">
            Choose what matters, decide who pays, and see what the country makes of it.
          </p>
          <p className="opening__actions">
            <StepLink to="/outlook" className="btn btn--primary btn--big">
              Build my Budget
            </StepLink>
          </p>
          {/* A quiet second way in (ADR-0044): what other players made. */}
          <p className="opening__more">
            <Link to="/leaderboard">{BOARD_TEXT.see}</Link>
          </p>
        </div>
      </section>
    </JourneyLayout>
  );
}
