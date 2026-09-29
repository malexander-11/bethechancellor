import { JourneyLayout } from '../components/JourneyLayout';
import { StepLink } from '../journey/links';
import { usePageTitle } from '../journey/title';

/**
 * The cover, the first screen of step 1 (the briefing follows it): the premise in one sentence and
 * the one button, nothing else (ADR-0032). No tutorial: each screen says what to do when you reach
 * it. The advisers, the rules, the figures and the red lines wait for the screens where they
 * matter.
 */
export function StartPage() {
  usePageTitle('Become Chancellor');
  return (
    <JourneyLayout step="start" intro={false}>
      <section className="opening" aria-labelledby="opening-title">
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
      </section>
    </JourneyLayout>
  );
}
