import { formatGbpBn } from '@btc/engine';
import { JourneyLayout } from '../components/JourneyLayout';
import { BudgetBox } from '../components/Motifs';
import { rules, vintage } from '../data';
import { StepLink } from '../journey/links';
import { usePageTitle } from '../journey/title';

const BUDGET_DAY = new Date(
  `${rules.assessment.nextFormalAssessmentOn}T12:00:00Z`,
).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The reading and deciding a first Budget takes, as a round number of minutes. */
export const PLAYTIME_MINUTES = 10;

/**
 * Step 1: become Chancellor. The premise in one sentence, how long it takes, and the one button.
 * No tutorial: each screen says what to do when you reach it. The advisers, the rules and the
 * red lines wait for the screens where they matter.
 */
export function StartPage() {
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  usePageTitle('Become Chancellor');
  return (
    <JourneyLayout step="start" intro={false}>
      <section className="opening" aria-labelledby="opening-title">
        <div className="opening__words">
          <p className="opening__kicker">The Budget · {BUDGET_DAY}</p>
          <h1 id="opening-title" className="opening__title">
            It’s your Budget now.
          </h1>
          <p className="opening__lede">
            Choose what matters, decide who pays, and see what the country makes of it. Every number
            comes from the official figures, and the fiscal rules are real: March left{' '}
            {formatGbpBn(headroom, 1)} of room and the markets have moved since.
          </p>
          <p className="opening__meta">
            <span>About {PLAYTIME_MINUTES} minutes</span>
            <span>Seven steps</span>
            <span>No right answer</span>
          </p>
          <p className="opening__actions">
            <StepLink to="/outlook" className="btn btn--primary btn--big">
              Build my Budget
            </StepLink>
          </p>
          <p className="opening__quiet">
            <StepLink to="/methodology">How the numbers work</StepLink>
            <StepLink to="/budget/taxes">Skip the story: every lever</StepLink>
          </p>
        </div>
        <div className="opening__art">
          <BudgetBox />
        </div>
      </section>
    </JourneyLayout>
  );
}
