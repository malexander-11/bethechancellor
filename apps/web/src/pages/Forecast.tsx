import {
  ambitionStatus,
  decomposeForecast,
  drawForecast,
  formatGbpBn,
  freshGame,
  outcomeOdds,
  pick,
  revisedMeasures,
  stageIndex,
  type RuleVerdict,
} from '@btc/engine';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { TableScroll } from '../components/TableScroll';
import { formatLeverValue } from '../components/LeverControl';
import { SourceList } from '../components/SourceLink';
import { context, draws, levers, leversByCategory, pm, rules, vintage, options } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { macroCodesOf, scenarioCards } from '../journey/scenarios';
import { useWorkings } from '../journey/workings';
import { IMPLEMENTATION_YEAR, permalinkQuery, useBudget } from '../state/budget';

const CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);
/** The first of the two screens of step 5; the compromises are the second. */
const PART = { index: 1, total: 2, label: 'The forecast' };

const STATUS: Record<RuleVerdict['status'], { text: string; tone: string; icon: string }> = {
  met: { text: 'Rule met', tone: 'good', icon: '✓' },
  notMet: { text: 'Rule not met', tone: 'critical', icon: '✕' },
  withinCap: { text: 'Within the cap', tone: 'good', icon: '✓' },
  aboveCapWithinMargin: { text: 'Above cap, within margin', tone: 'warning', icon: '!' },
  aboveMargin: { text: 'Cap breached', tone: 'critical', icon: '✕' },
  unavailable: { text: 'Not assessable', tone: 'muted', icon: '?' },
};

/**
 * Step 5, first screen: the OBR's forecast. Which forecast arrives was fixed by the seed when the
 * player confirmed their starting position (ADR-0012); opening it overwrites the macro sliders
 * with the OBR's figures and locks that step. The screen then says what changed in two lines,
 * the economy and the costings, what that leaves of the headroom against the target, and what it
 * does to the ambitions; the tables behind the two lines wait under "See the numbers". The state
 * of the game decides which of the two faces shows, so a link that lands here works either way.
 */
export function ForecastPage() {
  const { state, dispatch } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const seed = game?.seed ?? 0;
  const draw = useMemo(
    () => (seed > 0 ? drawForecast(seed, draws, context, levers, vintage) : null),
    [seed],
  );
  const planning = game?.planning ?? 'baseline';
  const planningMacro = useMemo(() => {
    if (planning !== 'own') return CARDS.find((c) => c.kind === planning)?.values ?? {};
    // Hand-set sliders: the snapshot remembers them once the forecast is open, the URL before.
    return pick(state.snapshot ?? state.leverValues, MACRO_CODES);
  }, [planning, state.snapshot, state.leverValues]);
  const decomposition = useMemo(
    () =>
      draw && game
        ? decomposeForecast({
            vintage,
            rules,
            levers,
            settings: {
              implementationYear: IMPLEMENTATION_YEAR,
              debtInterestFeedback: state.debtInterestFeedback,
              assessAsOf: state.assessAsOf,
              ...(Object.keys(game.delays).length > 0
                ? { implementationYearByCode: game.delays }
                : {}),
            },
            policy: state.leverValues,
            planningMacro,
            drawMacro: draw.values,
            revisions: draw.revisions,
            macroCodes: MACRO_CODES,
          })
        : null,
    [draw, game, planningMacro, state.leverValues, state.debtInterestFeedback, state.assessAsOf],
  );

  const guard = useStageGuard('forecast');
  if (guard) return guard;
  if (!game || !draw) {
    return <Navigate to={{ pathname: '/outlook', search }} replace />;
  }

  /** Open the forecast: the sliders become the OBR's, the starting position becomes history. */
  const reveal = () => {
    if (!state.snapshot) dispatch({ type: 'setSnapshot', values: { ...state.leverValues } });
    dispatch({ type: 'setLevers', values: draw.values });
    dispatch({
      type: 'updateGame',
      patch: { revealed: true, reached: Math.max(game.reached, stageIndex('forecast')) },
    });
  };
  const onward = () => {
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('compromise')) },
    });
  };

  const odds = outcomeOdds(draws)[draw.outcome.id] ?? 0;
  const replay = `/outlook?${permalinkQuery({
    leverValues: {},
    debtInterestFeedback: true,
    assessAsOf: 'vintage',
    warnings: [],
    game: freshGame(game.seed),
  })}`;

  if (!game.revealed || !decomposition) {
    return (
      <JourneyLayout
        step="forecast"
        part={PART}
        title="The forecast arrives"
        tabTitle="The forecast arrives"
        lead="The Office for Budget Responsibility has finished its own forecast. It does not know what you planned on."
      >
        <section className="envelope doc" aria-label="A sealed envelope">
          <p className="doc__head">
            <span className="kicker">Office for Budget Responsibility</span>
            <span className="doc__ref">Pre-measures forecast · in confidence</span>
          </p>
          <p>
            This is the forecast your Budget will be judged against. It was fixed the day you chose
            your starting position. Open it, and its figures replace the ones you planned on.
          </p>
          <p className="source">
            Seed {game.seed} of 999 · <LabelBadge badge="simulated" /> which published forecast is
            inside was decided by a draw weighted to the centre.
          </p>
        </section>
        <p className="actions">
          <button type="button" className="btn btn--primary" onClick={reveal}>
            Open the forecast
          </button>
          <StepLink to="/budget/afford" className="btn">
            Back
          </StepLink>
        </p>
      </JourneyLayout>
    );
  }

  const arrived = draw.outcome.title.replace(/^./, (c) => c.toLowerCase());
  return (
    <JourneyLayout
      step="forecast"
      part={PART}
      title="What changed"
      tabTitle="What changed"
      lead={
        <>
          The OBR’s forecast is in: <strong>{arrived}</strong>. Here is what moved, and what it
          leaves you.
        </>
      }
    >
      <ForecastReveal
        decomposition={decomposition}
        draw={draw}
        planning={planning}
        planningMacro={planningMacro}
        game={game}
        odds={odds}
        replay={replay}
        onward={onward}
      />
    </JourneyLayout>
  );
}

/**
 * The forecast taken apart: what the economy did and what the OBR made of the player's own
 * costings, each one line with the engine's figure; the bottom line against the target and the
 * rules; and what that leaves of the ambitions. The tables behind the lines, the story's sources
 * and the disclosure of how the draw was made are one fold away.
 */
function ForecastReveal({
  decomposition,
  draw,
  planning,
  planningMacro,
  game,
  odds,
  replay,
  onward,
}: {
  decomposition: ReturnType<typeof decomposeForecast>;
  draw: ReturnType<typeof drawForecast>;
  planning: string;
  planningMacro: Record<string, number>;
  game: NonNullable<ReturnType<typeof useBudget>['state']['game']>;
  odds: number;
  replay: string;
  onward: () => void;
}) {
  const workings = useWorkings();
  const d = decomposition;
  const year = d.targetYear;
  const revised = revisedMeasures(d.revised, year);
  const status = ambitionStatus(game, pm, options, d.revised, levers);
  const before = ambitionStatus(game, pm, options, d.planned, levers);
  const target = game.headroomTargetBn * 1000;
  const planningName =
    planning === 'own'
      ? 'figures of your own'
      : (CARDS.find((c) => c.kind === planning)?.title ?? planning).replace(/^./, (c) =>
          c.toLowerCase(),
        );
  const nowBroken = status.promises.filter(
    (p) => !p.kept && before.promises.find((q) => q.promise.id === p.promise.id)?.kept,
  );
  return (
    <>
      <section className="panel doc" aria-labelledby="changed-heading">
        <h2 id="changed-heading" className="section-label">
          What the OBR changed
        </h2>
        <p className="reveal__headline">
          <strong>{draw.outcome.title}.</strong> {draw.outcome.story.headline}{' '}
          <LabelBadge badge={draw.outcome.story.badge} />
        </p>
        <p className="reveal__line">
          <span className="reveal__label">
            The economy moved, including what dearer money does to your own borrowing
          </span>
          <strong className={`amount ${tone(d.economyGbpm)}`}>
            {formatGbpBn(d.economyGbpm, 1, true)}
          </strong>
          <LabelBadge badge="mechanical" />
        </p>
        <p className="reveal__line">
          <span className="reveal__label">The OBR re-scored your measures</span>
          <strong className={`amount ${tone(d.costingsGbpm)}`}>
            {formatGbpBn(d.costingsGbpm, 1, true)}
          </strong>
          <LabelBadge badge="simulated" />
        </p>
        <p className="panel__hint">
          {revised.length === 0
            ? 'The OBR certified every measure as you scored it.'
            : `${revised.length} of your measures ${revised.length === 1 ? 'carries' : 'carry'} a caveat this outcome doubts.`}{' '}
          You planned on {planningName}.
        </p>
        <details className="more">
          <summary>See the numbers</summary>
          <div className="more__body">
            <h3 className="section-label">What happened to the economy</h3>
            <p>{draw.outcome.story.text}</p>
            <SourceList refs={draw.outcome.story.sources} />
            <TableScroll label="What happened to the economy">
              <table className="measures decomp">
                <thead>
                  <tr>
                    <th>Assumption</th>
                    <th>OBR in March</th>
                    <th>You planned on</th>
                    <th>OBR, October</th>
                  </tr>
                </thead>
                <tbody>
                  {leversByCategory.macro.map((lever) => {
                    const setting = draw.settings.find((s) => s.leverCode === lever.code);
                    return (
                      <tr key={lever.code}>
                        <td>
                          {lever.shortTitle}
                          {workings && setting ? (
                            <span className="source"> {setting.workings}</span>
                          ) : null}
                        </td>
                        <td>as forecast</td>
                        <td>
                          {formatLeverValue(
                            lever,
                            planningMacro[lever.code] ?? lever.control.default,
                          )}
                        </td>
                        <td>
                          <strong>
                            {formatLeverValue(
                              lever,
                              draw.values[lever.code] ?? lever.control.default,
                            )}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
            <p className="panel__hint">
              Headroom on your assumptions:{' '}
              {formatGbpBn(d.headroom.planned, 1, d.headroom.planned < 0)}; on the OBR’s economy:{' '}
              {formatGbpBn(d.headroom.economy, 1, d.headroom.economy < 0)}.
            </p>
            <h3 className="section-label">What happened to your measures</h3>
            {revised.length === 0 ? (
              <p>
                The OBR certified every measure as you scored it. Nothing in your package carries a
                caveat this outcome doubts.
              </p>
            ) : (
              <TableScroll label="What happened to your measures">
                <table className="measures decomp">
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>As you scored it, {year}</th>
                      <th>As the OBR scores it</th>
                      {workings ? <th>Why</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {revised.map((r) => (
                      <tr key={r.effect.code}>
                        <td>
                          {r.effect.title} <LabelBadge badge={r.effect.badge} />{' '}
                          <span className="tag--treasury">re-scored ×{r.revision.factor}</span>
                        </td>
                        <td className="amount">{formatGbpBn(r.asScoredGbpm, 1, true)}</td>
                        <td className="amount">
                          <strong>{formatGbpBn(r.revisedGbpm, 1, true)}</strong>
                        </td>
                        {workings ? (
                          <td>
                            <span className="source">
                              <LabelBadge badge="simulated" /> {r.revision.note}
                            </span>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
            <aside className="note" aria-label="How this forecast was made">
              <p>
                <span className="kicker">Disclosure</span> <LabelBadge badge="simulated" />
              </p>
              <p>{draws.disclosure}</p>
              <p className="source">
                Seed {game.seed}: this outcome arrives in about {Math.round(odds * 100)} seeds in
                100. <a href={replay}>Replay these conditions</a> with a fresh Budget.
              </p>
            </aside>
          </div>
        </details>
      </section>

      <section className="panel doc bottom-line" aria-labelledby="bottom-heading">
        <h2 id="bottom-heading" className="section-label">
          The bottom line
        </h2>
        <p className="reveal__line reveal__line--total">
          <span className="reveal__label">Headroom, {year}: what you planned on → the OBR’s</span>
          <strong>
            {formatGbpBn(d.headroom.planned, 1, d.headroom.planned < 0)} →{' '}
            <span className={`amount ${tone(d.totalGbpm)}`}>
              {formatGbpBn(d.headroom.revised, 1, d.headroom.revised < 0)}
            </span>
          </strong>
          <span className="reveal__delta">({formatGbpBn(d.totalGbpm, 1, true)})</span>
        </p>
        <p>
          {target > 0
            ? d.headroom.revised >= target
              ? `Inside your ${formatGbpBn(target, 0)} target, with ${formatGbpBn(d.headroom.revised - target, 1)} to spare.`
              : `${formatGbpBn(target - d.headroom.revised, 1)} short of the ${formatGbpBn(target, 0)} target you set yourself.`
            : 'You set no target beyond the rules themselves.'}
        </p>
        <ul className="rule-list">
          {d.revised.verdicts.map((v) => (
            <li key={v.ruleId}>
              <span className={`status status--${STATUS[v.status].tone}`}>
                <span className="status__icon" aria-hidden="true">
                  {STATUS[v.status].icon}
                </span>
                {STATUS[v.status].text}
              </span>{' '}
              <span className="source">
                {v.ruleName}: {formatGbpBn(v.headroomGbpm, 1, v.headroomGbpm < 0)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel doc" aria-labelledby="ambitions-heading">
        <h2 id="ambitions-heading" className="section-label">
          What this does to your ambitions
        </h2>
        {status.priorities.length === 0 && status.promises.length === 0 ? (
          <p className="panel__hint">
            Nothing was agreed in Downing Street, so nothing is at risk.
          </p>
        ) : (
          <ul className="ambitions">
            {status.priorities.map((p) => (
              <li key={p.priority.id}>
                <strong>{p.priority.title}</strong>:{' '}
                {p.status === 'part' ? 'partly delivered' : p.status}
                {p.status !== 'undelivered' ? ` · ${formatGbpBn(p.costGbpm, 1)} in ${year}` : ''}
              </li>
            ))}
            {nowBroken.map((p) => (
              <li key={p.promise.id} className="ambitions__broken">
                <strong>{p.promise.title}</strong>: now broken by the arithmetic, not by a choice
                you made.
              </li>
            ))}
            {status.broken > nowBroken.length ? (
              <li className="ambitions__broken">
                {status.broken - nowBroken.length} promise
                {status.broken - nowBroken.length === 1 ? '' : 's'} already broken before the
                forecast.
              </li>
            ) : null}
            {d.totalGbpm > 0 ? (
              <li>Room has opened: {formatGbpBn(d.totalGbpm, 1)} more than you planned on.</li>
            ) : null}
          </ul>
        )}
      </section>

      <p className="actions">
        <StepLink to="/compromise" className="btn btn--primary" onClick={onward}>
          Respond to it
        </StepLink>
        <StepLink to="/budget/afford" className="btn">
          Back
        </StepLink>
      </p>
    </>
  );
}

function tone(v: number): string {
  return v > 0.5 ? 'amount--better' : v < -0.5 ? 'amount--worse' : '';
}
