import {
  affordTabs,
  ambitionStatus,
  formatGbpBn,
  interventionsFor,
  optionEarliestStart,
  optionOff,
  optionOverlaps,
  optionRedLines,
  optionState,
  pickOutcome,
  stageIndex,
  type AffordOption,
  type Lever,
} from '@btc/engine';
import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { BudgetSummary } from '../components/BudgetSummary';
import { Desk } from '../components/Desk';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { OptionCard } from '../components/OptionCard';
import { PressSummary } from '../components/PressSummary';
import { Scorecard } from '../components/Scorecard';
import {
  briefingsFor,
  draws,
  incidence,
  interventions,
  levers,
  options,
  pm,
  vintage,
  type LeverGroup,
} from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';

const byCode = new Map(levers.map((l) => [l.code, l] as const));
/** The five who-pays tabs, each holding the levers of its options, in the desk's shape. */
const TABS = affordTabs(options, incidence);
const GROUPS: LeverGroup[] = TABS.map((t) => ({
  name: t.tab.label,
  levers: t.options
    .map((o) => byCode.get(Object.keys(o.values)[0] ?? ''))
    .filter((l): l is Lever => l !== undefined),
}));
const OPTIONS_BY_TAB = new Map(TABS.map((t) => [t.tab.label, t.options] as const));

/**
 * Step 4, second screen (Phase 18, ADR-0022): the ways to afford what has been chosen. The gap
 * between the headroom the package leaves and the margin the player set out to keep, then the
 * revenue options grouped by who pays, each priced by the engine on its own and wearing its badge,
 * its red line and its earliest start. Choosing is a tick; the tax desk is one link away. Leaving
 * for the forecast records the package as it stood before the OBR spoke, as the desk used to.
 */
export function AffordPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const priceOf = useOptionPrices();
  const [openTab, setOpenTab] = useState('');
  const game = state.game;
  // The states of every option, read from the levers: on, adjusted or off.
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
  const years = outcome.paths.years;
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
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
  // Open on the first tab with something chosen, so a shared Budget does not look untouched.
  const defaultTab =
    GROUPS.find((g) => g.levers.some((l) => moved.has(l.code)))?.name ?? GROUPS[0]?.name ?? '';
  const choose = (option: AffordOption, on: boolean) =>
    dispatch({ type: 'setLevers', values: on ? option.values : optionOff(option, levers) });

  /**
   * Leaving the package for the first time: remember it as it stood before the OBR spoke,
   * assumptions included, so the forecast can be taken apart and the close can diff against it.
   * Coming back afterwards changes the package, not the record of what it was.
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
    : { to: '/forecast', label: 'Next: the OBR’s forecast' };

  return (
    <JourneyLayout step="afford">
      <Beats step="afford">
        <Beat
          title="The Director of Tax’s briefing"
          continueLabel="To the ways to afford it"
          foldWhenPast="The Director of Tax’s briefing"
        >
          {briefingsFor('afford').map((b) => (
            <AdviserBriefing key={b.id} briefing={b} />
          ))}
        </Beat>
        <Beat title="Ways to afford it">
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} sticky target={target} />
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
              {spent > 0 ? (
                <span className="gap__spent">
                  {' '}
                  Your priorities cost {formatGbpBn(spent, 1)} in {targetYear}.
                </span>
              ) : null}
            </p>
          </section>
          <Interventions items={advice} />
          <PressSummary outcome={clue} />
          <Desk
            groups={GROUPS}
            moved={moved}
            effects={outcome.leverEffects}
            summaryYear={targetYear}
            open={openTab || defaultTab}
            onOpen={setOpenTab}
            nouns={{ item: 'option', items: 'options', changed: 'chosen' }}
          >
            {(group) => {
              const tabOptions = OPTIONS_BY_TAB.get(group.name) ?? [];
              const first = group.levers[0];
              return (
                <>
                  <div className="choices choices--list" role="group" aria-label={group.name}>
                    {tabOptions.map((option) => {
                      const code = Object.keys(option.values)[0] ?? '';
                      const lever = byCode.get(code);
                      if (!lever) return null;
                      return (
                        <OptionCard
                          key={option.id}
                          id={option.id}
                          name="afford"
                          title={lever.title}
                          note={lever.headline ?? lever.description}
                          state={states.get(option.id) ?? 'off'}
                          price={priceOf(option)}
                          levers={[lever]}
                          values={{ [code]: state.leverValues[code] ?? lever.control.default }}
                          onChange={(on) => choose(option, on)}
                          redLines={optionRedLines(option, pm.promises, levers, state.leverValues)}
                          earliestStart={optionEarliestStart(option, levers)}
                          overlaps={optionOverlaps(option, levers, moved)}
                          {...(option.line ? { line: option.line, who: 'Director of Tax' } : {})}
                        />
                      );
                    })}
                  </div>
                  {first ? (
                    <p className="choice-details">
                      <StepLink
                        to="/budget/taxes"
                        state={{ group: first.group ?? '', from: 'afford' }}
                      >
                        Adjust the details
                        <span className="sr-only">
                          {' '}
                          of the taxes {group.name.toLowerCase()} pay
                        </span>
                      </StepLink>
                    </p>
                  ) : null}
                </>
              );
            }}
          </Desk>
          <p className="hero-start__actions">
            <StepLink to={onward.to} className="btn btn--primary" onClick={leave}>
              {onward.label}
            </StepLink>
            <StepLink to="/budget/deliver" className="btn">
              Back to the ways to deliver
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
