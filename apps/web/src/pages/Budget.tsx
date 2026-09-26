import {
  ambitionStatus,
  formatGbpBn,
  formatPct,
  incidenceRows,
  interventionsFor,
  promiseBreaks,
  type JourneyStep,
  type Lever,
} from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { AttributionList } from '../components/AttributionList';
import { Desk } from '../components/Desk';
import { BudgetSummary } from '../components/BudgetSummary';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { LeverControl, formatLeverValue, type RedLine } from '../components/LeverControl';
import { MinisterLine } from '../components/MinisterLine';
import { PathChart } from '../components/PathChart';
import { PresetPicker } from '../components/PresetPicker';
import { Scorecard } from '../components/Scorecard';
import {
  briefingsFor,
  budget2025NetGbpm,
  context,
  groupLevers,
  incidence,
  interventions,
  levers,
  leversByCategory,
  pm,
  rules,
  vintage,
  options,
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

type Tab = 'taxes' | 'spending';

/** The two parts of the package, in the order they are handed over. */
const DESK_ORDER: readonly Tab[] = ['taxes', 'spending'];

/**
 * The two screens of the desk: what each is called, whose briefing opens it, and where it leads.
 * In the sandbox they come one after another, by the button at the foot of the page, with a way
 * back but no tab bar: one road (ADR-0014). With a game under way they are side rooms off the
 * guided screens (ADR-0022): the taxes behind the ways to afford, the spending behind the ways
 * to deliver, each with one way back. The letters' screen has gone; its levers sit here by side
 * (ADR-0017).
 */
const TABS: Record<
  Tab,
  {
    /** How the guide's kicker names this screen: "Part 1 of 2: the taxes". */
    part: string;
    arrives: string;
    open: string;
    folded: string;
    work: string;
    briefingStep: JourneyStep;
    /** The next screen of the package; the last screen leads onward, wherever the game has got to. */
    next?: { to: string; label: string };
    back?: { to: string; label: string };
    /** With a game: the guided screen this desk screen is the details of. */
    room: { to: string; label: string };
  }
> = {
  taxes: {
    part: 'the taxes',
    arrives: 'The Director of Tax’s briefing',
    open: 'To the taxes',
    folded: 'The Director of Tax’s briefing',
    work: 'Set the taxes',
    briefingStep: 'taxes',
    next: { to: '/budget/spending', label: 'Next: the spending' },
    room: { to: '/budget/afford', label: 'Back to paying for it' },
  },
  spending: {
    part: 'the spending',
    arrives: 'The Director of Public Spending’s briefing',
    open: 'To the spending',
    folded: 'The Director of Public Spending’s briefing',
    work: 'Set the spending',
    briefingStep: 'spending',
    back: { to: '/budget/taxes', label: 'Back to the taxes' },
    room: { to: '/budget/deliver', label: 'Back to building your Budget' },
  },
};

function isTab(tab: string | undefined): tab is Tab {
  return tab === 'taxes' || tab === 'spending';
}

/** What a link into the desk may carry in the router's state: which group to open, and where from. */
interface DeskState {
  group?: string;
  from?: 'deliver' | 'afford';
  /** The exact screen to go back to, and what to call it, when a guided screen sent you here. */
  returnTo?: string;
  returnLabel?: string;
}

/**
 * Stage 3: the desk. Two screens of lever groups, and, when a game is under way, the people in the
 * room with you: ministers on the spending groups, advisers who remember what you agreed in
 * Downing Street, the summary strip keeping score, and the options you chose pinned to the top of
 * their groups. With a game the desk is a side room off the guided screens, one link away and
 * never the default (ADR-0022): one beat, the briefing folded, a way back and no onward flow.
 * Without one it is the sandbox it always was, two screens in sequence leading to Budget day.
 */
export function BudgetPage() {
  const { tab } = useParams();
  const location = useLocation();
  const { state, dispatch, outcome, query } = useBudget();
  const [copied, setCopied] = useState(false);
  // Every hook runs before any early return: a redirect from one tab to another re-renders this
  // same component, and the hook order has to hold across it.
  const step: Tab = isTab(tab) ? tab : 'taxes';
  const arrived = (location.state ?? null) as DeskState | null;
  // Which group is open is a fact about the screen, not about the Budget, so it stays out of the
  // URL. Keyed by tab, so coming back to taxes finds the group you left open. A link from a guided
  // screen names the group to open ("Adjust the details"); it travels in the router's state, not
  // the query string, which belongs to the Budget.
  const [openGroups, setOpenGroups] = useState<Record<string, string>>(() =>
    arrived?.group ? { [step]: arrived.group } : {},
  );
  const arrivedGroup = arrived?.group;
  useEffect(() => {
    if (arrivedGroup) setOpenGroups((f) => ({ ...f, [step]: arrivedGroup }));
  }, [arrivedGroup, step, location.key]);
  const workings = useWorkings();
  const items = step === 'taxes' ? leversByCategory.tax : leversByCategory.spend;
  const groups = useMemo(() => groupLevers(items), [items]);
  // A game that has not yet left Downing Street is sent back there; a sandbox walks straight in.
  const guard = useStageGuard(step);
  if (guard) return guard;
  if (!isTab(tab)) {
    // The old third screen, and the Phase 5 step it replaced, land on the spending with the query
    // intact: the levers that were there are there.
    const home =
      tab === 'policies' || tab === 'recommendations' ? '/budget/spending' : '/budget/taxes';
    return <Navigate to={{ pathname: home, search: query ? `?${query}` : '' }} replace />;
  }
  const spec = TABS[step];
  const { paths } = outcome;
  const years = paths.years;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const openGroup = openGroups[step];
  // Open on the first group you have touched, so a shared Budget does not look untouched.
  const defaultGroup =
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
  const status = game ? ambitionStatus(game, pm, options, outcome, levers) : null;
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
  // The options the player chose, by the levers they move, so the desk can pin and tag them.
  const chosen = new Map(
    (status?.priorities ?? [])
      .flatMap((p) => p.options)
      .filter((o) => o.state !== 'off')
      .flatMap((o) => Object.keys(o.option.values).map((code) => [code, o] as const)),
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
  // Who pays and who benefits, by the tags each lever carries, in the target year.
  const { paid, benefited } = incidenceRows(outcome, levers, incidence, targetYear);

  // Where the desk leads. A sandbox walks its two screens in sequence and on to Budget day. With a
  // game the desk is a side room: the one link goes back to the guided screen you came from, or to
  // the one these levers belong to, or to the compromises once the envelope is open.
  const forward = game ? null : (spec.next ?? { to: '/budget-day', label: 'Go to Budget day' });
  const back = game
    ? arrived?.returnTo
      ? { to: arrived.returnTo, label: arrived.returnLabel ?? 'Back' }
      : arrived?.from === 'deliver'
        ? TABS.spending.room
        : arrived?.from === 'afford'
          ? TABS.taxes.room
          : game.revealed
            ? { to: '/compromise', label: 'Back to the compromises' }
            : spec.room
    : spec.back;

  async function copyLink() {
    const url = `${window.location.origin}/budget-day?${query}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const toBn = (values: Record<string, number>) => years.map((y) => (values[y] ?? 0) / 1000);
  const surplus = (values: Record<string, number>) => years.map((y) => -(values[y] ?? 0) / 1000);

  /** Levers inside a chosen option go to the top of their group, wearing a tag. */
  const orderForDesk = (list: Lever[]): Lever[] => [
    ...list.filter((l) => chosen.has(l.code)),
    ...list.filter((l) => !chosen.has(l.code)),
  ];

  const briefing = briefingsFor(spec.briefingStep).map((b) => (
    <AdviserBriefing key={b.id} briefing={b} />
  ));

  return (
    <JourneyLayout
      step={step}
      part={
        // With a game the desk is a side room, named on the line; a sandbox walks its two parts.
        game
          ? { index: 0, total: 0, label: 'More policies' }
          : { index: DESK_ORDER.indexOf(step) + 1, total: DESK_ORDER.length, label: spec.part }
      }
    >
      <Beats step={step}>
        {game ? null : (
          <Beat title={spec.arrives} continueLabel={spec.open} foldWhenPast={spec.folded}>
            {briefing}
          </Beat>
        )}
        <Beat title={spec.work}>
          {game ? (
            // A side room has no hand-off: the briefing is here, folded, one click away.
            <details className="panel details">
              <summary>
                <span className="details__title">{spec.folded}</span>
              </summary>
              {briefing}
            </details>
          ) : null}
          <Scorecard
            outcome={outcome}
            typicalErrorGbpm={typicalErrorGbpm}
            sticky
            target={game ? game.headroomTargetBn * 1000 : undefined}
          />
          {game && status ? (
            <BudgetSummary
              game={game}
              status={status}
              headroomGbpm={headroomGbpm}
              targetYear={targetYear}
              showHeadroom={false}
            />
          ) : null}
          <p className="assumptions-line">
            Economic assumptions: {macroSummary.length > 0 ? macroSummary : "the OBR's March view"}{' '}
            · <StepLink to="/outlook">change</StepLink>
          </p>
          <Interventions items={advice} />

          <div className="layout">
            <div className="desk-column">
              <Desk
                groups={groups}
                moved={moved}
                effects={outcome.leverEffects}
                summaryYear={targetYear}
                open={openGroup ?? defaultGroup}
                onOpen={(name) => setOpenGroups((f) => ({ ...f, [step]: name }))}
              >
                {(group) => (
                  <>
                    {briefingsFor(spec.briefingStep, group.name).map((b) => (
                      <AdviserBriefing key={b.id} briefing={b} compact variant="body" />
                    ))}
                    {orderForDesk(group.levers).map((lever) => {
                      const value = state.leverValues[lever.code] ?? lever.control.default;
                      const report = chosen.get(lever.code);
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
                            chosen={
                              report
                                ? { title: report.option.title, state: report.state }
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
                {forward ? (
                  <StepLink to={forward.to} className="btn btn--primary">
                    {forward.label}
                  </StepLink>
                ) : null}
                {back ? (
                  <StepLink to={back.to} className={forward ? 'btn' : 'btn btn--primary'}>
                    {back.label}
                  </StepLink>
                ) : null}
              </p>
            </div>

            <aside className="working-notes" aria-label="Working notes">
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
                  Copy link to this budget
                </button>
                <span role="status" className="toolbar__note">
                  {copied ? 'Link copied' : ''}
                </span>
              </div>

              {state.warnings.length > 0 && (
                <div className="warnings warnings--link" role="status">
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
                  What each change does in {targetYear} to the current budget (day-to-day) and to
                  total borrowing, which adds investment. Better means less borrowing.
                </p>
                <AttributionList
                  rows={outcome.attribution}
                  baselineHeadroomGbpm={stability?.baseline.headroomGbpm ?? 0}
                  comparator={{
                    label: 'Budget 2025’s measures, for scale',
                    psnbGbpm: -budget2025NetGbpm(targetYear),
                  }}
                />
              </section>

              {paid.length > 0 || benefited.length > 0 ? (
                <section className="panel" aria-labelledby="who-pays-heading">
                  <h2 id="who-pays-heading">Who pays · who benefits</h2>
                  <ul className="who-pays">
                    {paid.slice(0, 3).map((r) => (
                      <li key={r.group}>
                        <span>{r.label}</span>
                        <span
                          className={`amount ${r.gbpm >= 0 ? 'amount--worse' : 'amount--better'}`}
                        >
                          {r.gbpm >= 0 ? 'pays ' : 'gains '}
                          {formatGbpBn(Math.abs(r.gbpm), 1)}
                        </span>
                      </li>
                    ))}
                    {benefited.slice(0, 3).map((r) => (
                      <li key={r.group}>
                        <span>{r.label}</span>
                        <span
                          className={`amount ${r.gbpm >= 0 ? 'amount--better' : 'amount--worse'}`}
                        >
                          {r.gbpm >= 0 ? 'receives ' : 'loses '}
                          {formatGbpBn(Math.abs(r.gbpm), 1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="panel__hint">
                    The engine’s figures in {targetYear}, totalled by the group each lever is tagged
                    with. <LabelBadge badge="mechanical" />
                  </p>
                </section>
              ) : null}

              <InteractionsNotice interactions={outcome.interactions} />

              {workings ? (
                <>
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
                </>
              ) : null}
            </aside>
          </div>
          {/* The charts want the full width: in the working notes their labels drew too small. */}
          {workings ? (
            <details className="panel details">
              <summary>
                <span className="details__title">Five-year paths</span>
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
          ) : null}
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
