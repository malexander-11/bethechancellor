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
import { Navigate, useLocation } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { BudgetSummary } from '../components/BudgetSummary';
import { Spoken } from '../components/Conversation';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { MinisterLine } from '../components/MinisterLine';
import { OptionCard } from '../components/OptionCard';
import { Scorecard } from '../components/Scorecard';
import { briefingsFor, interventions, levers, ministers, options, pm, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];
const MINISTER_ROLES = new Set(ministers.ministers.map((m) => m.role));
const byCode = new Map(levers.map((l) => [l.code, l] as const));

/** Which desk screen a lever lives on, and which group of it. */
function deskFor(lever: Lever): { to: string; group: string; noun: string } {
  return lever.category === 'tax'
    ? { to: '/budget/taxes', group: lever.group ?? '', noun: 'tax' }
    : { to: '/budget/spending', group: lever.group ?? '', noun: 'spending' };
}

/**
 * The quiet way into the desk from a section: one link per desk screen its options touch, opening
 * the group of the first lever there. Most sections touch one screen; the cost of living touches
 * both.
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
 * Step 4, first screen (Phase 18, ADR-0022): the ways to deliver what was agreed with the Prime
 * Minister. One section per ranked priority, opened by the minister or adviser who leads on it,
 * then its costed options: each a bundle of the game's own levers, priced by the engine against
 * the Budget as it stands, chosen with a tick. Two options that count the same money cannot both
 * be chosen here: while one is in, the other's card says "Instead of" and waits. The desk is one
 * link away for anyone who wants to set a figure by hand; a sandbox with no game goes straight
 * there, because there are no priorities to deliver.
 */
export function DeliverPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const priceOf = useOptionPrices();
  const game = state.game;
  const guard = useStageGuard('deliver');
  if (guard) return guard;
  if (!game) return <Navigate to={{ pathname: '/budget/taxes', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const years = outcome.paths.years;
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const headroomGbpm = stability?.headroomGbpm ?? 0;
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
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

  return (
    <JourneyLayout step="deliver">
      <Beats step="deliver">
        <Beat
          title="The Director of Public Spending’s briefing"
          continueLabel="To the ways to deliver"
          foldWhenPast="The Director of Public Spending’s briefing"
        >
          {briefingsFor('deliver').map((b) => (
            <AdviserBriefing key={b.id} briefing={b} />
          ))}
        </Beat>
        <Beat title="Ways to deliver">
          <Scorecard
            outcome={outcome}
            typicalErrorGbpm={typicalErrorGbpm}
            sticky
            target={game.headroomTargetBn * 1000}
          />
          <BudgetSummary
            game={game}
            status={status}
            headroomGbpm={headroomGbpm}
            targetYear={targetYear}
            showHeadroom={false}
          />
          <Interventions items={advice} />
          <p className="panel__hint">
            Figures are for {targetYear}, against your Budget as it stands.
          </p>
          {ranked.length === 0 ? (
            <p className="panel__hint">
              No priority is ranked yet. <StepLink to="/pm">Back to the Prime Minister</StepLink>.
            </p>
          ) : null}
          {status.priorities.map((report) => {
            const { priority } = report;
            const headingId = `deliver-${priority.id}`;
            const tone = MINISTER_ROLES.has(priority.lead) ? 'minister' : 'adviser';
            const links = deskLinks(report.options.map((o) => o.option));
            return (
              <section key={priority.id} className="priority doc" aria-labelledby={headingId}>
                <h2 id={headingId} className="section-label">
                  {RANK[report.rank - 1] ?? `${report.rank}th`} · {priority.title}
                </h2>
                <Spoken line={priority.brief} who={priority.lead} tone={tone} />
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
                          optionLevers.map((l) => [
                            l.code,
                            state.leverValues[l.code] ?? l.control.default,
                          ]),
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
                <p className="choice-details">
                  {links.map((link, i) => (
                    <span key={link.to}>
                      {i > 0 ? ' · ' : ''}
                      <StepLink to={link.to} state={{ group: link.group, from: 'deliver' }}>
                        Adjust the {links.length > 1 ? `${link.noun} ` : ''}details
                        <span className="sr-only"> for {priority.title}</span>
                      </StepLink>
                    </span>
                  ))}
                </p>
              </section>
            );
          })}
          <p className="hero-start__actions">
            <StepLink to="/budget/afford" className="btn btn--primary">
              Next: the ways to afford it
            </StepLink>
            <StepLink to="/pm" className="btn">
              Back to the Prime Minister
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
