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
import { formatLeverValue } from '../components/LeverControl';
import { SourceList } from '../components/SourceLink';
import { context, draws, levers, leversByCategory, pm, rules, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { macroCodesOf, scenarioCards } from '../journey/scenarios';
import { useWorkings } from '../journey/workings';
import { IMPLEMENTATION_YEAR, permalinkQuery, useBudget } from '../state/budget';

const CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

const STAMP: Record<RuleVerdict['status'], { text: string; tone: string }> = {
  met: { text: 'Rule met', tone: 'stamp--good' },
  notMet: { text: 'Rule not met', tone: 'stamp--bad' },
  withinCap: { text: 'Within the cap', tone: 'stamp--good' },
  aboveCapWithinMargin: { text: 'Above cap, within margin', tone: 'stamp--warn' },
  aboveMargin: { text: 'Cap breached', tone: 'stamp--bad' },
  unavailable: { text: 'Not assessable', tone: 'stamp--muted' },
};

/**
 * Stage 4. The envelope from the OBR. Which forecast is inside was fixed by the seed when the
 * player confirmed their outlook (ADR-0012); opening it overwrites the macro sliders with the
 * OBR's figures and locks the outlook step. The page then takes the move apart: what the economy
 * did, what the OBR made of the player's own costings, and what that leaves of the ambitions.
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
    // Hand-set sliders: the snapshot remembers them once the envelope is open, the URL before.
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

  /** Open the envelope: the sliders become the OBR's, the outlook step becomes history. */
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

  return (
    <JourneyLayout
      step="forecast"
      part={{ noun: 'Part', index: 1, total: 2, label: 'the forecast' }}
    >
      <Beats step="forecast">
        <Beat
          title="An envelope from the Office for Budget Responsibility"
          continueLabel="Open the envelope"
          onAdvance={reveal}
        >
          <div className="envelope doc doc--ruled" aria-label="A sealed envelope">
            <p className="letter__from">
              <span className="kicker">Office for Budget Responsibility</span>
              <span className="letter__ref">Pre-measures forecast · in confidence</span>
            </p>
            <p>
              This is the forecast your Budget will be judged against. It was fixed the day you
              chose your assumptions, and it does not know what you chose. Open it, and the sliders
              become the OBR’s.
            </p>
            <p className="source">
              Seed {game.seed} of 999 · <LabelBadge badge="simulated" /> which published forecast is
              inside was decided by a draw weighted to the centre.
            </p>
          </div>
        </Beat>
        <Beat title="What the forecast says">
          {!game.revealed || !decomposition ? (
            <p className="hero-start__actions">
              <button type="button" className="btn btn--primary" onClick={reveal}>
                Open the envelope
              </button>
            </p>
          ) : (
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
          )}
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}

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
  const status = ambitionStatus(game, pm, d.revised, levers);
  const before = ambitionStatus(game, pm, d.planned, levers);
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
      <section className="panel doc" aria-labelledby="economy-heading">
        <h2 id="economy-heading" className="section-label">
          1 · What happened to the economy
        </h2>
        <p className="reveal__headline">
          <strong>{draw.outcome.title}.</strong> {draw.outcome.story.headline}{' '}
          <LabelBadge badge={draw.outcome.story.badge} />
        </p>
        <p>{draw.outcome.story.text}</p>
        <SourceList refs={draw.outcome.story.sources} />
        <div className="table-scroll">
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
                      {formatLeverValue(lever, planningMacro[lever.code] ?? lever.control.default)}
                    </td>
                    <td>
                      <strong>
                        {formatLeverValue(lever, draw.values[lever.code] ?? lever.control.default)}
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="reveal__line">
          <span className="reveal__label">
            The economy moved, including what dearer money does to your own borrowing
          </span>
          <strong className={`amount ${tone(d.economyGbpm)}`}>
            {formatGbpBn(d.economyGbpm, 1, true)}
          </strong>
          <LabelBadge badge="mechanical" />
        </p>
        <p className="panel__hint">
          You planned on {planningName}. Headroom on your assumptions:{' '}
          {formatGbpBn(d.headroom.planned, 1, d.headroom.planned < 0)}; on the OBR’s economy:{' '}
          {formatGbpBn(d.headroom.economy, 1, d.headroom.economy < 0)}.
        </p>
      </section>

      <section className="panel doc" aria-labelledby="costings-heading">
        <h2 id="costings-heading" className="section-label">
          2 · What happened to your measures
        </h2>
        {revised.length === 0 ? (
          <p>
            The OBR certified every measure as you scored it. Nothing in your package carries a
            caveat this outcome doubts.
          </p>
        ) : (
          <div className="table-scroll">
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
          </div>
        )}
        <p className="reveal__line">
          <span className="reveal__label">The OBR re-scored your measures</span>
          <strong className={`amount ${tone(d.costingsGbpm)}`}>
            {formatGbpBn(d.costingsGbpm, 1, true)}
          </strong>
          <LabelBadge badge="simulated" />
        </p>
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
        <ul className="stamps">
          {d.revised.verdicts.map((v) => (
            <li key={v.ruleId}>
              <span className={`stamp ${STAMP[v.status].tone}`}>{STAMP[v.status].text}</span>{' '}
              <span className="source">
                {v.ruleName}: {formatGbpBn(v.headroomGbpm, 1, v.headroomGbpm < 0)}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="section-label">What this does to your ambitions</h3>
        {status.priorities.length === 0 && status.promises.length === 0 ? (
          <p className="panel__hint">
            Nothing was agreed in Downing Street, so nothing is at risk.
          </p>
        ) : (
          <ul className="ambitions">
            {status.priorities.map((p) => (
              <li key={p.flagship.id}>
                <strong>{p.flagship.title}</strong>: {p.status.replace('-', ' ')}
                {p.status !== 'unfunded' ? ` · ${formatGbpBn(p.costGbpm, 1)} in ${year}` : ''}
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
                {status.broken - nowBroken.length === 1 ? '' : 's'} already broken on the desk.
              </li>
            ) : null}
            {d.totalGbpm > 0 ? (
              <li>Room has opened: {formatGbpBn(d.totalGbpm, 1)} more than you planned on.</li>
            ) : null}
          </ul>
        )}
      </section>

      <aside className="note" aria-label="How this forecast was made">
        <p>
          <span className="kicker">Disclosure</span> <LabelBadge badge="simulated" />
        </p>
        <p>{draws.disclosure}</p>
        <p className="source">
          Seed {game.seed}: this outcome arrives in about {Math.round(odds * 100)} seeds in 100.{' '}
          <a href={replay}>Replay these conditions</a> with a fresh Budget.
        </p>
      </aside>

      <p className="hero-start__actions">
        <StepLink to="/compromise" className="btn btn--primary" onClick={onward}>
          Make it add up
        </StepLink>
        <StepLink to="/budget/taxes" className="btn">
          Back to the desk
        </StepLink>
      </p>
    </>
  );
}

function tone(v: number): string {
  return v > 0.5 ? 'amount--better' : v < -0.5 ? 'amount--worse' : '';
}
