import {
  affordSuggestions,
  ambitionStatus,
  delayOptions,
  deliverSuggestions,
  effectiveStartYear,
  formatGbpBn,
  narrowedBundle,
  optionOff,
  optionState,
  resilienceRows,
  spendingMeasures,
  stageIndex,
  type Lever,
} from '@btc/engine';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { formatLeverValue } from '../components/LeverControl';
import { MinisterLine } from '../components/MinisterLine';
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
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { macroCodesOf } from '../journey/scenarios';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';
import { TARGETS } from './Outlook';

const MACRO_CODES = macroCodesOf(context.readings);

/**
 * Step 5, second screen, in one of two moods the headroom decides. Short of the margin the player
 * meant to keep (or with a rule missed): the gap, and the ways through it: raise more (the ways
 * to afford it not yet chosen, ranked by yield), spend less or later (what was chosen to deliver,
 * each with a later start, half the distance, or dropped), accept less headroom, and, only when
 * a rule is missed, borrow and say so. With room to spare and every rule met: the ways to use
 * it: do more for the priorities (the ways to deliver them not yet chosen, one per priority
 * first), ease off a tax rise (the ways to pay chosen, each with what dropping it leaves), or
 * keep more headroom. The manifesto is not a route: its red lines are fixed. Every figure on the
 * routes is the engine's, re-run for the move in question; every word beside them is an
 * adviser's and wears the badge. The headroom bar keeps score; the stress test under every other
 * forecast is one fold away.
 */
export function CompromisePage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const delays = game?.delays ?? {};
  const headroomOf = useHeadroomOf();
  const priceOf = useOptionPrices();
  const revenue = useMemo(
    () => affordSuggestions(options, levers, state.leverValues, pm.promises, headroomOf, 3),
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
  // Room to spare, and every rule met: the screen offers ways to use it rather than ways out.
  const surplus = missed.length === 0 && gap < 0;
  const more = surplus ? deliverSuggestions(status, options, levers, state.leverValues, 3) : [];
  const chosenWays = surplus
    ? options.afford.filter((o) => optionState(o, state.leverValues, levers) !== 'off')
    : [];
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
      part={{ index: 2, total: 2, label: surplus ? 'Extra headroom' : 'Make it add up' }}
      {...(surplus
        ? {
            title: 'Make the most of your extra headroom',
            tabTitle: 'Make the most of your extra headroom',
            lead:
              target > 0
                ? 'The forecast left you room to spare.'
                : 'The forecast left you headroom beyond the rules.',
          }
        : {})}
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      {surplus ? (
        <div className="routes">
          <section className="route doc" aria-labelledby="route-more">
            <h2 id="route-more" className="section-label">
              1 · Do more for your priorities
            </h2>
            <Spoken
              line={compromise.routes.more.line}
              who={role(compromise.routes.more.adviser)}
              tone="adviser"
              folded
            />
            {more.length === 0 ? (
              <p className="panel__hint">
                Every way to deliver your priorities is already in your Budget.
              </p>
            ) : (
              <ul className="suggestions">
                {more.map((s) => {
                  const price = priceOf({ values: s.option.values });
                  const badges = [
                    ...new Set(
                      Object.keys(s.option.values)
                        .map((code) => byCode.get(code)?.badge)
                        .filter((b): b is Lever['badge'] => b !== undefined),
                    ),
                  ];
                  return (
                    <li key={s.option.id} className="suggestion">
                      <div>
                        <strong>{s.option.title}</strong>{' '}
                        <span className="source">
                          for {s.priority.noun}
                          {badges.map((b) => (
                            <span key={b}>
                              {' '}
                              · <LabelBadge badge={b} />
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className="suggestion__act">
                        <span className={`amount amount--${price.tone}`}>{price.text}</span>
                        <span className="source">leaves {formatGbpBn(price.headroomGbpm, 1)}</span>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setAll(s.option.values)}
                        >
                          Do it
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="panel__hint">
              <StepLink to="/budget/deliver">All the ways to deliver</StepLink>
            </p>
          </section>

          <section className="route doc" aria-labelledby="route-ease">
            <h2 id="route-ease" className="section-label">
              2 · Ease off a tax rise
            </h2>
            <Spoken
              line={compromise.routes.ease.line}
              who={role(compromise.routes.ease.adviser)}
              tone="adviser"
              folded
            />
            {chosenWays.length === 0 ? (
              <p className="panel__hint">You chose no tax rises, so there is nothing to ease.</p>
            ) : (
              <ul className="suggestions">
                {chosenWays.map((o) => {
                  const lever = byCode.get(Object.keys(o.values)[0] ?? '');
                  if (!lever) return null;
                  const off = optionOff(o, levers);
                  return (
                    <li key={o.id} className="suggestion">
                      <div>
                        <strong>{lever.title}</strong>{' '}
                        <span className="source">
                          in your Budget · {formatLeverValue(lever, value(lever))} ·{' '}
                          <LabelBadge badge={lever.badge} />
                        </span>
                      </div>
                      <div className="suggestion__act">
                        <span className="source">
                          dropped:{' '}
                          {formatGbpBn(effectOf({ ...state.leverValues, ...off }), 1, true)}
                        </span>
                        <button type="button" className="btn" onClick={() => setAll(off)}>
                          Drop it
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="panel__hint">
              <StepLink to="/budget/afford">All the ways to pay</StepLink>
            </p>
          </section>

          <section className="route doc" aria-labelledby="route-keep">
            <h2 id="route-keep" className="section-label">
              3 · Keep more headroom
            </h2>
            <Spoken
              line={compromise.routes.bank.line}
              who={role(compromise.routes.bank.adviser)}
              tone="adviser"
              folded
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

          {game.breachAccepted ? (
            <aside className="route doc route--quiet" aria-label="Your acknowledgement">
              <p className="panel__hint">
                No rule is missed now. Your written acknowledgement stands.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => spend({ breachAccepted: false })}
              >
                Withdraw the acknowledgement
              </button>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="routes">
          <section className="route doc" aria-labelledby="route-revenue">
            <h2 id="route-revenue" className="section-label">
              1 · Raise more revenue
            </h2>
            <Spoken
              line={compromise.routes.revenue.line}
              who={role(compromise.routes.revenue.adviser)}
              tone="adviser"
              folded
            />
            <ul className="suggestions">
              {revenue.map((s) => (
                <li key={s.option.id} className="suggestion">
                  <div>
                    <strong>{s.option.title}</strong>{' '}
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
                    {s.strains.length > 0 ? (
                      <span className="tag--treasury tag--amber">
                        strains {s.strains.map((p) => p.title).join(', ')}
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
              <StepLink to="/budget/afford">All the ways to pay</StepLink>
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
              folded
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
                          {o.state === 'adjusted' ? 'adjusted on the desk · ' : ''}costs{' '}
                          {formatGbpBn(o.costGbpm, 1)}
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
                              narrowed:{' '}
                              {formatGbpBn(
                                effectOf({ ...state.leverValues, ...narrowed }),
                                1,
                                true,
                              )}
                            </span>
                            <button type="button" className="btn" onClick={() => setAll(narrowed)}>
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
                        moved on the desk · costs {formatGbpBn(m.costGbpm, 1)}
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
              <StepLink to="/budget/deliver">All the ways to deliver</StepLink>
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
              folded
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
                folded
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
          ) : game.breachAccepted ? (
            <aside className="route doc route--quiet" aria-label="Your acknowledgement">
              <p className="panel__hint">
                No rule is missed now. Your written acknowledgement stands.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => spend({ breachAccepted: false })}
              >
                Withdraw the acknowledgement
              </button>
            </aside>
          ) : null}
        </div>
      )}

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

      <details className="more">
        <summary>How would this hold up under the other forecasts?</summary>
        <div className="more__body">
          <p className="panel__hint">
            Your package as it stands, re-run under every outcome the draw could have produced. The
            one that arrived is marked. <LabelBadge badge="mechanical" />
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
        </div>
      </details>

      <p className="actions">
        <StepLink
          to="/rabbit"
          className="btn btn--primary"
          onClick={() => spend({ reached: Math.max(game.reached, stageIndex('rabbit')) })}
        >
          Next: final choices
        </StepLink>
        <StepLink to="/forecast" className="btn">
          Back
        </StepLink>
      </p>
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
