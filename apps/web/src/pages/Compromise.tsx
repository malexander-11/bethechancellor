import {
  affordSuggestions,
  ambitionStatus,
  delayOptions,
  effectiveStartYear,
  formatGbpBn,
  narrowedBundle,
  optionOff,
  resilienceRows,
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
 * the player meant to keep, and the ways through it: raise more (the ways to afford it not yet
 * chosen, ranked by yield), spend less or later (what was chosen to deliver, each with a later
 * start, half the distance, or dropped), accept less headroom, and, only when a rule is missed,
 * borrow and say so. The manifesto is not a route: its red lines are fixed. Every figure on the
 * routes is the engine's, re-run for the move in question; every word beside them is an
 * adviser's and wears the badge.
 */
export function CompromisePage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const delays = game?.delays ?? {};
  const headroomOf = useHeadroomOf();
  const revenue = useMemo(
    () => affordSuggestions(options.afford, levers, state.leverValues, pm.promises, headroomOf, 3),
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
  // What was chosen to deliver and costs money in the target year, biggest first; then anything
  // else in the package that costs money, moved on the desk rather than chosen as an option.
  const chosen = status.priorities
    .flatMap((p) => p.options)
    .filter((o) => o.state !== 'off' && o.costGbpm > 0)
    .sort((a, b) => b.costGbpm - a.costGbpm);
  const chosenCodes = new Set(chosen.flatMap((o) => Object.keys(o.option.values)));
  const spending = spendingMeasures(levers, outcome, targetYear)
    .filter((m) => !chosenCodes.has(m.lever.code))
    .slice(0, 3);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;
  const role = (id: string) => adviserById.get(id)?.role ?? id;

  /** What one move would do to headroom in the target year, £ million. */
  const effectOf = (values: Record<string, number>, overrideDelays?: Record<string, string>) =>
    headroomOf(values, overrideDelays) - headroom;

  const spend = (patch: Partial<typeof game>) => dispatch({ type: 'updateGame', patch });
  const set = (code: string, v: number) => dispatch({ type: 'setLever', code, value: v });
  const setAll = (values: Record<string, number>) => dispatch({ type: 'setLevers', values });
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
                  <li key={s.option.id} className="suggestion">
                    <div>
                      <strong>{s.lever.title}</strong>{' '}
                      <span className="source">
                        to{' '}
                        {formatLeverValue(
                          s.lever,
                          s.option.values[s.lever.code] ?? s.lever.control.default,
                        )}{' '}
                        · <LabelBadge badge={s.lever.badge} />
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
                      <button type="button" className="btn" onClick={() => setAll(s.option.values)}>
                        Do it
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="panel__hint">
                <StepLink to="/budget/afford">All the ways to afford it</StepLink> ·{' '}
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
              {chosen.length === 0 && spending.length === 0 ? (
                <p className="panel__hint">Nothing in your package costs money in {targetYear}.</p>
              ) : (
                <ul className="suggestions">
                  {chosen.map((o) => {
                    const codes = Object.keys(o.option.values);
                    const optionLevers = codes
                      .map((code) => byCode.get(code))
                      .filter((l): l is Lever => l !== undefined);
                    const narrowed = o.state === 'on' ? narrowedBundle(o.option, levers) : null;
                    const started = codes.map((code) => delays[code]).find((y) => y !== undefined);
                    return (
                      <li key={o.option.id} className="suggestion">
                        <div>
                          <strong>{o.option.title}</strong>{' '}
                          <span className="source">
                            {o.state === 'on' ? 'in your package' : 'adjusted on the desk'}
                            {optionLevers.length === 1 && optionLevers[0]
                              ? ` · ${formatLeverValue(optionLevers[0], value(optionLevers[0]))}`
                              : ''}{' '}
                            · costs {formatGbpBn(o.costGbpm, 1)} in {targetYear}
                            {started ? ` · starts ${started}` : ''}
                          </span>
                        </div>
                        <div className="suggestion__act">
                          {optionLevers.map((lever) => (
                            <DelayControl
                              key={lever.code}
                              lever={lever}
                              delays={delays}
                              policyYears={outcome.paths.policyYears}
                              onChange={(year) => setDelay(lever.code, year)}
                              savingFor={(next) =>
                                effectOf(state.leverValues, { ...delays, [lever.code]: next })
                              }
                            />
                          ))}
                          {narrowed ? (
                            <>
                              <span className="source">
                                half the distance:{' '}
                                {formatGbpBn(
                                  effectOf({ ...state.leverValues, ...narrowed }),
                                  1,
                                  true,
                                )}
                              </span>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => setAll(narrowed)}
                              >
                                Narrow it
                              </button>
                            </>
                          ) : null}
                          <span className="source">
                            dropped:{' '}
                            {formatGbpBn(
                              effectOf({ ...state.leverValues, ...optionOff(o.option, levers) }),
                              1,
                              true,
                            )}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setAll(optionOff(o.option, levers))}
                          >
                            Drop it
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {spending.map((m) => (
                    <li key={m.lever.code} className="suggestion">
                      <div>
                        <strong>{m.lever.title}</strong>{' '}
                        <span className="source">
                          moved on the desk · {formatLeverValue(m.lever, value(m.lever))} · costs{' '}
                          {formatGbpBn(m.costGbpm, 1)} in {targetYear}
                          {delays[m.lever.code] ? ` · starts ${delays[m.lever.code]}` : ''}
                        </span>
                      </div>
                      <div className="suggestion__act">
                        <DelayControl
                          lever={m.lever}
                          delays={delays}
                          policyYears={outcome.paths.policyYears}
                          onChange={(year) => setDelay(m.lever.code, year)}
                          savingFor={(next) =>
                            effectOf(state.leverValues, { ...delays, [m.lever.code]: next })
                          }
                        />
                        <button
                          type="button"
                          className="btn"
                          onClick={() => set(m.lever.code, m.lever.control.default)}
                        >
                          Drop it
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="panel__hint">
                <StepLink to="/budget/deliver">All the ways to deliver</StepLink> ·{' '}
                <StepLink to="/budget/spending">Every budget</StepLink>
              </p>
            </section>

            <section className="route doc" aria-labelledby="route-target">
              <h2 id="route-target" className="section-label">
                3 · Accept less headroom
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
                  4 · Borrow, and say so
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

/**
 * A later start for one lever: the floor is the lever's own earliest start (ADR-0021), a delay
 * can only push past it, and the figure beside it is what one more year would save.
 */
function DelayControl({
  lever,
  delays,
  policyYears,
  onChange,
  savingFor,
}: {
  lever: Lever;
  delays: Record<string, string>;
  policyYears: readonly string[];
  onChange: (year: string) => void;
  savingFor: (nextYear: string) => number;
}) {
  const floor = effectiveStartYear(lever, { implementationYear: IMPLEMENTATION_YEAR });
  const start = effectiveStartYear(lever, {
    implementationYear: IMPLEMENTATION_YEAR,
    implementationYearByCode: delays,
  });
  const years = delayOptions(policyYears, floor);
  const next = delayOptions(policyYears, start)[0];
  return (
    <>
      <label className="suggestion__delay">
        <span className="sr-only">Start year for {lever.title}</span>
        <select value={delays[lever.code] ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Starts {floor}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Delay to {y}
            </option>
          ))}
        </select>
      </label>
      {next ? (
        <span className="source">a year later: {formatGbpBn(savingFor(next), 1, true)}</span>
      ) : null}
    </>
  );
}
