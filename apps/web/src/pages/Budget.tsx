import { formatGbpBn, formatPct } from '@btc/engine';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { AttributionList } from '../components/AttributionList';
import { Desk } from '../components/Desk';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { JourneyLayout } from '../components/JourneyLayout';
import { LeverControl, formatLeverValue } from '../components/LeverControl';
import { PathChart } from '../components/PathChart';
import { PresetPicker } from '../components/PresetPicker';
import { Scorecard } from '../components/Scorecard';
import {
  briefingsFor,
  context,
  groupLevers,
  levers,
  leversByCategory,
  rules,
  vintage,
} from '../data';
import { Beat, Beats } from '../journey/beats';
import { StepLink } from '../journey/links';
import { describeAssumptions, macroCodesOf, scenarioCards } from '../journey/scenarios';
import { useBudget } from '../state/budget';

const ASSUMPTION_CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

const nextBudget = new Date(rules.assessment.nextFormalAssessmentOn).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function BudgetPage() {
  const { tab } = useParams();
  const { state, dispatch, outcome, query } = useBudget();
  const [copied, setCopied] = useState(false);
  if (tab !== 'taxes' && tab !== 'spending') {
    return (
      <Navigate to={{ pathname: '/budget/taxes', search: query ? `?${query}` : '' }} replace />
    );
  }
  const step = tab;
  const items = step === 'taxes' ? leversByCategory.tax : leversByCategory.spend;
  const { paths } = outcome;
  const years = paths.years;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
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
    describeAssumptions(ASSUMPTION_CARDS, state.leverValues, MACRO_CODES) ??
    leversByCategory.macro
      .map((l) => ({ lever: l, value: state.leverValues[l.code] ?? l.control.default }))
      .filter((x) => x.value !== x.lever.control.default)
      .map((x) => `${x.lever.shortTitle} ${formatLeverValue(x.lever, x.value)}`)
      .join(' · ');

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

  return (
    <JourneyLayout step={step}>
      <h1 className="page-title">Step 2 · Set taxes and spending</h1>
      <p className="lede">
        Each control shows what it moves to. Every number carries a badge saying where it came from.
      </p>
      <Beats step={step}>
        <Beat
          title={
            step === 'taxes'
              ? 'The Director of Tax hands you the tax file'
              : 'The Director of Public Spending hands you the spending file'
          }
          continueLabel="Open the file"
          foldWhenPast={
            step === 'taxes'
              ? 'The Director of Tax’s briefing'
              : 'The Director of Public Spending’s briefing'
          }
        >
          {briefingsFor(step).map((b) => (
            <AdviserBriefing key={b.id} briefing={b} />
          ))}
        </Beat>
        <Beat title={step === 'taxes' ? 'Set the taxes' : 'Set the spending'}>
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} sticky />
          <p className="assumptions-line">
            Economic assumptions: {macroSummary.length > 0 ? macroSummary : "the OBR's March view"}{' '}
            · <StepLink to="/assumptions">change</StepLink>
          </p>
          <nav className="tabs" aria-label="Taxes or spending">
            <StepLink
              to="/budget/taxes"
              className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}
            >
              Taxes
            </StepLink>
            <StepLink
              to="/budget/spending"
              className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}
            >
              Spending
            </StepLink>
          </nav>

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
                    {briefingsFor(step, group.name).map((b) => (
                      <AdviserBriefing key={b.id} briefing={b} compact variant="body" />
                    ))}
                    {group.levers.map((lever) => (
                      <LeverControl
                        key={lever.id}
                        lever={lever}
                        value={state.leverValues[lever.code] ?? lever.control.default}
                        effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                        summaryYear={targetYear}
                        onChange={(value) =>
                          dispatch({ type: 'setLever', code: lever.code, value })
                        }
                      />
                    ))}
                  </>
                )}
              </Desk>
              <p className="hero-start__actions">
                {step === 'taxes' ? (
                  <StepLink to="/budget/spending" className="btn btn--primary">
                    Next: spending
                  </StepLink>
                ) : (
                  <StepLink to="/recommendations" className="btn btn--primary">
                    Next: what your colleagues want
                  </StepLink>
                )}
              </p>
            </aside>

            <div>
              <div className="toolbar">
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
                <h2 id="attribution-heading">
                  What moved the {targetYear} current budget and borrowing
                </h2>
                <p className="panel__hint">
                  Each line is the effect in the stability rule&rsquo;s target year on the current
                  budget (day-to-day borrowing) and on total borrowing, which adds investment.
                  Positive means the position gets worse.
                </p>
                <AttributionList
                  rows={outcome.attribution}
                  baselineHeadroomGbpm={
                    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.baseline
                      .headroomGbpm ?? 0
                  }
                />
              </section>

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
            </div>
          </div>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
