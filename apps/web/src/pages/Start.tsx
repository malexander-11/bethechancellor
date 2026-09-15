import { formatGbpBn } from '@btc/engine';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { JourneyLayout } from '../components/JourneyLayout';
import { advisers, briefingsFor, vintage } from '../data';
import { StepLink } from '../journey/links';

export function StartPage() {
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  return (
    <JourneyLayout step="start">
      <section className="hero-start">
        <p className="kicker">Be the Chancellor</p>
        <h1 className="page-title">You have been appointed Chancellor.</h1>
        <p className="lede">
          Your first Budget is on 28 October 2026. In March the Office for Budget Responsibility
          left your predecessor {formatGbpBn(headroom, 1)} of headroom against the fiscal rules;
          markets and forecasters have moved since. Confirm the assumptions, then set taxes and
          spending with your advisers at your side, and see whether the rules still hold on Budget
          day.
        </p>
        <p className="hero-start__actions">
          <StepLink to="/assumptions" className="btn btn--primary">
            Begin: confirm the assumptions
          </StepLink>
          <StepLink to="/budget/taxes" className="btn">
            Skip to taxes and spending
          </StepLink>
        </p>
      </section>
      {briefingsFor('start').map((b) => (
        <AdviserBriefing key={b.id} briefing={b} />
      ))}
      <section className="panel" aria-labelledby="advisers-heading">
        <h2 id="advisers-heading">Your advisers</h2>
        <p className="panel__hint">
          Roles, not people. Everything they tell you cites a public document; their opinions are
          labelled commentary and never change a number.
        </p>
        <ul className="advisers">
          {advisers.advisers.map((a) => (
            <li key={a.id}>
              <strong>{a.role}</strong>
              <span>{a.remit}</span>
            </li>
          ))}
        </ul>
      </section>
    </JourneyLayout>
  );
}
