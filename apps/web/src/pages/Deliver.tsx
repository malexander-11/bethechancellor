import {
  ambitionStatus,
  blockedBy,
  interventionsFor,
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
import { Spoken } from '../components/Conversation';
import { HeadroomBar } from '../components/HeadroomBar';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { MinisterLine } from '../components/MinisterLine';
import { OptionCard } from '../components/OptionCard';
import { interventions, levers, ministers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];
const MINISTER_ROLES = new Set(ministers.ministers.map((m) => m.role));
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
 * The quiet way into the desk: one link per desk screen the priority's options touch, opening the
 * group of the first lever there. Most priorities touch one screen; the cost of living touches both.
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
 * Step 4, the first screens: one per priority agreed with the Prime Minister, in rank order. The
 * minister or adviser who leads on it opens; then its costed options, each a bundle of the game's
 * own levers priced against the Budget as it stands (ADR-0022), chosen with a tick; two that count
 * the same money cannot both be on. The headroom bar keeps score as you tick. Every lever the game
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
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroomGbpm = stability?.headroomGbpm ?? 0;
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const ruleMissed = outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const advice = interventionsFor(interventions, status, {
    headroomGbpm,
    targetGbpm: game.headroomTargetBn * 1000,
    ruleMissed,
  });
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
  // One note from the room at a time: the one about this priority if there is one, else the
  // first that is about the Budget as a whole. Notes about the other priorities wait for theirs.
  const own = advice.find((i) => i.about === priority.id);
  const general = advice.find((i) => i.about === undefined);
  const aside = own ? [own] : general ? [general] : [];
  const tone = MINISTER_ROLES.has(priority.lead) ? 'minister' : 'adviser';
  const links = deskLinks(report.options.map((o) => o.option));
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
      lead="Tick the ways you want. Each shows its cost, and the headroom your Budget would then have."
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      <Spoken line={priority.brief} who={priority.lead} tone={tone} />
      <Interventions items={aside} />
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
      <p className="panel__hint">Figures are for {targetYear}, against your Budget as it stands.</p>
      <p className="more-link">
        {links.map((link, i) => (
          <span key={link.to}>
            {i > 0 ? ' · ' : ''}
            <StepLink
              to={link.to}
              state={{
                group: link.group,
                from: 'deliver',
                returnTo: pathname,
                returnLabel: `Back to the options for ${priority.noun}`,
              }}
            >
              More policies: every {link.noun} lever
            </StepLink>
          </span>
        ))}
      </p>
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
