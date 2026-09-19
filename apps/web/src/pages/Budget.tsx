import {
  ambitionStatus,
  formatGbpBn,
  formatPct,
  interventionsFor,
  pickOutcome,
  promiseBreaks,
  stageIndex,
  type JourneyStep,
  type Lever,
} from '@btc/engine';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { AttributionList } from '../components/AttributionList';
import { Desk } from '../components/Desk';
import { BudgetSummary } from '../components/BudgetSummary';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { LeverControl, formatLeverValue, type RedLine } from '../components/LeverControl';
import { MinisterLine } from '../components/MinisterLine';
import { PathChart } from '../components/PathChart';
import { PressSummary } from '../components/PressSummary';
import { PresetPicker } from '../components/PresetPicker';
import { Scorecard } from '../components/Scorecard';
import {
  briefingsFor,
  context,
  draws,
  groupLevers,
  interventions,
  levers,
  leversByCategory,
  pm,
  rules,
  vintage,
} from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { describeAssumptions, macroCodesOf, scenarioCards } from '../journey/scenarios';
import { useWorkings } from '../journey/workings';
import { useBudget } from '../state/budget';

const ASSUMPTION_CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

const nextBudget = new Date(rules.assessment.nextFormalAssessmentOn).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type Tab = 'taxes' | 'spending' | 'policies';

/** The three files of the desk, in the order they are handed over. */
const DESK_ORDER: readonly Tab[] = ['taxes', 'spending', 'policies'];

/**
 * The three screens of the desk: what each is called, whose file it is, and where it leads. They
 * come one after another, by the button at the foot of the page, with a way back but no tab bar:
 * one road (ADR-0014).
 */
const TABS: Record<
  Tab,
  {
    /** How the guide's kicker names this screen: "File 1 of 3: the taxes". */
    part: string;
    arrives: string;
    open: string;
    folded: string;
    work: string;
    /** Advisers and briefings were authored against the Phase 5 step names. */
    briefingStep: JourneyStep;
    next: { to: string; label: string };
    back?: { to: string; label: string };
  }
> = {
  taxes: {
    part: 'the taxes',
    arrives: 'The Director of Tax hands you the tax file',
    open: 'Open the file',
    folded: 'The Director of Tax’s briefing',
    work: 'Set the taxes',
    briefingStep: 'taxes',
    next: { to: '/budget/spending', label: 'Next: the spending file' },
  },
  spending: {
    part: 'the spending',
    arrives: 'The Director of Public Spending hands you the spending file',
    open: 'Open the file',
    folded: 'The Director of Public Spending’s briefing',
    work: 'Set the spending',
    briefingStep: 'spending',
    next: { to: '/budget/policies', label: 'Next: your colleagues’ letters' },
    back: { to: '/budget/taxes', label: 'Back to the taxes' },
  },
  policies: {
    part: 'your colleagues’ letters',
    arrives: 'A bundle of letters arrives from your colleagues',
    open: 'Read the letters',
    folded: 'What your advisers said about these letters',
    work: 'The policies, and what each would cost',
    briefingStep: 'recommendations',
    next: { to: '/budget-day', label: 'Go to Budget day' },
    back: { to: '/budget/spending', label: 'Back to the spending' },
  },
};

function isTab(tab: string | undefined): tab is Tab {
  return tab === 'taxes' || tab === 'spending' || tab === 'policies';
}

/** A lever's effect on borrowing in a year, £ million, positive = more borrowing. */
function borrowingEffect(
  outcome: ReturnType<typeof useBudget>['outcome'],
  code: string,
  year: string,
): number {
  const effect = outcome.leverEffects.find((e) => e.code === code);
  if (!effect) return 0;
  return (
    (effect.currentSpending[year] ?? 0) +
    (effect.capitalSpending[year] ?? 0) -
    (effect.receipts[year] ?? 0)
  );
}

/**
 * Stage 3: the desk. Three folders of levers, and, when a game is under way, the people in the
 * room with you: ministers on the spending folders, advisers who remember what you agreed in
 * Downing Street, the summary strip keeping score, and the Political Adviser's press summary
 * planting the clue the seeded draw chose.
 */
export function BudgetPage() {
  const { tab } = useParams();
  const { state, dispatch, outcome, query } = useBudget();
  const [copied, setCopied] = useState(false);
  const workings = useWorkings();
  // A game that has not yet left Downing Street is sent back there; a sandbox walks straight in.
  const guard = useStageGuard(isTab(tab) ? tab : 'taxes');
  if (guard) return guard;
  if (!isTab(tab)) {
    return (
      <Navigate to={{ pathname: '/budget/taxes', search: query ? `?${query}` : '' }} replace />
    );
  }
  const step = tab;
  const spec = TABS[step];
  const items =
    step === 'taxes'
      ? leversByCategory.tax
      : step === 'spending'
        ? leversByCategory.spend
        : leversByCategory.campaign;
  const { paths } = outcome;
  const years = paths.years;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const groups = useMemo(() => groupLevers(items), [items]);
  // Which folder is open is a fact about the desk, not about the Budget, so it stays out of the
  // URL. Keyed by tab, so coming back to taxes finds the file you left out.
  const [folders, setFolders] = useState<Record<string, string>>({});
  const openFolder = folders[step];
  // Open on the first file you have touched, so a shared Budget does not look untouched.
  const defaultFolder =
    groups.find((g) => g.levers.some((l) => moved.has(l.code)))?.name ?? groups[0]?.name ?? '';
  // Name the card the player chose on step 1; fall back to the figures only if they set their own.
  const macroSummary =
    describeAssumptions(ASSUMPTION_CARDS, state.leverValues, MACRO_CODES, state.game?.revealed) ??
    leversByCategory.macro
      .map((l) => ({ lever: l, value: state.leverValues[l.code] ?? l.control.default }))
      .filter((x) => x.value !== x.lever.control.default)
      .map((x) => `${x.lever.shortTitle} ${formatLeverValue(x.lever, x.value)}`)
      .join(' · ');

  // The game, when there is one: what was agreed with the PM, held against the package.
  const game = state.game;
  const status = game ? ambitionStatus(game, pm, outcome, levers) : null;
  const headroomGbpm = stability?.headroomGbpm ?? 0;
  const ruleMissed = outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const advice =
    game && status
      ? interventionsFor(interventions, status, {
          headroomGbpm,
          targetGbpm: game.headroomTargetBn * 1000,
          ruleMissed,
        })
      : [];
  const promised = new Map(
    (status?.priorities ?? []).map((p) => [p.flagship.target.code, p] as const),
  );
  // The manifesto red lines, read from the same file the PM's promises come from, and whether the
  // package as it stands crosses each. Pure arithmetic over the levers: it works without a game.
  const breaks = promiseBreaks(state.leverValues, pm.promises, levers);
  const redLinesFor = (code: string): RedLine[] =>
    pm.promises.flatMap((p) =>
      p.breaks
        .filter((rule) => rule.code === code)
        .map((rule) => ({
          promise: p.title,
          when: rule.when,
          broken:
            breaks.find((b) => b.promise.id === p.id)?.brokenBy.some((b) => b.code === code) ??
            false,
        })),
    );
  const clue = game && step === 'spending' ? pickOutcome(game.seed, draws.outcomes) : null;

  const adopted = items.filter(
    (l) =>
      step === 'policies' && (state.leverValues[l.code] ?? l.control.default) !== l.control.default,
  );
  const adoptedTotal = adopted.reduce(
    (sum, l) => sum + borrowingEffect(outcome, l.code, targetYear),
    0,
  );

  /**
   * Leaving the desk for the first time: remember the package as it stood before the OBR spoke,
   * assumptions included, so the forecast can be taken apart and the close can diff against it.
   * Coming back afterwards changes the package, not the record of what it was.
   */
  const leaveDesk = () => {
    if (!game) return;
    if (!game.revealed) dispatch({ type: 'setSnapshot', values: { ...state.leverValues } });
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('forecast')) },
    });
  };
  // Where the desk leads depends on how far the game has got: to the OBR's envelope, back to the
  // compromises once it is open, or straight to Budget day for a sandbox with no game.
  const onward = !game
    ? { to: '/budget-day', label: 'Go to Budget day' }
    : game.revealed
      ? { to: '/compromise', label: 'Back to the compromises' }
      : { to: '/forecast', label: 'Next: the OBR’s forecast' };

  async function copyLink() {
    const url = `${window.location.origin}/budget-day?${query}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const toBn = (values: Record<string, number>) => years.map((y) => (values[y] ?? 0) / 1000);
  const surplus = (values: Record<string, number>) => years.map((y) => -(values[y] ?? 0) / 1000);

  /** Promised flagships go to the top of their folder, wearing a tag. */
  const orderForDesk = (list: Lever[]): Lever[] => [
    ...list.filter((l) => promised.has(l.code)),
    ...list.filter((l) => !promised.has(l.code)),
  ];

  return (
    <JourneyLayout
      step={step}
      part={{ noun: 'File', index: DESK_ORDER.indexOf(step) + 1, total: 3, label: spec.part }}
    >
      <Beats step={step}>
        <Beat title={spec.arrives} continueLabel={spec.open} foldWhenPast={spec.folded}>
          {step === 'policies' ? (
            <div className="briefing-row">
              {briefingsFor(spec.briefingStep).map((b) => (
                <AdviserBriefing key={b.id} briefing={b} compact />
              ))}
            </div>
          ) : (
            briefingsFor(spec.briefingStep).map((b) => <AdviserBriefing key={b.id} briefing={b} />)
          )}
        </Beat>
        <Beat title={spec.work}>
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} sticky />
          {game && status ? (
            <BudgetSummary
              game={game}
              status={status}
              headroomGbpm={headroomGbpm}
              targetYear={targetYear}
            />
          ) : null}
          <p className="assumptions-line">
            Economic assumptions: {macroSummary.length > 0 ? macroSummary : "the OBR's March view"}{' '}
            · <StepLink to="/outlook">change</StepLink>
          </p>
          <Interventions items={advice} />
          {clue ? <PressSummary outcome={clue} /> : null}
          {step === 'policies' ? (
            <>
              <p className="panel__hint">
                Policies your colleagues in Parliament are campaigning for. Adopt the ones you want.
                Every cost here is our own arithmetic, not an official costing.
              </p>
              <p className="adopted-line" role="status">
                {adopted.length === 0
                  ? 'Nothing adopted yet. Adopting one is a toggle; the scorecard moves as you read.'
                  : `${adopted.length} adopted · ${
                      adoptedTotal >= 0 ? 'costing' : 'raising'
                    } ${formatGbpBn(Math.abs(adoptedTotal), 1)} in ${targetYear}`}
              </p>
            </>
          ) : null}

          <div className="layout">
            <aside>
              <Desk
                groups={groups}
                moved={moved}
                effects={outcome.leverEffects}
                summaryYear={targetYear}
                open={openFolder ?? defaultFolder}
                onOpen={(name) => setFolders((f) => ({ ...f, [step]: name }))}
              >
                {(group) => (
                  <>
                    {briefingsFor(spec.briefingStep, group.name).map((b) => (
                      <AdviserBriefing key={b.id} briefing={b} compact variant="body" />
                    ))}
                    {orderForDesk(group.levers).map((lever) => {
                      const value = state.leverValues[lever.code] ?? lever.control.default;
                      const report = promised.get(lever.code);
                      return (
                        <div key={lever.id} className={report ? 'pinned' : undefined}>
                          <LeverControl
                            lever={lever}
                            value={value}
                            effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                            summaryYear={targetYear}
                            onChange={(next) =>
                              dispatch({ type: 'setLever', code: lever.code, value: next })
                            }
                            redLines={redLinesFor(lever.code)}
                            promised={
                              report
                                ? {
                                    title: report.flagship.title,
                                    target: formatLeverValue(lever, report.flagship.target.value),
                                    status: report.status,
                                  }
                                : undefined
                            }
                          />
                          <MinisterLine lever={lever} value={value} />
                        </div>
                      );
                    })}
                  </>
                )}
              </Desk>
              <p className="hero-start__actions">
                <StepLink
                  to={step === 'policies' ? onward.to : spec.next.to}
                  className="btn btn--primary"
                  onClick={step === 'policies' ? leaveDesk : undefined}
                >
                  {step === 'policies' ? onward.label : spec.next.label}
                </StepLink>
                {spec.back ? (
                  <StepLink to={spec.back.to} className="btn">
                    {spec.back.label}
                  </StepLink>
                ) : null}
              </p>
            </aside>

            <div>
              <div className="toolbar">
                {workings ? (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={state.debtInterestFeedback}
                        onChange={(e) => dispatch({ type: 'setFeedback', value: e.target.checked })}
                      />
                      Charge interest on extra borrowing (mechanical)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={state.assessAsOf === 'nextBudget'}
                        onChange={(e) =>
                          dispatch({
                            type: 'setAssessAsOf',
                            value: e.target.checked ? 'nextBudget' : 'vintage',
                          })
                        }
                      />
                      Judge by the rules as they will apply from the{' '}
                      {nextBudget.split(' ').slice(-2).join(' ')} Budget (rolling target)
                    </label>
                  </>
                ) : null}
                <button type="button" className="btn" onClick={() => dispatch({ type: 'reset' })}>
                  Reset to OBR
                </button>
                <button type="button" className="btn btn--primary" onClick={copyLink}>
                  {copied ? 'Link copied' : 'Copy link to this budget'}
                </button>
              </div>

              {state.warnings.length > 0 && (
                <div className="warnings" role="status">
                  This link could not be read completely:
                  <ul>
                    {state.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => dispatch({ type: 'dismissWarnings' })}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <section className="panel" aria-labelledby="attribution-heading">
                <h2 id="attribution-heading">What you’ve changed</h2>
                <p className="panel__hint">
                  What each change does in {targetYear} to the current budget (day-to-day borrowing)
                  and to total borrowing, which adds investment. Positive means the position gets
                  worse.
                </p>
                <AttributionList
                  rows={outcome.attribution}
                  baselineHeadroomGbpm={stability?.baseline.headroomGbpm ?? 0}
                />
              </section>

              {workings ? (
                <>
                  <InteractionsNotice interactions={outcome.interactions} />

                  {outcome.warnings.length > 0 && (
                    <div className="warnings" role="note">
                      Assumptions in play:
                      <ul>
                        {outcome.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <section className="panel" aria-labelledby="presets-heading">
                    <h2 id="presets-heading">Try a ready-made Budget</h2>
                    <PresetPicker
                      onApply={(leverValues) => dispatch({ type: 'applyPreset', leverValues })}
                      current={state.leverValues}
                    />
                  </section>

                  <details className="panel details">
                    <summary>
                      <h2>Five-year paths</h2>
                    </summary>
                    <div className="charts">
                      <PathChart
                        title="Current budget surplus"
                        subtitle="£ billion; negative means day-to-day spending exceeds revenue"
                        years={years}
                        baseline={surplus(paths.baseline.currentBudgetDeficit)}
                        policy={surplus(paths.policy.currentBudgetDeficit)}
                        format={(v) => formatGbpBn(v * 1000, 1, true)}
                        tickFormat={(v) => formatGbpBn(v * 1000, 0, true)}
                        highlightYear={targetYear}
                        zeroLine
                      />
                      <PathChart
                        title="Borrowing (PSNB)"
                        subtitle="£ billion a year"
                        years={years}
                        baseline={toBn(paths.baseline.psnb)}
                        policy={toBn(paths.policy.psnb)}
                        format={(v) => formatGbpBn(v * 1000, 1)}
                        tickFormat={(v) => formatGbpBn(v * 1000, 0)}
                        highlightYear={targetYear}
                        zeroLine
                      />
                      <PathChart
                        title="Net financial liabilities"
                        subtitle="% of GDP (the investment rule's debt measure)"
                        years={years}
                        baseline={years.map((y) => paths.baseline.psnflPctGdp[y] ?? 0)}
                        policy={years.map((y) => paths.policy.psnflPctGdp[y] ?? 0)}
                        format={(v) => formatPct(v, 1)}
                        highlightYear={targetYear}
                      />
                      <PathChart
                        title="Borrowing as a share of GDP"
                        subtitle="% of GDP"
                        years={years}
                        baseline={years.map((y) => paths.baseline.psnbPctGdp[y] ?? 0)}
                        policy={years.map((y) => paths.policy.psnbPctGdp[y] ?? 0)}
                        format={(v) => formatPct(v, 1)}
                        highlightYear={targetYear}
                        zeroLine
                      />
                    </div>
                  </details>
                </>
              ) : null}
            </div>
          </div>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
