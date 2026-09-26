import {
  affordTabs,
  ambitionStatus,
  blockedBy,
  formatGbpBn,
  interventionsFor,
  optionConflicts,
  optionEarliestStart,
  optionOff,
  optionOverlaps,
  optionRedLines,
  optionState,
  pickOutcome,
  rankedPriorities,
  stageIndex,
  type AffordOption,
} from '@btc/engine';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { OptionCard } from '../components/OptionCard';
import { PressSummary } from '../components/PressSummary';
import { draws, incidence, interventions, levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const byCode = new Map(levers.map((l) => [l.code, l] as const));
/** The five who-pays groups, each with its options, in the order they are read. */
const GROUPS = affordTabs(options, incidence);
/** How many of a group's ways are on show before the fold. */
const SHOWN_PER_GROUP = 3;

/** What a group's chosen options do to receipts in the target year, and how many are chosen. */
function raised(
  group: (typeof GROUPS)[number],
  states: Map<string, string>,
  effects: readonly { code: string; receipts: Record<string, number> }[],
  year: string,
): { chosen: number; gbpm: number } {
  let chosen = 0;
  let gbpm = 0;
  for (const option of group.options) {
    if (states.get(option.id) === 'off') continue;
    chosen += 1;
    for (const code of Object.keys(option.values)) {
      gbpm += effects.find((e) => e.code === code)?.receipts[year] ?? 0;
    }
  }
  return { chosen, gbpm };
}

/**
 * Step 4, the last screen: how will you pay for it? The gap between the headroom your choices
 * leave and the margin you set out to keep, then the ways to raise money in five groups by who
 * pays, stacked on one screen so the balance between them is in view: no tabs, every option on
 * show, each priced against the Budget as it stands and wearing its badge, its red line and its
 * earliest start (ADR-0022). Every tax lever is one link away. Leaving for the forecast records
 * the package as it stood before the OBR spoke.
 */
export function AffordPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search, pathname } = useLocation();
  const priceOf = useOptionPrices();
  const game = state.game;
  const states = useMemo(
    () =>
      new Map(
        options.afford.map((o) => [o.id, optionState(o, state.leverValues, levers)] as const),
      ),
    [state.leverValues],
  );
  const guard = useStageGuard('afford');
  if (guard) return guard;
  if (!game) return <Navigate to={{ pathname: '/budget/taxes', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = game.headroomTargetBn * 1000;
  const gap = target - headroom;
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const spent = status.priorities.reduce((acc, p) => acc + p.costGbpm, 0);
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const ruleMissed = outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const advice = interventionsFor(interventions, status, {
    headroomGbpm: headroom,
    targetGbpm: target,
    ruleMissed,
  });
  const clue = pickOutcome(game.seed, draws.outcomes);
  const ranked = rankedPriorities(game, pm);
  const choose = (option: AffordOption, on: boolean) =>
    dispatch({ type: 'setLevers', values: on ? option.values : optionOff(option, levers) });

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
  const onward = game.revealed
    ? { to: '/compromise', label: 'Back to the compromises' }
    : { to: '/forecast', label: 'Next: the forecast' };
  const back = ranked.length > 0 ? deliverPath(ranked.length) : '/pm';

  return (
    <JourneyLayout
      step="afford"
      part={{ index: ranked.length + 1, total: ranked.length + 1, label: 'Pay for it' }}
      tabTitle="Pay for it"
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      <section className="gap doc" aria-label="The gap">
        <p className="gap__line">
          {spent > 0 ? (
            <span className="gap__spent">
              Your priorities cost {formatGbpBn(spent, 1)} in {targetYear}.{' '}
            </span>
          ) : null}
          {target > 0 ? (
            gap > 0 ? (
              <>
                You are{' '}
                <strong className="amount amount--worse">{formatGbpBn(gap, 1)} short</strong> of the{' '}
                {formatGbpBn(target, 0)} you set out to keep.
              </>
            ) : (
              <>
                You have{' '}
                <strong className="amount amount--better">{formatGbpBn(-gap, 1)} to spare</strong>{' '}
                against the {formatGbpBn(target, 0)} you set out to keep.
              </>
            )
          ) : headroom >= 0 ? (
            <>
              <strong className="amount">{formatGbpBn(headroom, 1)}</strong> of headroom, and you
              set no target beyond the rules.
            </>
          ) : (
            <>
              <strong className="amount amount--worse">{formatGbpBn(-headroom, 1)} short</strong> of
              the stability rule itself.
            </>
          )}
        </p>
      </section>
      <Interventions items={advice} />
      <p className="panel__hint">Figures are for {targetYear}, against your Budget as it stands.</p>
      {GROUPS.map((group) => {
        const id = `who-${group.tab.id}`;
        const { chosen, gbpm } = raised(group, states, outcome.leverEffects, targetYear);
        // The first few ways in each group are on show, with anything already chosen; the rest of
        // the group waits under "n more ways", so nobody has to read every measure to decide.
        const shown = group.options.filter(
          (o, i) => i < SHOWN_PER_GROUP || states.get(o.id) !== 'off',
        );
        const folded = group.options.filter((o) => !shown.includes(o));
        const card = (option: AffordOption) => {
          const code = Object.keys(option.values)[0] ?? '';
          const lever = byCode.get(code);
          if (!lever) return null;
          const own = states.get(option.id) ?? 'off';
          const blocked = blockedBy(option, options, levers, state.leverValues);
          const clashes =
            own === 'off'
              ? []
              : optionConflicts(option, options, levers, state.leverValues).filter(
                  (c) => c.partner !== 'off',
                );
          return (
            <OptionCard
              key={option.id}
              id={option.id}
              name="afford"
              title={lever.title}
              note={lever.headline ?? lever.description}
              state={own}
              price={priceOf(option, own === 'on')}
              levers={[lever]}
              values={{ [code]: state.leverValues[code] ?? lever.control.default }}
              onChange={(on) => choose(option, on)}
              redLines={optionRedLines(option, pm.promises, levers, state.leverValues)}
              earliestStart={optionEarliestStart(option, levers)}
              overlaps={optionOverlaps(option, levers, moved, options)}
              {...(blocked ? { blocked } : {})}
              clashes={clashes}
              {...(option.line ? { line: option.line, who: 'Director of Tax' } : {})}
            />
          );
        };
        return (
          <section key={group.tab.id} className="who" aria-labelledby={id}>
            <h2 id={id} className="section-label who__title">
              {group.tab.label}{' '}
              <span className="who__count">
                {chosen > 0
                  ? `${chosen} chosen · raises ${formatGbpBn(gbpm, 1)}`
                  : `${group.options.length} options`}
              </span>
            </h2>
            <div className="choices choices--list choices--compact">{shown.map(card)}</div>
            {folded.length > 0 ? (
              <details className="more more--inset">
                <summary>
                  {folded.length} more {folded.length === 1 ? 'way' : 'ways'}
                </summary>
                <div className="choices choices--list choices--compact more__body">
                  {folded.map(card)}
                </div>
              </details>
            ) : null}
          </section>
        );
      })}
      <p className="more-link">
        <StepLink
          to="/budget/taxes"
          state={{ from: 'afford', returnTo: pathname, returnLabel: 'Back to paying for it' }}
        >
          More policies: every tax lever
        </StepLink>
      </p>
      <details className="more">
        <summary>The morning papers</summary>
        <div className="more__body">
          <PressSummary outcome={clue} />
        </div>
      </details>
      <p className="actions">
        <StepLink to={onward.to} className="btn btn--primary" onClick={leave}>
          {onward.label}
        </StepLink>
        <StepLink to={back} className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
