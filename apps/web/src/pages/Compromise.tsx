import {
  ambitionStatus,
  delayOptions,
  effectiveStartYear,
  formatGbpBn,
  narrowedValue,
  resilienceRows,
  revenueSuggestions,
  spendingMeasures,
  stageIndex,
  type Lever,
} from '@btc/engine';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { BudgetSummary } from '../components/BudgetSummary';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { formatLeverValue } from '../components/LeverControl';
import { MinisterLine } from '../components/MinisterLine';
import { Scorecard } from '../components/Scorecard';
import { SourceList } from '../components/SourceLink';
import {
  adviserById,
  compromise,
  context,
  draws,
  levers,
  pm,
  rules,
  vintage,
  options,
} from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { macroCodesOf } from '../journey/scenarios';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';
import { TARGETS } from './Outlook';

const MACRO_CODES = macroCodesOf(context.readings);

/**
 * Step 5, second screen. The gap between the headroom the OBR's forecast leaves and the margin
 * the player meant to keep, and the ways through it: raise more, spend less or later, scale back
 * a promise to the PM, accept less headroom, and, only when a rule is missed, borrow and say so.
 * The manifesto is not a route: its red lines are fixed. Every figure on the routes is the
 * engine's, re-run for the move in question; every word beside them is an adviser's and wears
 * the badge.
 */
export function CompromisePage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const delays = game?.delays ?? {};
  const headroomOf = useHeadroomOf();
  const revenue = useMemo(
    () => revenueSuggestions(levers, state.leverValues, pm.promises, headroomOf, 3),
    [state.leverValues, headroomOf],
  );
  // The package as it stands, re-run under every forecast the draw could have produced.
  const stress = useMemo(
    () =>
      game
        ? resilienceRows({
            vintage,
            rules,
            levers,
            draws,
            context,
            outcome,
            macroCodes: MACRO_CODES,
            game,
          })
        : [],
    [game, outcome],
  );

  const guard = useStageGuard('compromise');
  if (guard || !game) return guard;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = game.headroomTargetBn * 1000;
  const gap = target - headroom;
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const lastYear = outcome.paths.years[outcome.paths.years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const spending = spendingMeasures(levers, outcome, targetYear).slice(0, 3);
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
  // Who feels it: the spending measures cut back since the forecast.
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
    <JourneyLayout
      step="compromise"
      part={{ noun: 'Part', index: 2, total: 2, label: 'make it add up' }}
    >
      <Beats step="compromise">
        <Beat title="The gap, and the routes through it">
          <Scorecard
            outcome={outcome}
            typicalErrorGbpm={typicalErrorGbpm}
            sticky
            revealed
            target={target}
          />
          <BudgetSummary
            game={game}
            status={status}
            headroomGbpm={headroom}
            targetYear={targetYear}
            showHeadroom={false}
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
                <StepLink to="/budget/taxes">Every tax</StepLink>
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
                    // The floor is the lever's own earliest start; a delay can only push past it.
                    const floor = effectiveStartYear(m.lever, {
                      implementationYear: IMPLEMENTATION_YEAR,
                    });
                    const start = effectiveStartYear(m.lever, {
                      implementationYear: IMPLEMENTATION_YEAR,
                      implementationYearByCode: delays,
                    });
                    const options = delayOptions(outcome.paths.policyYears, floor);
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
                              <option value="">Starts {floor}</option>
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
                <StepLink to="/budget/spending">Every budget</StepLink>
              </p>
            </section>

            <section className="route doc" aria-labelledby="route-narrow">
              <h2 id="route-narrow" className="section-label">
                3 · Scale back a promise to the PM
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
                  {status.priorities
                    .flatMap((p) => p.options.filter((o) => o.state !== 'off'))
                    .map((o) => {
                      const codes = Object.keys(o.option.values);
                      const lever = codes.length === 1 ? byCode.get(codes[0]!) : undefined;
                      const chosenValue = lever ? (o.option.values[lever.code] ?? 0) : 0;
                      const narrowed = lever ? narrowedValue(lever, chosenValue) : null;
                      const on = o.state === 'on';
                      return (
                        <li key={o.option.id} className="suggestion">
                          <div>
                            <strong>{o.option.title}</strong>{' '}
                            <span className="source">
                              {on ? 'in your package' : 'adjusted'}
                              {lever ? ` · ${formatLeverValue(lever, value(lever))}` : ''}
                              {lever && lever.control.kind !== 'toggle'
                                ? ` of ${formatLeverValue(lever, chosenValue)}`
                                : ''}
                            </span>
                          </div>
                          <div className="suggestion__act">
                            {lever && on && narrowed !== null ? (
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
                            ) : lever && on ? (
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
                              <span className="source">already scaled back on the desk</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="route doc" aria-labelledby="route-target">
              <h2 id="route-target" className="section-label">
                4 · Accept less headroom
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

            {missed.length > 0 ? (
              <section className="route doc route--breach" aria-labelledby="route-breach">
                <h2 id="route-breach" className="section-label">
                  5 · Borrow, and say so
                </h2>
                <Spoken
                  line={compromise.routes.breach.line}
                  who={role(compromise.routes.breach.adviser)}
                  tone="adviser"
                />
                <details className="charter">
                  <summary>What the Charter says</summary>
                  <blockquote>
                    <p>{rules.escapeClause.text}</p>
                    <SourceList refs={[rules.escapeClause.source]} />
                  </blockquote>
                </details>
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
              </section>
            ) : (
              <aside className="route doc route--quiet" aria-label="No rule is missed">
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
              </aside>
            )}
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

          <details className="panel details">
            <summary>
              <span className="details__title">
                How would this hold up under the other forecasts?
              </span>
            </summary>
            <p className="panel__hint">
              Your package as it stands, re-run under every outcome the draw could have produced.
              The one that arrived is marked. <LabelBadge badge="mechanical" />
            </p>
            <ul className="fates resilience">
              {stress.map((r) => (
                <li key={r.outcome.id} className={r.drawn ? 'resilience--drawn' : undefined}>
                  <strong>{r.outcome.title}</strong>
                  {r.drawn ? <span className="tag--treasury">what arrived</span> : null} ·{' '}
                  <span className={`amount ${r.headroomGbpm < 0 ? 'amount--worse' : ''}`}>
                    {formatGbpBn(r.headroomGbpm, 1, r.headroomGbpm < 0)}
                  </span>
                  {r.rulesMissed.length > 0 ? (
                    <span className="source"> · {r.rulesMissed.join(' and ')} missed</span>
                  ) : (
                    <span className="source"> · rules met</span>
                  )}
                </li>
              ))}
            </ul>
          </details>

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
