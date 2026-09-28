import { AMPLE_HEADROOM_GBPM, formatGbpBn, stageIndex, type ContextReading } from '@btc/engine';
import { useNavigate } from 'react-router-dom';
import { EstimateRow, summariseReading } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Papers } from '../components/Motifs';
import { SourceList } from '../components/SourceLink';
import { TableScroll } from '../components/TableScroll';
import { Term } from '../components/Term';
import { ESTIMATE, context, levers, rules, vintage } from '../data';
import { StepLink } from '../journey/links';
import { headroomOfOutcome, useOutcomeOf } from '../journey/outcome';
import { suggestSetting } from '../journey/suggest';
import { WorkingsOnly, useWorkings } from '../journey/workings';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/**
 * Step 1: your briefing (Phase 24, ADR-0025). One figure to plan on: the headroom on today's
 * estimate, the OBR's March forecast brought up to date for today's borrowing costs and prices
 * with the OBR's own sensitivities. Then the two rules in one line, what has been promised since
 * March and why the headroom fell, and what headroom is, one fold away. Nothing is chosen here:
 * the primary starts the game on the estimate and goes to the priorities. With the workings on,
 * the table the estimate is made from.
 */
export function OutlookPage() {
  const { state, dispatch, outcome } = useBudget();
  const navigate = useNavigate();
  const workings = useWorkings();
  const outcomeOf = useOutcomeOf();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const years = outcome.paths.years;
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const march = vintage.context?.headroomAtPublicationGbpm ?? 0;
  // The starting position: today's estimate with no policy of the player's own.
  const estimate = headroomOfOutcome(outcomeOf({ ...ESTIMATE }));
  const estimateText = formatGbpBn(estimate, 1, estimate < 0);
  const gilts = reading('gilt-10y');
  const borrowing = reading('psnb-ytd');
  const prices = context.readings.find((r) => r.leverCode === 'rpi');
  const decisions = context.decisionsSinceForecast;

  const begin = () => {
    const started = reducer(state, { type: 'startGame' });
    const patch = { reached: Math.max(started.game?.reached ?? 0, stageIndex('pm')) };
    dispatch({ type: 'startGame' });
    dispatch({ type: 'updateGame', patch });
    const next = reducer(started, { type: 'updateGame', patch });
    navigate({ pathname: '/pm', search: `?${permalinkQuery(next)}` });
  };

  return (
    <JourneyLayout step="outlook">
      <section className="brief doc" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="brief__title">
          <Papers /> The Treasury’s briefing
        </h2>
        <dl className="brief__facts">
          <div className="brief__fact">
            <dt>Your headroom</dt>
            <dd>
              <strong>{estimateText}</strong> <LabelBadge badge="assumption" />
              <span>
                our estimate for {targetYear}: the OBR’s March forecast on today’s borrowing costs
                and prices.
              </span>
            </dd>
          </div>
          {gilts ? (
            <div className="brief__fact">
              <dt>Borrowing costs</dt>
              <dd>
                <strong>{summariseReading(gilts.latest, gilts.unit)}</strong>
                <span>
                  on ten-year <Term id="gilts">gilts</Term>; the OBR assumed{' '}
                  {summariseReading(gilts.obr, gilts.unit)}.
                </span>
              </dd>
            </div>
          ) : null}
          {borrowing ? (
            <div className="brief__fact">
              <dt>Borrowed so far this year</dt>
              <dd>
                <strong>{summariseReading(borrowing.latest, borrowing.unit)}</strong>
                <span>
                  April to August; the OBR pencilled in{' '}
                  {summariseReading(borrowing.obr, borrowing.unit)}.
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
        <SourceList
          className="briefing__sources"
          refs={[
            ...(gilts ? [gilts.latest.source, gilts.obr.source] : []),
            ...(borrowing ? [borrowing.latest.source] : []),
          ]}
        />
        <p className="brief__rules">
          Two <Term id="fiscal-rules">rules</Term>: pay for day-to-day spending with tax by{' '}
          {targetYear}, and have debt falling by then. Miss one and the <Term id="obr">OBR</Term>{' '}
          says so on Budget day.
        </p>
        <details className="more">
          <summary>About the fiscal rules</summary>
          <dl className="more__body rules-key">
            {rules.rules.map((r) => (
              <div key={r.id}>
                <dt>
                  {r.shortName.charAt(0).toUpperCase() + r.shortName.slice(1)}
                  {r.shortName.replace(/^the /, '').toLowerCase() !== r.name.toLowerCase() ? (
                    <span className="rules-key__official"> (officially the {r.name})</span>
                  ) : null}
                </dt>
                <dd>
                  {r.plainEnglish}
                  {workings ? (
                    <>
                      {' '}
                      <span className="source">The Charter says: “{r.charterText}”</span>{' '}
                      <SourceList as="span" className="briefing__sources" refs={[r.source]} />
                    </>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      {decisions.length > 0 ? (
        <section className="since doc" aria-labelledby="since-heading">
          <h2 id="since-heading" className="section-label">
            Since March
          </h2>
          <p>
            Since March the government has made {COUNT[decisions.length] ?? decisions.length}{' '}
            spending promises:
          </p>
          <ul className="since__list">
            {decisions.map((d) => (
              <li key={d.id}>
                {d.title}: {formatGbpBn(Math.abs(d.amountGbpm), 1)} ({d.year}), paid for by{' '}
                {lowerFirst(d.paidFor)}.
                <SourceList as="span" className="briefing__sources" refs={d.sources} />
              </li>
            ))}
          </ul>
          <p>
            Each was paid for by moving money, so none used the headroom. What has cut the headroom
            is dearer borrowing{prices ? ' and higher inflation' : ''}.
            {gilts ? (
              <>
                {' '}
                Gilts pay {summariseReading(gilts.latest, gilts.unit)} against the{' '}
                {summariseReading(gilts.obr, gilts.unit)} the OBR assumed
                {prices
                  ? `; inflation is ${summariseReading(prices.latest, prices.unit)} against ${summariseReading(prices.obr, prices.unit)}`
                  : ''}
                .
              </>
            ) : null}{' '}
            That is why your headroom is about {estimateText}, not the {formatGbpBn(march, 1)} March
            showed.
          </p>
          <SourceList
            className="briefing__sources"
            refs={[
              ...(gilts ? [gilts.latest.source, gilts.obr.source] : []),
              ...(prices ? [prices.latest.source, prices.obr.source] : []),
            ]}
          />
        </section>
      ) : null}

      <details className="more">
        <summary>What is headroom?</summary>
        <aside className="note more__body" aria-label="Headroom, explained by your advisers">
          <p>
            <span className="kicker">Chief Economic Adviser</span> <LabelBadge badge="simulated" />
          </p>
          <p>
            Headroom is the gap between what the rules let you borrow and what the forecast says you
            will borrow. It is your safety margin. In March it was {formatGbpBn(march, 1)}; on
            today’s estimate it is {estimateText}. Forecasts move: over five years the OBR’s have
            been out by about {formatGbpBn(typicalErrorGbpm, 0)} on average. Your advisers think the
            markets get nervous below about {formatGbpBn(AMPLE_HEADROOM_GBPM, 0)}. Nobody has
            published that number: it is their judgement.
          </p>
          <SourceList
            refs={[
              { sourceId: 'obr-efo-2026-03', paragraph: '3.4' },
              { sourceId: 'hmt-budget-2025-speech' },
              { sourceId: 'hmt-tsc-budget-2026-letter' },
              { sourceId: 'rf-headroom-2026-07-21' },
              { sourceId: 'boe-fsr-2026-07' },
              { sourceId: 'rf-policy-landscape-2026' },
            ]}
          />
        </aside>
      </details>

      <WorkingsOnly>
        <details className="more">
          <summary>How the estimate is made</summary>
          <div className="more__body">
            <p className="panel__hint">
              Each setting is the latest reading less the OBR’s March figure, rounded to the step
              the game uses. The OBR’s own sensitivities turn the settings into headroom.
            </p>
            <TableScroll label="How the estimate is made">
              <table className="measures">
                <thead>
                  <tr>
                    <th>Reading</th>
                    <th>OBR in March</th>
                    <th>Latest</th>
                    <th>Setting used</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {context.readings.map((r) => (
                    <EstimateRow
                      key={r.id}
                      reading={r}
                      lever={r.leverCode ? levers.find((l) => l.code === r.leverCode) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <ul className="since__list">
              {context.readings.map((r) => {
                const lever = r.leverCode ? levers.find((l) => l.code === r.leverCode) : undefined;
                const s = lever ? suggestSetting(r, lever) : null;
                return s ? (
                  <li key={r.id}>
                    <strong>{r.title}</strong>: {s.rationale}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </details>
      </WorkingsOnly>

      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={begin}>
          Set your priorities
        </button>
        <StepLink to="/" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
