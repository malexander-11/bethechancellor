import { formatGbpBn, freshGame, type ContextReading, type GamePermalink } from '@btc/engine';
import { useNavigate } from 'react-router-dom';
import { AssumptionReading, ContextRow, summariseReading } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Papers } from '../components/Motifs';
import { headroomOf, Scenarios } from '../components/Scenarios';
import { SourceList } from '../components/SourceLink';
import { TableScroll } from '../components/TableScroll';
import { Term } from '../components/Term';
import { context, levers, rules, vintage } from '../data';
import { StepLink } from '../journey/links';
import { macroCodesOf, matchScenario, scenarioCards } from '../journey/scenarios';
import { mintSeed } from '../journey/seed';
import { WorkingsOnly, useWorkings } from '../journey/workings';
import { permalinkQuery, useBudget } from '../state/budget';

const CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

/** The margins a Chancellor might set out to keep, £ billion; nought means whatever the rules leave. */
export const TARGETS: { bn: number; label: string; say: string }[] = [
  { bn: 10, label: '£10bn', say: 'Thin: room to spend now.' },
  { bn: 20, label: '£20bn', say: 'Where March left you.' },
  { bn: 30, label: '£30bn', say: 'Ample. It constrains the package.' },
  { bn: 0, label: 'Whatever the rules leave', say: 'The rules and no more.' },
];

/** Where the advisers think the gilt markets get nervous, £ million: their judgement, not a published figure. */
const RULE_OF_THUMB_GBPM = 20_000;

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/**
 * Step 2: your starting position. The Treasury's briefing in three numbers and one line on the
 * rules, with the rules in full one fold away; what has been promised since March and what has
 * cut the headroom, in words; then the two questions that shape everything after: which forecast
 * to plan on (four cards, each showing the headroom it leaves) and how much headroom to keep, with
 * headroom explained beneath. Both are plans, not rules: the game measures the player against
 * them and never enforces either. Confirming mints the seed for the OBR draw, which knows nothing
 * of what was chosen here. The sliders behind the cards are the expert path, behind the workings.
 */
export function OutlookPage() {
  const { state, dispatch, outcome } = useBudget();
  const navigate = useNavigate();
  const workings = useWorkings();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const years = outcome.paths.years;
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const selected = matchScenario(CARDS, state.leverValues, MACRO_CODES);
  const game = state.game;
  const revealed = game?.revealed ?? false;
  const targetBn = game?.headroomTargetBn ?? 20;
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  const gilts = reading('gilt-10y');
  const borrowing = reading('psnb-ytd');
  const prices = context.readings.find((r) => r.leverCode === 'rpi');
  // What the adviser's card leaves on this Budget: the figure the since-March block points at.
  const adviserCard = CARDS.find((c) => c.kind === 'adviser');
  const adviserHeadroom = adviserCard ? headroomOf(state, adviserCard.values) : undefined;
  const decisions = context.decisionsSinceForecast;

  const setTarget = (bn: number) => {
    if (!game) {
      // The seed is minted at the first decision here; the draw it fixes is independent of it.
      const started = { ...freshGame(mintSeed()), headroomTargetBn: bn };
      dispatch({ type: 'startGame', seed: started.seed });
      dispatch({ type: 'updateGame', patch: { headroomTargetBn: bn } });
      return;
    }
    dispatch({ type: 'updateGame', patch: { headroomTargetBn: bn } });
  };

  const confirm = () => {
    const base: GamePermalink = game ?? freshGame(mintSeed());
    const next: GamePermalink = {
      ...base,
      planning: selected ?? 'own',
      headroomTargetBn: targetBn,
      reached: Math.max(base.reached, 1),
    };
    if (!game) dispatch({ type: 'startGame', seed: next.seed });
    dispatch({ type: 'updateGame', patch: next });
    navigate({ pathname: '/pm', search: `?${permalinkQuery({ ...state, game: next })}` });
  };

  return (
    <JourneyLayout step="outlook">
      <section className="brief doc" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="brief__title">
          <Papers /> The Treasury’s briefing
        </h2>
        <dl className="brief__facts">
          <div className="brief__fact">
            <dt>Room to spend</dt>
            <dd>
              <strong>{formatGbpBn(headroom, 1)}</strong>
              <span>
                of <Term id="headroom">headroom</Term> on the OBR’s March forecast.
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
                <dt>{r.name}</dt>
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
            ) : null}
            {adviserHeadroom !== undefined ? (
              <>
                {' '}
                Your adviser’s card shows what that does:{' '}
                {formatGbpBn(adviserHeadroom, 1, adviserHeadroom < 0)} where March showed{' '}
                {formatGbpBn(headroom, 1)}.
              </>
            ) : null}
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

      <h2 className="question">
        Nobody knows what the economy will do by Budget day. Which forecast will you plan on?
      </h2>
      {revealed ? (
        <p className="note" role="note">
          The OBR’s October forecast has arrived, so these are no longer yours to set. You planned
          on <strong>{planningName(game?.planning)}</strong>; the sliders now hold the OBR’s
          figures.
        </p>
      ) : null}
      <Scenarios
        cards={CARDS}
        state={state}
        selected={selected}
        summaryYear={targetYear}
        onPick={(values) => {
          if (!revealed) dispatch({ type: 'setLevers', values });
        }}
      />

      <fieldset className="targets" disabled={revealed}>
        <legend className="question">How much headroom do you want to keep?</legend>
        <div className="targets__options" role="radiogroup" aria-label="Headroom target">
          {TARGETS.map((t) => (
            <label key={t.bn} className={`target${targetBn === t.bn ? ' target--picked' : ''}`}>
              <input
                type="radio"
                name="headroom-target"
                value={t.bn}
                checked={targetBn === t.bn}
                onChange={() => setTarget(t.bn)}
              />
              <span className="target__body">
                <strong>{t.label}</strong>
                <span>{t.say}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <details className="more">
        <summary>What is headroom?</summary>
        <aside className="note more__body" aria-label="Headroom, explained by your advisers">
          <p>
            <span className="kicker">Chief Economic Adviser</span> <LabelBadge badge="simulated" />
          </p>
          <p>
            Headroom is the gap between what the rules let you borrow and what the forecast says you
            will borrow. It is your safety margin. In March it was {formatGbpBn(headroom, 1)}.
            Forecasts move: over five years the OBR’s have been out by about{' '}
            {formatGbpBn(typicalErrorGbpm, 0)} on average. Your advisers think the markets get
            nervous below about {formatGbpBn(RULE_OF_THUMB_GBPM, 0)}. Nobody has published that
            number: it is their judgement. Whatever you pick, the OBR’s October forecast will not
            know it.
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
          <summary>Set your own figures</summary>
          <div className="more__body">
            <section className="panel" aria-labelledby="own-heading">
              <h3 id="own-heading" className="section-label">
                The three sliders behind the cards
              </h3>
              <p className="panel__hint">Each is set from a reading; move it if you know better.</p>
              <div className="readings">
                {context.readings.map((r) => {
                  const lever = r.leverCode
                    ? levers.find((l) => l.code === r.leverCode)
                    : undefined;
                  if (!lever) return null;
                  return (
                    <AssumptionReading
                      key={r.id}
                      reading={r}
                      lever={lever}
                      value={state.leverValues[lever.code] ?? lever.control.default}
                      effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                      summaryYear={targetYear}
                      onChange={(value) => {
                        if (!revealed) dispatch({ type: 'setLever', code: lever.code, value });
                      }}
                    />
                  );
                })}
              </div>
            </section>
            <section className="panel" aria-labelledby="also-heading">
              <h3 id="also-heading" className="section-label">
                Also changed since March
              </h3>
              <TableScroll label="Also changed since March">
                <table className="measures">
                  <thead>
                    <tr>
                      <th>Reading</th>
                      <th>OBR in March</th>
                      <th>Latest</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {context.readings
                      .filter((r) => !r.leverCode)
                      .map((r) => (
                        <ContextRow key={r.id} reading={r} />
                      ))}
                  </tbody>
                </table>
              </TableScroll>
            </section>
          </div>
        </details>
      </WorkingsOnly>

      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={confirm}>
          Set my starting position
        </button>
        <StepLink to="/" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}

function planningName(kind: string | undefined): string {
  const card = CARDS.find((c) => c.kind === kind);
  if (card) return card.title.charAt(0).toLowerCase() + card.title.slice(1);
  return 'figures of your own';
}
