import {
  ambitionStatus,
  formatGbpBn,
  optionState,
  rankedPriorities,
  stageIndex,
  type Lever,
} from '@btc/engine';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { formatLeverValue } from '../components/LeverControl';
import { context, levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { macroCodesOf } from '../journey/scenarios';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const MACRO_CODES = new Set(macroCodesOf(context.readings));
const byCode = new Map(levers.map((l) => [l.code, l] as const));
const RANK = ['1st', '2nd', '3rd'];

/** One section of the review: what it is called, what is in it, and where to change it. */
function Part({
  id,
  title,
  change,
  children,
}: {
  id: string;
  title: string;
  change: { to: string; label: string } | { to: string; label: string }[];
  children: ReactNode;
}) {
  const links = Array.isArray(change) ? change : [change];
  return (
    <section className="review doc" aria-labelledby={`${id}-heading`}>
      <div className="review__head">
        <h2 id={`${id}-heading`} className="section-label">
          {title}
        </h2>
        <span className="review__change">
          {links.map((link, i) => (
            <span key={link.to}>
              {i > 0 ? ' · ' : ''}
              <StepLink to={link.to}>{link.label}</StepLink>
            </span>
          ))}
        </span>
      </div>
      {children}
    </section>
  );
}

/**
 * Step 6, second screen: the Budget as it stands, read back before it is delivered. What you
 * prioritised, what you chose to deliver and what each costs, how you are paying for it, anything
 * set by hand on the desk, the add-ons, and where that leaves you against your target and the
 * rules, with what changed since the forecast. Every line has a way back to the screen that set
 * it, carrying the Budget, so nothing is final until the red button. Every figure is the engine's
 * for the target year.
 */
export function ReviewPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const guard = useStageGuard('review');
  if (guard || !game) return guard;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;

  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = game.headroomTargetBn * 1000;
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;
  const receiptsOf = (codes: readonly string[]) =>
    codes.reduce(
      (acc, code) => acc + (outcome.leverEffects.find((e) => e.code === code)?.receipts[year] ?? 0),
      0,
    );

  // How you pay: the ways to afford that are on, with what each raises.
  const paying = options.afford
    .filter((o) => optionState(o, state.leverValues, levers) !== 'off')
    .map((o) => {
      const code = Object.keys(o.values)[0] ?? '';
      return { id: o.id, lever: byCode.get(code), gbpm: receiptsOf(Object.keys(o.values)) };
    })
    .filter((row): row is { id: string; lever: Lever; gbpm: number } => row.lever !== undefined);
  // Set by hand: levers moved that no option on this Budget owns.
  const owned = new Set<string>([
    ...status.priorities.flatMap((p) =>
      p.options.filter((o) => o.state !== 'off').flatMap((o) => Object.keys(o.option.values)),
    ),
    ...options.afford
      .filter((o) => optionState(o, state.leverValues, levers) !== 'off')
      .flatMap((o) => Object.keys(o.values)),
    ...options.addOns
      .filter((o) => game.rabbit.includes(o.id))
      .flatMap((o) => Object.keys(o.values)),
  ]);
  const byHand = outcome.leverEffects
    .map((e) => byCode.get(e.code))
    .filter(
      (l): l is Lever =>
        l !== undefined && l.category !== 'macro' && !MACRO_CODES.has(l.code) && !owned.has(l.code),
    );
  // The add-ons, by name.
  const addOns = game.rabbit
    .filter((id) => id !== 'keep')
    .map((id) =>
      id.startsWith('further:')
        ? `Going further on ${pm.priorities.find((p) => p.id === id.slice('further:'.length))?.title ?? id}`
        : options.addOns.find((o) => o.id === id)?.title,
    )
    .filter((t): t is string => t !== undefined);
  const keeping = game.rabbit.includes('keep');
  // What moved since the OBR saw the package, and what starts later.
  const snapshot = state.snapshot ?? {};
  const moved = [...new Set([...Object.keys(snapshot), ...Object.keys(state.leverValues)])]
    .map((code) => byCode.get(code))
    .filter((l): l is Lever => l !== undefined && !MACRO_CODES.has(l.code))
    .map((l) => ({ lever: l, from: snapshot[l.code] ?? l.control.default, to: value(l) }))
    .filter((r) => r.from !== r.to);
  const delays = Object.entries(game.delays)
    .map(([code, yearFrom]) => ({ lever: byCode.get(code), yearFrom }))
    .filter((r): r is { lever: Lever; yearFrom: string } => r.lever !== undefined);
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );

  /** The red button: the game has reached Budget day; a link shared from there opens everything. */
  const deliver = () =>
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('budget-day')) },
    });

  return (
    <JourneyLayout step="review" part={{ index: 2, total: 2, label: 'Review' }}>
      <HeadroomBar outcome={outcome} game={game} status={status} />

      <Part id="priorities" title="Your priorities" change={{ to: '/pm', label: 'Change' }}>
        {ranked.length === 0 ? (
          <p className="panel__hint">None agreed with the Prime Minister.</p>
        ) : (
          <ol className="review__list">
            {ranked.map((p, i) => (
              <li key={p.id}>
                <span className="review__rank">{RANK[i] ?? `${i + 1}th`}</span> {p.title}
              </li>
            ))}
          </ol>
        )}
      </Part>

      <Part
        id="deliver"
        title="What you chose to deliver"
        change={status.priorities.map((p) => ({
          to: deliverPath(p.rank),
          label: `Change ${p.priority.noun}`,
        }))}
      >
        {status.priorities.length === 0 ? (
          <p className="panel__hint">Nothing: no priorities were agreed.</p>
        ) : (
          <ul className="review__list">
            {status.priorities.map((p) => {
              const on = p.options.filter((o) => o.state !== 'off');
              return (
                <li key={p.priority.id}>
                  <strong>{p.priority.title}</strong>
                  {on.length === 0 ? (
                    <span className="review__none"> · nothing chosen</span>
                  ) : (
                    <ul>
                      {on.map((o) => (
                        <li key={o.option.id}>
                          {o.option.title}
                          {o.state === 'adjusted' ? ' (adjusted on the desk)' : ''} ·{' '}
                          <span className="amount amount--worse">
                            costs {formatGbpBn(Math.abs(o.costGbpm), 1)}
                          </span>
                          {o.delayedTo ? ` · starts ${o.delayedTo}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Part>

      <Part id="pay" title="How you pay for it" change={{ to: '/budget/afford', label: 'Change' }}>
        {paying.length === 0 ? (
          <p className="panel__hint">
            No tax rises chosen: the Budget is paid for out of the headroom the forecast left.
          </p>
        ) : (
          <ul className="review__list">
            {paying.map((row) => (
              <li key={row.id}>
                {row.lever.title} ·{' '}
                <span className="amount amount--better">raises {formatGbpBn(row.gbpm, 1)}</span>
              </li>
            ))}
          </ul>
        )}
      </Part>

      {byHand.length > 0 ? (
        <Part
          id="desk"
          title="Set by hand"
          change={[
            ...(byHand.some((l) => l.category === 'tax')
              ? [{ to: '/budget/taxes', label: 'Change the taxes' }]
              : []),
            ...(byHand.some((l) => l.category !== 'tax')
              ? [{ to: '/budget/spending', label: 'Change the spending' }]
              : []),
          ]}
        >
          <ul className="review__list">
            {byHand.map((l) => (
              <li key={l.code}>
                {l.title} · {formatLeverValue(l, value(l))}
              </li>
            ))}
          </ul>
        </Part>
      ) : null}

      <Part id="speech" title="For the speech" change={{ to: '/rabbit', label: 'Change' }}>
        {keeping ? (
          <p>Keeping the headroom: that is the announcement.</p>
        ) : addOns.length === 0 ? (
          <p className="panel__hint">No add-ons.</p>
        ) : (
          <ul className="review__list">
            {addOns.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </Part>

      <Part
        id="position"
        title="Where that leaves you"
        change={{ to: '/compromise', label: 'Change' }}
      >
        <p>
          Headroom in {year}:{' '}
          <strong className={`amount ${headroom < 0 ? 'amount--worse' : ''}`}>
            {formatGbpBn(headroom, 1, headroom < 0)}
          </strong>
          {target > 0
            ? headroom >= target
              ? `, ${formatGbpBn(headroom - target, 1)} over the ${formatGbpBn(target, 0)} you set out to keep.`
              : `, ${formatGbpBn(target - headroom, 1)} short of the ${formatGbpBn(target, 0)} you set out to keep.`
            : '; you set no target beyond the rules.'}{' '}
          {missed.length === 0
            ? 'Both fiscal rules and the welfare cap are met.'
            : `Missed: ${missed.map((v) => v.ruleName).join(' and ')}.`}
          {game.breachAccepted ? ' You have said so, in writing.' : ''}
        </p>
        {moved.length > 0 || delays.length > 0 ? (
          <>
            <h3 className="section-label">Since the forecast</h3>
            <ul className="review__list">
              {moved.map((r) => (
                <li key={r.lever.code}>
                  {r.lever.shortTitle}: {formatLeverValue(r.lever, r.from)} →{' '}
                  {formatLeverValue(r.lever, r.to)}
                </li>
              ))}
              {delays.map((r) => (
                <li key={`delay-${r.lever.code}`}>
                  {r.lever.shortTitle} starts {r.yearFrom}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="panel__hint">Nothing changed since the OBR saw the package.</p>
        )}
      </Part>

      <p className="actions">
        <StepLink to="/budget-day" className="btn btn--primary btn--budget" onClick={deliver}>
          Deliver my Budget
        </StepLink>
        <StepLink to="/rabbit" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
