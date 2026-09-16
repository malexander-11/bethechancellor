import {
  ambitionStatus,
  delayOptions,
  formatGbpBn,
  narrowedValue,
  promisesInForce,
  revenueSuggestions,
  spendingMeasures,
  stageIndex,
  type Lever,
} from '@btc/engine';
import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { DespatchBox } from '../components/DespatchBox';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { formatLeverValue } from '../components/LeverControl';
import { MinisterLine } from '../components/MinisterLine';
import { Scorecard } from '../components/Scorecard';
import { adviserById, compromise, context, levers, pm, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { macroCodesOf } from '../journey/scenarios';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';
import { TARGETS } from './Outlook';

const MACRO_CODES = macroCodesOf(context.readings);
const MAX_CAPITAL = 3;

type Ask = { kind: 'priority' | 'promise'; id: string } | null;

/**
 * Stage 5. The gap between the headroom the OBR's forecast leaves and the margin the player meant
 * to keep, and six ways through it: raise more, spend less or later, narrow a flagship, go back
 * to the Prime Minister, accept less headroom, or proceed with a rule missed and say so. Every
 * figure on the routes is the engine's, re-run for the move in question; every word beside them
 * is an adviser's and wears the badge.
 */
export function CompromisePage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const [ask, setAsk] = useState<Ask>(null);
  const delays = game?.delays ?? {};
  const headroomOf = useHeadroomOf();
  const promises = useMemo(() => (game ? promisesInForce(game, pm) : []), [game]);
  const revenue = useMemo(
    () => revenueSuggestions(levers, state.leverValues, promises, headroomOf, 3),
    [state.leverValues, promises, headroomOf],
  );

  if (!game) return <Navigate to={{ pathname: '/outlook', search }} replace />;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = game.headroomTargetBn * 1000;
  const gap = target - headroom;
  const status = ambitionStatus(game, pm, outcome, levers);
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const lastYear = outcome.paths.years[outcome.paths.years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const spending = spendingMeasures(levers, outcome, targetYear).slice(0, 5);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;
  const role = (id: string) => adviserById.get(id)?.role ?? id;

  /** What one move would do to headroom in the target year, £ million. */
  const effectOf = (values: Record<string, number>, overrideDelays?: Record<string, string>) =>
    headroomOf(values, overrideDelays) - headroom;

  const spend = (patch: Partial<typeof game>) => dispatch({ type: 'updateGame', patch });
  const set = (code: string, v: number) => dispatch({ type: 'setLever', code, value: v });
  const setDelay = (code: string, year: string) => {
    const next = { ...delays };
    if (year === '') delete next[code];
    else next[code] = year;
    spend({ delays: next });
  };
  const dropPriority = (id: string) => {
    spend({
      priorities: game.priorities.filter((p) => p !== id),
      dropped: [...game.dropped, id],
      capital: game.capital - 1,
    });
    setAsk(null);
  };
  const releasePromise = (id: string) => {
    const inForce = promises.map((p) => p.id).filter((p) => p !== id);
    spend({ protectedPromises: inForce, capital: game.capital - 1 });
    setAsk(null);
  };

  // Who feels it: the spending measures cut back since the package left the desk.
  const felt = Object.entries(state.snapshot ?? {})
    .filter(([code, was]) => {
      const lever = byCode.get(code);
      if (!lever || MACRO_CODES.includes(code) || lever.category === 'tax') return false;
      return (state.leverValues[code] ?? lever.control.default) < was;
    })
    .map(([code]) => byCode.get(code))
    .filter((l): l is Lever => l !== undefined)
    .slice(0, 3);

  return (
    <JourneyLayout step="compromise">
      <h1 className="page-title">Step 5 · Make it add up</h1>
      <p className="lede">
        A week to the Budget. Headroom against the target you set; six ways through, none of them
        free. The desk is still open, and everything here moves the same levers.
      </p>
      <Beats step="compromise">
        <Beat title="The gap, and the routes through it">
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} sticky revealed />
          <DespatchBox
            game={game}
            status={status}
            headroomGbpm={headroom}
            targetYear={targetYear}
          />
          <section className="gap doc" aria-label="The gap">
            <p className="gap__line">
              {target > 0 ? (
                gap > 0 ? (
                  <>
                    <strong className="amount amount--worse">{formatGbpBn(gap, 1)} short</strong> of
                    the {formatGbpBn(target, 0)} you set out to keep.
                  </>
                ) : (
                  <>
                    <strong className="amount amount--better">
                      {formatGbpBn(-gap, 1)} to spare
                    </strong>{' '}
                    against the {formatGbpBn(target, 0)} you set out to keep.
                  </>
                )
              ) : headroom >= 0 ? (
                <>
                  <strong className="amount">{formatGbpBn(headroom, 1)}</strong> of headroom, and
                  you set no target beyond the rules.
                </>
              ) : (
                <>
                  <strong className="amount amount--worse">
                    {formatGbpBn(-headroom, 1)} short
                  </strong>{' '}
                  of the stability rule itself.
                </>
              )}
              {missed.length > 0 ? (
                <span className="gap__missed">
                  {' '}
                  {missed.map((v) => v.ruleName).join(' and ')} missed on these numbers.
                </span>
              ) : null}
            </p>
          </section>

          <div className="routes">
            <section className="route doc" aria-labelledby="route-revenue">
              <h2 id="route-revenue" className="section-label">
                1 · Raise more revenue
              </h2>
              <Spoken
                line={compromise.routes.revenue.line}
                who={role(compromise.routes.revenue.adviser)}
                tone="adviser"
              />
              <ul className="suggestions">
                {revenue.map((s) => (
                  <li key={s.lever.code} className="suggestion">
                    <div>
                      <strong>{s.lever.title}</strong>{' '}
                      <span className="source">
                        to {formatLeverValue(s.lever, s.value)} ·{' '}
                        <LabelBadge badge={s.lever.badge} />
                      </span>
                      {s.breaks.length > 0 ? (
                        <span className="tag--treasury tag--warn">
                          breaks {s.breaks.map((p) => p.title).join(', ')}
                        </span>
                      ) : null}
                    </div>
                    <div className="suggestion__act">
                      <span className="amount amount--better">
                        {formatGbpBn(s.yieldGbpm, 1, true)}
                      </span>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => set(s.lever.code, s.value)}
                      >
                        Do it
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="panel__hint">
                <StepLink to="/budget/taxes">Every tax, on the desk</StepLink>
              </p>
            </section>

            <section className="route doc" aria-labelledby="route-spending">
              <h2 id="route-spending" className="section-label">
                2 · Spend less, or later
              </h2>
              <Spoken
                line={compromise.routes.spending.line}
                who={role(compromise.routes.spending.adviser)}
                tone="adviser"
              />
              {spending.length === 0 ? (
                <p className="panel__hint">Nothing in your package costs money in {targetYear}.</p>
              ) : (
                <ul className="suggestions">
                  {spending.map((m) => {
                    const start = delays[m.lever.code] ?? IMPLEMENTATION_YEAR;
                    const options = delayOptions(outcome.paths.policyYears, IMPLEMENTATION_YEAR);
                    const next = delayOptions(outcome.paths.policyYears, start)[0];
                    const nextSaving = next
                      ? effectOf(state.leverValues, { ...delays, [m.lever.code]: next })
                      : 0;
                    return (
                      <li key={m.lever.code} className="suggestion">
                        <div>
                          <strong>{m.lever.title}</strong>{' '}
                          <span className="source">
                            {formatLeverValue(m.lever, value(m.lever))} · costs{' '}
                            {formatGbpBn(m.costGbpm, 1)} in {targetYear}
                            {delays[m.lever.code] ? ` · starts ${delays[m.lever.code]}` : ''}
                          </span>
                        </div>
                        <div className="suggestion__act">
                          <label className="suggestion__delay">
                            <span className="sr-only">Start year for {m.lever.title}</span>
                            <select
                              value={delays[m.lever.code] ?? ''}
                              onChange={(e) => setDelay(m.lever.code, e.target.value)}
                            >
                              <option value="">Starts {IMPLEMENTATION_YEAR}</option>
                              {options.map((y) => (
                                <option key={y} value={y}>
                                  Delay to {y}
                                </option>
                              ))}
                            </select>
                          </label>
                          {next ? (
                            <span className="source">
                              a year later: {formatGbpBn(nextSaving, 1, true)}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="btn"
                            onClick={() => set(m.lever.code, m.lever.control.default)}
                          >
                            Drop it
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="panel__hint">
                <StepLink to="/budget/spending">Every budget, on the desk</StepLink>
              </p>
            </section>

            <section className="route doc" aria-labelledby="route-narrow">
              <h2 id="route-narrow" className="section-label">
                3 · Narrow a flagship
              </h2>
              <Spoken
                line={compromise.routes.narrow.line}
                who={role(compromise.routes.narrow.adviser)}
                tone="adviser"
              />
              {status.priorities.length === 0 ? (
                <p className="panel__hint">You agreed no priorities to narrow.</p>
              ) : (
                <ul className="suggestions">
                  {status.priorities.map((p) => {
                    const lever = byCode.get(p.flagship.target.code);
                    if (!lever) return null;
                    const narrowed = narrowedValue(lever, p.flagship.target.value);
                    const funded = p.status === 'funded' || p.status === 'delayed';
                    return (
                      <li key={p.flagship.id} className="suggestion">
                        <div>
                          <strong>{p.flagship.title}</strong>{' '}
                          <span className="source">
                            {p.status.replace('-', ' ')} · {formatLeverValue(lever, value(lever))}
                            {lever.control.kind === 'toggle'
                              ? ''
                              : ` of ${formatLeverValue(lever, p.flagship.target.value)}`}
                          </span>
                        </div>
                        <div className="suggestion__act">
                          {funded && narrowed !== null ? (
                            <>
                              <span className="source">
                                to {formatLeverValue(lever, narrowed)}:{' '}
                                {formatGbpBn(
                                  effectOf({ ...state.leverValues, [lever.code]: narrowed }),
                                  1,
                                  true,
                                )}
                              </span>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => set(lever.code, narrowed)}
                              >
                                Narrow it
                              </button>
                            </>
                          ) : funded ? (
                            <>
                              <span className="source">
                                a toggle cannot be halved · off:{' '}
                                {formatGbpBn(
                                  effectOf({
                                    ...state.leverValues,
                                    [lever.code]: lever.control.default,
                                  }),
                                  1,
                                  true,
                                )}
                              </span>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => set(lever.code, lever.control.default)}
                              >
                                Switch it off
                              </button>
                            </>
                          ) : (
                            <span className="source">not funded, so nothing to narrow</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="route doc" aria-labelledby="route-pm">
              <h2 id="route-pm" className="section-label">
                4 · Go back to the Prime Minister
              </h2>
              <Spoken
                line={compromise.routes.pm.line}
                who={role(compromise.routes.pm.adviser)}
                tone="adviser"
              />
              <p className="panel__hint">
                Political capital: {game.capital} of {MAX_CAPITAL}.
              </p>
              <ul className="suggestions">
                {status.priorities.map((p) => (
                  <li key={p.flagship.id} className="suggestion suggestion--stack">
                    <div>
                      <strong>{p.flagship.title}</strong>
                      {ask?.kind === 'priority' && ask.id === p.flagship.id ? null : (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setAsk({ kind: 'priority', id: p.flagship.id })}
                        >
                          Ask to drop it
                        </button>
                      )}
                    </div>
                    {ask?.kind === 'priority' && ask.id === p.flagship.id ? (
                      <div>
                        <Spoken
                          line={
                            game.capital > 0
                              ? pm.renegotiation.dropPriority
                              : pm.renegotiation.refuse
                          }
                          who="The Prime Minister"
                        />
                        {game.capital > 0 ? (
                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => dropPriority(p.flagship.id)}
                          >
                            Drop it, and own it
                          </button>
                        ) : null}
                        <button type="button" className="linklike" onClick={() => setAsk(null)}>
                          Leave it
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
                {promises.map((p) => (
                  <li key={p.id} className="suggestion suggestion--stack">
                    <div>
                      <strong>{p.title}</strong>
                      {ask?.kind === 'promise' && ask.id === p.id ? null : (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setAsk({ kind: 'promise', id: p.id })}
                        >
                          Ask to be released
                        </button>
                      )}
                    </div>
                    {ask?.kind === 'promise' && ask.id === p.id ? (
                      <div>
                        <Spoken
                          line={
                            game.capital > 0
                              ? pm.renegotiation.releasePromise
                              : pm.renegotiation.refuse
                          }
                          who="The Prime Minister"
                        />
                        {game.capital > 0 ? (
                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => releasePromise(p.id)}
                          >
                            Break it in my own name
                          </button>
                        ) : null}
                        <button type="button" className="linklike" onClick={() => setAsk(null)}>
                          Leave it
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="route doc" aria-labelledby="route-target">
              <h2 id="route-target" className="section-label">
                5 · Accept less headroom
              </h2>
              <Spoken
                line={compromise.routes.target.line}
                who={role(compromise.routes.target.adviser)}
                tone="adviser"
              />
              <div className="targets__options" role="radiogroup" aria-label="Headroom target">
                {TARGETS.map((t) => (
                  <label
                    key={t.bn}
                    className={`target${game.headroomTargetBn === t.bn ? ' target--picked' : ''}`}
                  >
                    <input
                      type="radio"
                      name="headroom-target"
                      value={t.bn}
                      checked={game.headroomTargetBn === t.bn}
                      onChange={() => spend({ headroomTargetBn: t.bn })}
                    />
                    <span className="target__body">
                      <strong>{t.label}</strong>
                      <span>{t.say}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="route doc route--breach" aria-labelledby="route-breach">
              <h2 id="route-breach" className="section-label">
                6 · Borrow, and say so
              </h2>
              {missed.length > 0 ? (
                <>
                  <Spoken
                    line={compromise.routes.breach.line}
                    who={role(compromise.routes.breach.adviser)}
                    tone="adviser"
                  />
                  <label className="breach">
                    <input
                      type="checkbox"
                      checked={game.breachAccepted}
                      onChange={(e) => spend({ breachAccepted: e.target.checked })}
                    />
                    <span>
                      I understand that{' '}
                      {missed
                        .map(
                          (v) =>
                            `the ${v.ruleName.toLowerCase()} will be missed by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`,
                        )
                        .join(' and ')}{' '}
                      on these numbers, and I am choosing to proceed.
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <Spoken
                    line={compromise.routes.breach.noBreach}
                    who={role(compromise.routes.breach.adviser)}
                    tone="adviser"
                  />
                  {game.breachAccepted ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => spend({ breachAccepted: false })}
                    >
                      Withdraw the acknowledgement
                    </button>
                  ) : null}
                </>
              )}
            </section>
          </div>

          {felt.length > 0 ? (
            <section className="panel" aria-labelledby="felt-heading">
              <h2 id="felt-heading" className="section-label">
                Who feels it
              </h2>
              {felt.map((lever) => (
                <MinisterLine key={lever.code} lever={lever} value={value(lever)} />
              ))}
            </section>
          ) : null}

          <p className="hero-start__actions">
            <StepLink
              to="/rabbit"
              className="btn btn--primary"
              onClick={() => spend({ reached: Math.max(game.reached, stageIndex('rabbit')) })}
            >
              Something for the speech
            </StepLink>
            <StepLink to="/forecast" className="btn">
              Back to the forecast
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
