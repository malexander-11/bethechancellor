import { formatGbpBn } from '@btc/engine';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { JourneyLayout } from '../components/JourneyLayout';
import { advisers, briefingsFor, vintage } from '../data';
import { useCeremony } from '../journey/beats';
import { StepLink } from '../journey/links';

export function StartPage() {
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  const { ceremony, setCeremony } = useCeremony();
  return (
    <JourneyLayout step="start">
      {/*
        The appointment letter. It is openly the game's premise rather than a claim about anyone:
        the sender is a role, as the advisers are, and nothing in it is a number the engine did
        not compute.
      */}
      <section className="hero-start doc doc--ruled letter">
        <p className="letter__from">
          <span className="kicker">From the Prime Minister</span>
          <span className="letter__ref">Appointment · Chancellor of the Exchequer</span>
        </p>
        <h1 className="page-title">You have been appointed Chancellor.</h1>
        <p className="lede">
          Your Budget is on 28 October 2026. March left {formatGbpBn(headroom, 1)} of headroom
          against the fiscal rules, and markets have moved since. Your advisers are waiting.
        </p>
        <p className="hero-start__actions">
          <StepLink to="/assumptions" className="btn btn--primary">
            Begin: confirm the assumptions
          </StepLink>
          <StepLink to="/budget/taxes" className="btn">
            Skip to taxes and spending
          </StepLink>
        </p>
        <p className="ceremony">
          <label>
            <input
              type="checkbox"
              checked={!ceremony}
              onChange={(e) => setCeremony(!e.target.checked)}
            />
            Show every step in full, without the advisers handing things over one at a time
          </label>
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
            <li key={a.id} className="nameplate">
              <strong>{a.role}</strong>
              <span>{a.remit}</span>
            </li>
          ))}
        </ul>
      </section>
    </JourneyLayout>
  );
}
