import {
  ambitionStatus,
  formatGbpBn,
  rankedPriorities,
  stageIndex,
  type FinetuneGroup,
  type FinetuneItem,
  type FinetuneSideId,
  type LeverEffect,
} from '@btc/engine';
import { useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { CuratedLever } from '../components/CuratedLever';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { adviserById, finetune, levers, options, pm } from '../data';
import { UNCHANGED_BELOW_GBPM } from '../journey/effects';
import { useStageGuard } from '../journey/guard';
import { chosenByLever, redLinesOf } from '../journey/levers';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const byCode = new Map(levers.map((l) => [l.code, l] as const));
/** How many of a group's levers are on show before the fold. */
const SHOWN_PER_GROUP = 3;

/** The route of one of the two screens. */
export function finetunePath(side: FinetuneSideId): string {
  return `/finetune/${side}`;
}

/** Each screen's own words: its foot link into the desk, and what the desk's way back says. */
const SIDES: Record<FinetuneSideId, { desk: string; every: string; back: string }> = {
  tax: { desk: '/budget/taxes', every: 'Every tax lever', back: 'Back to fine-tuning tax' },
  spending: {
    desk: '/budget/spending',
    every: 'Every spending lever',
    back: 'Back to fine-tuning spending',
  },
};

/**
 * What a group's moved levers do in the target year, in the head of the group: on the tax screen
 * what they raise (or cost), on the spending screen what they cost (or save), day-to-day and
 * investment together.
 */
export function groupCount(
  group: FinetuneGroup,
  side: FinetuneSideId,
  values: Record<string, number>,
  effects: readonly LeverEffect[],
  year: string,
): string {
  const moved = group.items.filter((item) => {
    const lever = byCode.get(item.code);
    return (
      lever !== undefined && (values[item.code] ?? lever.control.default) !== lever.control.default
    );
  });
  if (moved.length === 0) {
    return `${group.items.length} ${group.items.length === 1 ? 'lever' : 'levers'}`;
  }
  let gbpm = 0;
  for (const item of moved) {
    const e = effects.find((x) => x.code === item.code);
    if (!e) continue;
    gbpm +=
      side === 'tax'
        ? (e.receipts[year] ?? 0)
        : (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
  }
  const head = `${moved.length} moved`;
  if (Math.abs(gbpm) < UNCHANGED_BELOW_GBPM) return head;
  const amount = formatGbpBn(Math.abs(gbpm), 1);
  if (side === 'tax') return `${head} · ${gbpm > 0 ? 'raises' : 'costs'} ${amount}`;
  return `${head} · ${gbpm > 0 ? 'costs' : 'saves'} ${amount}`;
}

/**
 * Step 4, the curated screens (Phase 24, ADR-0025): fine-tune tax, then spending. Each is the
 * desk's own levers, hand-picked and grouped (who pays, on the tax screen; what the money is for,
 * on the other), each under a plain title with one adviser's line and the numbers in view: at rest
 * a lever says what its usual move would do and the headroom that would leave; moved, what it
 * does. The bar keeps score. The first few levers of a group are on show with any already moved;
 * the rest wait under one fold, and a lever moved inside the fold stays where it is until the next
 * visit, so a slider never jumps from under the pointer. Every lever is one link away, on the desk.
 */
export function FinetunePage() {
  const { side: param } = useParams();
  const { state } = useBudget();
  const { search } = useLocation();
  const guard = useStageGuard('finetune');
  if (guard) return guard;
  if (param !== 'tax' && param !== 'spending') {
    return <Navigate to={{ pathname: finetunePath('tax'), search }} replace />;
  }
  // A sandbox has no priorities and no road: every lever is on the desk.
  if (!state.game) return <Navigate to={{ pathname: SIDES[param].desk, search }} replace />;
  // One screen per side, remounted on the way from one to the other, so each visit begins with a
  // fresh reading of which levers have moved.
  return <FinetuneScreen key={param} side={param} />;
}

function FinetuneScreen({ side }: { side: FinetuneSideId }) {
  const { state, dispatch, outcome } = useBudget();
  const { pathname } = useLocation();
  const priceOf = useOptionPrices();
  // Which levers had moved when the screen was opened: those join the ones on show; a lever moved
  // inside the fold stays in it until the next visit.
  const [arrived] = useState(() => new Set(Object.keys(state.leverValues)));
  const game = state.game;
  if (!game) return null;

  const spec = finetune[side];
  const words = SIDES[side];
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '2029-30';
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const chosen = chosenByLever(status);
  const redLinesFor = redLinesOf(state.leverValues);
  const who = adviserById.get(spec.adviser)?.role ?? spec.adviser;
  const index = ranked.length + (side === 'tax' ? 1 : 2);

  const card = (item: FinetuneItem) => {
    const lever = byCode.get(item.code);
    if (!lever) return null;
    return (
      <CuratedLever
        key={item.code}
        item={item}
        lever={lever}
        who={who}
        summaryYear={year}
        priceOf={priceOf}
        redLinesFor={redLinesFor}
        chosen={chosen.get(item.code)}
        moved={moved}
      />
    );
  };

  /**
   * Leaving the package for the first time: remember it as it stood before the OBR spoke,
   * assumptions included, so the forecast can be taken apart and the close can diff against it.
   */
  const leave = () => {
    if (!game.revealed) dispatch({ type: 'setSnapshot', values: { ...state.leverValues } });
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('forecast')) },
    });
  };
  const onward =
    side === 'tax'
      ? { to: finetunePath('spending'), label: 'Next: spending', leave: false }
      : game.revealed
        ? { to: '/compromise', label: 'Back to the compromises', leave: true }
        : { to: '/forecast', label: 'Next: the forecast', leave: true };
  const back =
    side === 'tax' ? (ranked.length > 0 ? deliverPath(ranked.length) : '/pm') : finetunePath('tax');

  return (
    <JourneyLayout
      step="finetune"
      part={{ index, total: ranked.length + 2, label: spec.title }}
      title={spec.title}
      lead={spec.lead}
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      {spec.groups.map((group) => {
        const id = `tune-${group.id}`;
        const shown = group.items.filter(
          (item, i) => i < SHOWN_PER_GROUP || arrived.has(item.code),
        );
        const folded = group.items.filter((item) => !shown.includes(item));
        return (
          <section key={group.id} className="who tune" aria-labelledby={id}>
            <h2 id={id} className="section-label who__title">
              {group.label}{' '}
              <span className="who__count">
                {groupCount(group, side, state.leverValues, outcome.leverEffects, year)}
              </span>
            </h2>
            <div className="tune__levers">{shown.map(card)}</div>
            {folded.length > 0 ? (
              <details className="more more--inset">
                <summary>
                  {folded.length} more {folded.length === 1 ? 'lever' : 'levers'}
                </summary>
                <div className="more__body tune__levers">{folded.map(card)}</div>
              </details>
            ) : null}
          </section>
        );
      })}
      <p className="more-link">
        <StepLink
          to={words.desk}
          state={{ from: 'finetune', returnTo: pathname, returnLabel: words.back }}
        >
          {words.every}
        </StepLink>
      </p>
      <p className="actions">
        <StepLink
          to={onward.to}
          className="btn btn--primary"
          {...(onward.leave ? { onClick: leave } : {})}
        >
          {onward.label}
        </StepLink>
        <StepLink to={back} className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
