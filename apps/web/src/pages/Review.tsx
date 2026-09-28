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
  type OptionReport,
} from '@btc/engine';
import type { ReactNode } from 'react';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { formatLeverValueShort } from '../components/LeverControl';
import { MACRO_CODES as MACRO_LIST, finetuneTitle, levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const MACRO_CODES = new Set(MACRO_LIST);
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
 * Step 5: deliver the Budget (Phase 24, ADR-0025). The Budget as it stands, read back before it is
 * delivered: what you prioritised, the flagship policies you chose and what each costs, every tax
 * and every other budget you moved, and where that leaves you against the rules and the manifesto,
 * in words (the bar above already says the figure). Every part has a way back to the screen that
 * set it, carrying the Budget, so nothing is final until the red button. Every figure is the
 * engine's for the target year.
 */
export function ReviewPage() {
  const { state, dispatch, outcome } = useBudget();
  const game = state.game;
  const guard = useStageGuard('review');
  if (guard || !game) return guard;

  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '2029-30';
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;

  // Every tax and every budget moved, except those a flagship policy already accounts for: they
  // are read back under their own names above. A lever moved against its flagship is not the
  // flagship; it reads back as the cut it is (Phase 25).
  const counts = (o: OptionReport) => o.state === 'on' || o.state === 'adjusted';
  const owned = new Set<string>(
    status.priorities.flatMap((p) =>
      p.options.filter(counts).flatMap((o) => Object.keys(o.option.values)),
    ),
  );
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
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  // The manifesto: broken by a lever (red), or kept in its words and strained (amber). A promise
  // with no lever of its own (the fiscal rules) is the rules line above it.
  const broken = status.promises.filter((p) => !p.kept && p.promise.breaks.length > 0);
  const brokenIds = new Set(broken.map((p) => p.promise.id));
  const strained = status.strains.filter((s) => s.strained && !brokenIds.has(s.promise.id));

  /** The red button: the game has reached Budget day; a link shared from there opens everything. */
  const deliver = () =>
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('budget-day')) },
    });

  return (
    <JourneyLayout step="review">
      <HeadroomBar outcome={outcome} status={status} />

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
        title="Flagship policies"
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
              const on = p.options.filter(counts);
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
                          {o.state === 'adjusted' ? ' (settled lower)' : ''} ·{' '}
                          <span className="amount amount--worse">
                            costs {formatGbpBn(Math.abs(o.spendingGbpm), 1)}
                          </span>
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

      <Part
        id="position"
        title="Where that leaves you"
        change={{ to: '/finetune/tax', label: 'Change' }}
      >
        <p>
          {missed.length === 0
            ? 'Rules met.'
            : `Missed: ${missed.map((v) => v.ruleName).join(' and ')}. The OBR would say so on Budget day.`}
        </p>
        {broken.length > 0 || strained.length > 0 ? (
          <ul className="review__list">
            {broken.map((p) => (
              <li key={p.promise.id}>
                <span className="tag tag--warn">Breaks the manifesto: {p.promise.title}</span>
              </li>
            ))}
            {strained.map((p) => (
              <li key={p.promise.id}>
                <span className="tag tag--amber">Strains the manifesto: {p.promise.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Part>

      <p className="actions">
        <StepLink to="/budget-day" className="btn btn--primary btn--budget" onClick={deliver}>
          Deliver my Budget
        </StepLink>
        <StepLink to="/finetune/spending" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
