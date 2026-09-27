import {
  ambitionStatus,
  blockedBy,
  optionConflicts,
  optionEarliestStart,
  optionOff,
  optionOverlaps,
  optionRedLines,
  rankedPriorities,
  type DeliverOption,
  type Lever,
} from '@btc/engine';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { MinisterLine } from '../components/MinisterLine';
import { OptionCard } from '../components/OptionCard';
import { adviserById, levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];
const byCode = new Map(levers.map((l) => [l.code, l] as const));

/** The route of the n-th priority's screen (1-based): the first has the bare route. */
export function deliverPath(n: number): string {
  return n <= 1 ? '/budget/deliver' : `/budget/deliver/${n}`;
}

/** Which desk screen a lever lives on, and which group of it. */
function deskFor(lever: Lever): { to: string; group: string; noun: string } {
  return lever.category === 'tax'
    ? { to: '/budget/taxes', group: lever.group ?? '', noun: 'tax' }
    : { to: '/budget/spending', group: lever.group ?? '', noun: 'spending' };
}

/**
 * The ways into the desk, one per desk screen the priority's options touch, opening the group of
 * the first lever there; the screen shows the first. Most priorities touch one screen.
 */
function deskLinks(
  section: readonly DeliverOption[],
): { to: string; group: string; noun: string }[] {
  const seen = new Map<string, { to: string; group: string; noun: string }>();
  for (const option of section) {
    for (const code of Object.keys(option.values)) {
      const lever = byCode.get(code);
      if (!lever) continue;
      const desk = deskFor(lever);
      if (!seen.has(desk.to)) seen.set(desk.to, desk);
    }
  }
  return [...seen.values()];
}

/**
 * Step 4, the first screens: one per priority agreed with the Prime Minister, in rank order: its
 * costed options, each a bundle of the game's own levers priced against the Budget as it stands
 * (ADR-0022), chosen with a tick, each with one adviser's line on who proposed it and what it costs
 * and does (Phase 23); two that count the same money cannot both be on. The headroom bar keeps score as you tick. Every lever the game
 * has is one link away under "More policies"; a sandbox with no game goes straight there, because
 * it has no priorities to deliver.
 */
export function DeliverPage() {
  const { n: nParam } = useParams();
  const { state, dispatch, outcome } = useBudget();
  const { search, pathname } = useLocation();
  const priceOf = useOptionPrices();
  const game = state.game;
  const guard = useStageGuard('deliver');
  if (guard) return guard;
  if (!game) return <Navigate to={{ pathname: '/budget/taxes', search }} replace />;

  const ranked = rankedPriorities(game, pm);
  const requested = Number(nParam ?? '1');
  const n = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 1), Math.max(ranked.length, 1))
    : 1;
  // A screen number that is not one of the priorities lands on the nearest one; the first keeps
  // the bare route, so there is one address for each screen.
  if (nParam !== undefined && (String(n) !== nParam || n === 1)) {
    return <Navigate to={{ pathname: deliverPath(n), search }} replace />;
  }
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const report = status.priorities.find((p) => p.rank === n);
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const leversOf = (option: DeliverOption) =>
    Object.keys(option.values)
      .map((code) => byCode.get(code))
      .filter((l): l is Lever => l !== undefined);
  const choose = (option: DeliverOption, on: boolean) =>
    dispatch({ type: 'setLevers', values: on ? option.values : optionOff(option, levers) });

  if (!report) {
    return (
      <JourneyLayout
        step="deliver"
        title="Build your Budget"
        lead="Nothing is ranked yet, so there is nothing to deliver."
      >
        <p className="actions">
          <StepLink to="/pm" className="btn btn--primary">
            Back to the Prime Minister
          </StepLink>
        </p>
      </JourneyLayout>
    );
  }

  const { priority } = report;
  const rank = RANK[n - 1] ?? `${n}th`;
  // One quiet way into the desk: the screen the priority's first lever lives on.
  const desk = deskLinks(report.options.map((o) => o.option))[0];
  const nextPriority = ranked[n];
  const back = n > 1 ? deliverPath(n - 1) : '/pm';

  return (
    <JourneyLayout
      step="deliver"
      part={{ index: n, total: ranked.length + 1, label: priority.title }}
      title={
        <>
          <span className="intro__rank">{rank}</span> {priority.title}
        </>
      }
      tabTitle={`${rank} · ${priority.title}`}
      lead="Tick the ways you want."
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      <div
        className="choices choices--list"
        role="group"
        aria-label={`Ways to deliver: ${priority.title}`}
      >
        {report.options.map(({ option, state: optionState }) => {
          const optionLevers = leversOf(option);
          const blocked = blockedBy(option, options, levers, state.leverValues);
          const clashes =
            optionState === 'off'
              ? []
              : optionConflicts(option, options, levers, state.leverValues).filter(
                  (c) => c.partner !== 'off',
                );
          return (
            <OptionCard
              key={option.id}
              id={option.id}
              name="deliver"
              title={option.title}
              state={optionState}
              price={priceOf(option, optionState === 'on')}
              levers={optionLevers}
              values={Object.fromEntries(
                optionLevers.map((l) => [l.code, state.leverValues[l.code] ?? l.control.default]),
              )}
              onChange={(on) => choose(option, on)}
              redLines={optionRedLines(option, pm.promises, levers, state.leverValues)}
              earliestStart={optionEarliestStart(option, levers)}
              overlaps={optionOverlaps(option, levers, moved, options)}
              {...(blocked ? { blocked } : {})}
              clashes={clashes}
              line={option.line}
              who={priority.lead}
              advice={{
                who: adviserById.get(option.advice.adviser)?.role ?? option.advice.adviser,
                line: option.advice,
              }}
            >
              {optionLevers
                .filter((l) => l.category !== 'tax')
                .map((l) => (
                  <MinisterLine
                    key={l.code}
                    lever={l}
                    value={state.leverValues[l.code] ?? l.control.default}
                  />
                ))}
            </OptionCard>
          );
        })}
      </div>
      {desk ? (
        <p className="more-link">
          <StepLink
            to={desk.to}
            state={{
              group: desk.group,
              from: 'deliver',
              returnTo: pathname,
              returnLabel: `Back to the options for ${priority.noun}`,
            }}
          >
            More policies: every lever
          </StepLink>
        </p>
      ) : null}
      <p className="actions">
        {nextPriority ? (
          <StepLink to={deliverPath(n + 1)} className="btn btn--primary">
            Next: {nextPriority.title}
          </StepLink>
        ) : (
          <StepLink to="/budget/afford" className="btn btn--primary">
            Next: pay for it
          </StepLink>
        )}
        <StepLink to={back} className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
