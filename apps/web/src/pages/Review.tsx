import {
  ambitionStatus,
  budgetTheme,
  formatGbpBn,
  formatLevel,
  levelValue,
  rankedPriorities,
  stageIndex,
  type Lever,
  type LeverEffect,
} from '@btc/engine';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { formatLeverValue, formatLeverValueShort } from '../components/LeverControl';
import { context, finetuneTitle, levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { macroCodesOf } from '../journey/scenarios';
import { useBudget } from '../state/budget';
import { compromisePath } from './Compromise';
import { deliverPath } from './Deliver';

const MACRO_CODES = new Set(macroCodesOf(context.readings));
const byCode = new Map(levers.map((l) => [l.code, l] as const));
const RANK = ['1st', '2nd', '3rd'];

/** A moved lever read back: its plain title, where it now stands, and what it does in the year. */
interface Row {
  lever: Lever;
  title: string;
  at?: string;
  amount: { text: string; tone: 'better' | 'worse' };
}

/** Where a lever stands, as its level where it has one: "21%", "£210", "−1%"; a toggle is simply on. */
function standing(lever: Lever, value: number): string | undefined {
  if (lever.control.kind === 'toggle') return undefined;
  const level = lever.control.level;
  return level ? formatLevel(level, levelValue(level, value)) : formatLeverValueShort(lever, value);
}

/** What a tax raises or costs, and what spending costs or saves, in the target year. */
function amountOf(lever: Lever, effect: LeverEffect | undefined, year: string): Row['amount'] {
  if (lever.category === 'tax') {
    const gbpm = effect?.receipts[year] ?? 0;
    return gbpm >= 0
      ? { text: `raises ${formatGbpBn(gbpm, 1)}`, tone: 'better' }
      : { text: `costs ${formatGbpBn(-gbpm, 1)}`, tone: 'worse' };
  }
  const gbpm = (effect?.currentSpending[year] ?? 0) + (effect?.capitalSpending[year] ?? 0);
  return gbpm > 0
    ? { text: `costs ${formatGbpBn(gbpm, 1)}`, tone: 'worse' }
    : { text: `saves ${formatGbpBn(-gbpm, 1)}`, tone: 'better' };
}

function RowList({ rows }: { rows: readonly Row[] }) {
  return (
    <ul className="review__list">
      {rows.map((r) => (
        <li key={r.lever.code}>
          {r.title}
          {r.at ? ` · ${r.at}` : ''} ·{' '}
          <span className={`amount amount--${r.amount.tone}`}>{r.amount.text}</span>
        </li>
      ))}
    </ul>
  );
}

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
 * prioritised, what you chose to deliver and what each costs, every tax and every other budget you
 * moved (Phase 24), the add-ons, and where that leaves you against your target and the rules, with
 * what changed since the forecast. Every line has a way back to the screen that set it, carrying
 * the Budget, so nothing is final until the red button. Every figure is the engine's for the
 * target year.
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
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;

  // Every tax and every budget moved, except those a flagship or an add-on already accounts for:
  // they are read back under their own names above and below.
  const owned = new Set<string>([
    ...status.priorities.flatMap((p) =>
      p.options.filter((o) => o.state !== 'off').flatMap((o) => Object.keys(o.option.values)),
    ),
    ...options.addOns
      .filter((o) => game.rabbit.includes(o.id))
      .flatMap((o) => Object.keys(o.values)),
  ]);
  const rows: Row[] = outcome.leverEffects
    .map((e) => ({ effect: e, lever: byCode.get(e.code) }))
    .filter(
      (x): x is { effect: LeverEffect; lever: Lever } =>
        x.lever !== undefined &&
        x.lever.category !== 'macro' &&
        !MACRO_CODES.has(x.lever.code) &&
        !owned.has(x.lever.code),
    )
    .map(({ effect, lever }) => ({
      lever,
      title: finetuneTitle(lever.code) ?? lever.shortTitle,
      ...(standing(lever, value(lever)) ? { at: standing(lever, value(lever)) } : {}),
      amount: amountOf(lever, effect, year),
    }));
  const taxRows = rows.filter((r) => r.lever.category === 'tax');
  const spendingRows = rows.filter((r) => r.lever.category !== 'tax');
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
  // What moved since the OBR saw the package, and what starts later. The add-ons are listed
  // above as announcements, so their levers are not listed again here.
  const snapshot = state.snapshot ?? {};
  const addOnCodes = new Set(
    options.addOns.filter((o) => game.rabbit.includes(o.id)).flatMap((o) => Object.keys(o.values)),
  );
  const moved = [...new Set([...Object.keys(snapshot), ...Object.keys(state.leverValues)])]
    .map((code) => byCode.get(code))
    .filter(
      (l): l is Lever => l !== undefined && !MACRO_CODES.has(l.code) && !addOnCodes.has(l.code),
    )
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
          <>
            <p className="theme__title">{budgetTheme(pm, game.priorities)}</p>
            <ol className="review__list">
              {ranked.map((p, i) => (
                <li key={p.id}>
                  <span className="review__rank">{RANK[i] ?? `${i + 1}th`}</span> {p.title}
                </li>
              ))}
            </ol>
          </>
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

      <Part id="tax" title="Tax" change={{ to: '/finetune/tax', label: 'Change' }}>
        {taxRows.length === 0 ? (
          <p className="panel__hint">No tax changed.</p>
        ) : (
          <RowList rows={taxRows} />
        )}
      </Part>

      <Part id="spending" title="Spending" change={{ to: '/finetune/spending', label: 'Change' }}>
        {spendingRows.length === 0 ? (
          <p className="panel__hint">No other budget changed.</p>
        ) : (
          <RowList rows={spendingRows} />
        )}
      </Part>

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
        change={{ to: compromisePath(3), label: 'Change' }}
      >
        <p>
          {missed.length === 0
            ? 'Rules met.'
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
