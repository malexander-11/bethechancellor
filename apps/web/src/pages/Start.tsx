import { formatGbpBn } from '@btc/engine';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { summariseReading } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { SourceList } from '../components/SourceLink';
import { briefingById, context, pm, rules, vintage } from '../data';
import { useCeremony } from '../journey/beats';
import { StepLink } from '../journey/links';
import { useWorkingsSwitch } from '../journey/workings';

const BUDGET_DAY = new Date(
  `${rules.assessment.nextFormalAssessmentOn}T12:00:00Z`,
).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The three readings the economy card leads with: money, prices, borrowing. */
const READINGS = ['gilt-10y', 'cpi-latest', 'psnb-ytd'];

/**
 * Step 1: the appointment. The letter is the premise; beneath it, three advisers brief the new
 * Chancellor in one screen: the rules and why they matter, the state of the economy, and the
 * politics. Every figure on the cards is a context reading or a sourced fact; the red lines are
 * the PM's promises, read from the same file the levers' warnings use, so they can never drift.
 */
export function StartPage() {
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  const { ceremony, setCeremony } = useCeremony();
  const { workings, setWorkings } = useWorkingsSwitch();
  const rulesBrief = briefingById.get('start-appointment');
  const economyBrief = briefingById.get('start-economy');
  const politicsBrief = briefingById.get('start-politics');
  const readings = READINGS.flatMap((id) => {
    const r = context.readings.find((x) => x.id === id);
    return r ? [r] : [];
  });
  return (
    <JourneyLayout step="start">
      {/*
        The appointment letter. It is openly the game's premise rather than a claim about anyone:
        the sender is a role, as the advisers are, and nothing in it is a number the engine did
        not compute.
      */}
      <section className="hero-start doc">
        <p className="doc__head">
          <span className="kicker">From the Prime Minister</span>
          <span className="doc__ref">Appointment · Chancellor of the Exchequer</span>
        </p>
        <p className="lede">
          Chancellor, your Budget is on {BUDGET_DAY}. March left {formatGbpBn(headroom, 1)} of
          headroom and markets have moved since. Your advisers are waiting.
        </p>
        <p className="hero-start__actions">
          <StepLink to="/outlook" className="btn btn--primary">
            Begin: choose what to plan on
          </StepLink>
        </p>
        <p className="hero-start__skip">
          Just want the sandbox? <StepLink to="/budget/taxes">Skip to taxes and spending</StepLink>
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
          <label>
            <input
              type="checkbox"
              checked={workings}
              onChange={(e) => setWorkings(e.target.checked)}
            />
            Every number here comes from an official document. Show the workings as you play?
          </label>
        </p>
      </section>

      <div className="briefing-row briefing-row--three">
        {rulesBrief ? <AdviserBriefing briefing={rulesBrief} compact /> : null}
        {economyBrief ? (
          <AdviserBriefing briefing={economyBrief} compact>
            <ul className="chips" aria-label="Readings">
              {readings.map((r) => (
                <li key={r.id} className="chip">
                  <span className="chip__value">{summariseReading(r.latest, r.unit)}</span>{' '}
                  {r.title}
                  <span className="chip__was"> · OBR {summariseReading(r.obr, r.unit)}</span>
                </li>
              ))}
            </ul>
          </AdviserBriefing>
        ) : null}
        {politicsBrief ? (
          <AdviserBriefing briefing={politicsBrief} compact>
            <ul className="redlines" aria-label="The manifesto red lines">
              {pm.promises.map((p) => (
                <li key={p.id}>
                  <strong>{p.title}.</strong> {p.text}
                  <SourceList as="span" className="briefing__sources" refs={p.sources} />
                </li>
              ))}
            </ul>
          </AdviserBriefing>
        ) : null}
      </div>
    </JourneyLayout>
  );
}
