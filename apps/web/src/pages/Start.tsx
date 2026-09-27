import { JourneyLayout } from '../components/JourneyLayout';
import { BudgetBox } from '../components/Motifs';
import { rules } from '../data';
import { StepLink } from '../journey/links';
import { usePageTitle } from '../journey/title';

const BUDGET_DAY = new Date(
  `${rules.assessment.nextFormalAssessmentOn}T12:00:00Z`,
).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The reading and deciding a first Budget takes, as a round number of minutes. */
export const PLAYTIME_MINUTES = 10;

/**
 * The cover, the first screen of step 1 (the briefing follows it). The premise in one sentence,
 * how long it takes, and the one button.
 * No tutorial: each screen says what to do when you reach it. The advisers, the rules, the
 * figures and the red lines wait for the screens where they matter; the way to every lever is in
 * the footer, with the other utilities.
 */
export function StartPage() {
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
            Choose what matters, decide who pays, and see what the country makes of it.
          </p>
          <p className="opening__meta">
            <span>About {PLAYTIME_MINUTES} minutes</span>
            <span>Six steps</span>
          </p>
          <p className="opening__actions">
            <StepLink to="/outlook" className="btn btn--primary btn--big">
              Build my Budget
            </StepLink>
          </p>
        </div>
        <div className="opening__art">
          <BudgetBox />
        </div>
      </section>
    </JourneyLayout>
  );
}
