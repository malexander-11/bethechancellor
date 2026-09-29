import {
  AMPLE_HEADROOM_GBPM,
  THIN_HEADROOM_GBPM,
  formatGbp,
  formatGbpBn,
  fyStart,
  perHousehold,
  stageIndex,
  type ContextReading,
} from '@btc/engine';
import { useNavigate } from 'react-router-dom';
import { EstimateRow, summariseReading } from '../components/AssumptionsTable';
import { InTray } from '../components/InTray';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { ModeLine } from '../components/ModeLine';
import { Papers } from '../components/Motifs';
import { SourceList } from '../components/SourceLink';
import { TableScroll } from '../components/TableScroll';
import { Term } from '../components/Term';
import { Yardstick } from '../components/Yardstick';
import { ESTIMATE, context, households, levers, rules, vintage } from '../data';
import { StepLink } from '../journey/links';
import { useMode } from '../journey/mode';
import { headroomOfOutcome, useOutcomeOf } from '../journey/outcome';
import { suggestSetting } from '../journey/suggest';
import { WorkingsOnly, useWorkings } from '../journey/workings';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** A sum as the government states it: under a billion in millions, "£850 million" (Phase 25). */
function sumInWords(gbpm: number): string {
  const abs = Math.abs(gbpm);
  return abs < 1000 ? `${formatGbp(abs)} million` : formatGbpBn(abs, 1);
}
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/**
 * Step 1: your briefing (Phase 24, ADR-0025; Phase 25). One figure to plan on, with its meaning
 * beside it: the headroom on today's estimate, what headroom is, the year it is for and what it is
 * worth a household. The advisers' yardstick in words, the two rules in one line, what is already
 * on the desk, and why the headroom fell since March, with the decisions one fold away. What
 * headroom is, and how the OBR works in a real Budget, one fold away; with the workings on, the
 * table the estimate is made from. Nothing is chosen here: the primary starts the game on the
 * estimate and goes to the priorities. In basic mode (Phase 27, ADR-0028) the briefing is short:
 * the headroom and what it means, the advisers' yardstick, the rules in one line and what is
 * already on the desk; the explanations wait for advanced mode, one button away.
 */
export function OutlookPage() {
  const { state, dispatch, outcome } = useBudget();
  const navigate = useNavigate();
  const workings = useWorkings();
  const basic = useMode() === 'basic';
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
  const prices = context.readings.find((r) => r.leverCode === 'rpi');
  const decisions = context.decisionsSinceForecast;
  // The year the rules test, in months (Phase 25): "April 2029 to March 2030".
  const start = fyStart(targetYear);
  const yearInMonths = `April ${start} to March ${start + 1}`;
  const perHome = formatGbp(perHousehold(estimate, households.value));

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
                <Term id="headroom">Headroom</Term> is how much you can spend, or cut in tax, and
                still meet the rules.
              </span>
              <span>
                It is for {targetYear} ({yearInMonths}), the year the rules are tested: about{' '}
                {perHome} for each household <LabelBadge badge="mechanical" />.
              </span>
            </dd>
          </div>
        </dl>
        <p className="brief__source">
          Our estimate: the March forecast of the Office for Budget Responsibility (OBR), the
          official forecaster, brought up to date for today’s borrowing costs and prices.
        </p>
        <Yardstick />
        <p className="brief__rules">
          Two <Term id="fiscal-rules">rules</Term>: pay for day-to-day spending with tax by{' '}
          {targetYear}, and have debt falling by then. Miss one and the <Term id="obr">OBR</Term>{' '}
          says so on Budget day.
        </p>
        {basic ? null : (
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
        )}
      </section>

      <InTray values={ESTIMATE} />

      {!basic && decisions.length > 0 ? (
        <section className="since doc" aria-labelledby="since-heading">
          <h2 id="since-heading" className="section-label">
            Since March
          </h2>
          <p>
            Since March the government has taken {COUNT[decisions.length] ?? decisions.length}{' '}
            decisions that cost money. Each was paid for by moving money, so none used the headroom.
            What cut it is dearer borrowing{prices ? ' and prices' : ''}.
            {gilts ? (
              <>
                {' '}
                Gilts pay {summariseReading(gilts.latest, gilts.unit)} against the{' '}
                {summariseReading(gilts.obr, gilts.unit)} the OBR assumed.
              </>
            ) : null}
            {prices ? (
              <>
                {' '}
                Forecasters expect prices to rise {summariseReading(prices.latest, prices.unit)} a
                year on average to 2030, not the OBR’s {summariseReading(prices.obr, prices.unit)},
                and some government debt costs more when prices rise.
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
          <details className="more">
            <summary>What was decided since March</summary>
            <ul className="more__body since__list">
              {decisions.map((d) => (
                <li key={d.id}>
                  {/* Two sentences, each one breath (Phase 25). */}
                  {d.title}: {sumInWords(d.amountGbpm)}. Paid for by {lowerFirst(d.paidFor)}.
                  <SourceList as="span" className="briefing__sources" refs={d.sources} />
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {basic ? null : (
        <details className="more">
          <summary>What is headroom?</summary>
          <aside className="note more__body" aria-label="Headroom, explained by your advisers">
            <p>
              <span className="kicker">Chief Economic Adviser</span>{' '}
              <LabelBadge badge="simulated" />
            </p>
            <p>
              Headroom is the gap between what the rules let you borrow and what the forecast says
              you will borrow. It is your safety margin. In March it was {formatGbpBn(march, 1)}; on
              today’s estimate it is {estimateText}. Forecasts move: over five years the OBR’s have
              been out by about {formatGbpBn(typicalErrorGbpm, 0)} on average. Your advisers think
              the markets get nervous below about {formatGbpBn(AMPLE_HEADROOM_GBPM, 0)}, and call
              anything under {formatGbpBn(THIN_HEADROOM_GBPM, 0)} thin. Nobody has published those
              numbers: they are their judgement.
            </p>
            <p>
              Others put it differently. The Resolution Foundation said about £10bn in July; the
              independent forecasts the Treasury collects imply less.
            </p>
            <p>
              In a real Budget the OBR sends the Chancellor several rounds of forecast, and checks
              the costing of each measure, before the day. Here one estimate stays fixed.
            </p>
            <SourceList
              refs={[
                { sourceId: 'obr-efo-2026-03', paragraph: '3.4' },
                { sourceId: 'hmt-budget-2025-speech' },
                { sourceId: 'hmt-tsc-budget-2026-letter' },
                { sourceId: 'rf-headroom-2026-07-21' },
                { sourceId: 'boe-fsr-2026-07' },
                { sourceId: 'rf-policy-landscape-2026' },
                { sourceId: 'hmt-forecasts-2026-08' },
                { sourceId: 'obr-efo-2026-03', note: 'Foreword: how the forecast was produced' },
              ]}
            />
          </aside>
        </details>
      )}

      <WorkingsOnly>
        <details className="more">
          <summary>How the estimate is made</summary>
          <div className="more__body">
            <p className="panel__hint">
              Each setting is the latest reading less the OBR’s March figure, rounded to the step
              the game uses. The OBR’s own sensitivities turn the settings into headroom.
            </p>
            <p className="panel__hint">
              <LabelBadge badge="assumption" /> The OBR’s figure is for Bank Rate and gilt yields
              moving together; we apply it to the rise in gilt yields alone, so the estimate leans
              cautious.{' '}
              <SourceList
                as="span"
                className="briefing__sources"
                refs={[{ sourceId: 'obr-efo-2026-03', paragraph: '6.17' }]}
              />
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

      <ModeLine kind="briefing" />
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
