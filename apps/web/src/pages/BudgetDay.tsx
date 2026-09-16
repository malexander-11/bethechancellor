import { computeReactions, distributionalNotes, formatGbpBn, formatPct } from '@btc/engine';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { ClosingNotes } from '../components/ClosingNotes';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { JourneyLayout } from '../components/JourneyLayout';
import { formatLeverValue } from '../components/LeverControl';
import { MeasuresTable } from '../components/MeasuresTable';
import { PathChart } from '../components/PathChart';
import { ReactionPanel } from '../components/ReactionPanel';
import { Scorecard } from '../components/Scorecard';
import { VerdictCard } from '../components/VerdictCard';
import { briefingsFor, households, levers, leversByCategory, reactions, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

export function BudgetDayPage() {
  const { state, dispatch, outcome, query } = useBudget();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { paths } = outcome;
  const years = paths.years;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const macro = leversByCategory.macro
    .map((l) => ({ lever: l, value: state.leverValues[l.code] ?? l.control.default }))
    .filter((x) => x.value !== x.lever.control.default);
  const met = outcome.verdicts.filter((v) => ['met', 'withinCap'].includes(v.status)).length;
  const signals = computeReactions({ outcome, levers, reactions, typicalErrorGbpm });
  const notes = distributionalNotes(outcome, levers, targetYear).slice(0, 3);

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
    <JourneyLayout step="budget-day">
      <h1 className="page-title">Step 4 · Budget day</h1>
      <p className="lede">
        Wednesday 28 October 2026. {reactions.intro} {met} of {outcome.verdicts.length} tests pass
        on your figures.
      </p>
      <Beats step="budget-day">
        <Beat title="The box opens, and the room reacts" continueLabel="See the workings">
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} />
          <div className="reactions">
            <ReactionPanel audience="rules" signals={signals} />
            <ReactionPanel audience="markets" signals={signals} />
            <ReactionPanel audience="parliament" signals={signals} />
            <ReactionPanel audience="public" signals={signals} notes={notes} />
          </div>
        </Beat>
        <Beat title="The workings behind the verdict">
          <details className="panel" aria-labelledby="verdicts-heading">
            <summary className="group__head">
              <span className="group__line">
                <span className="group__name">The rules in full</span>
                <span className="group__count">{outcome.verdicts.length}</span>
              </span>
              <span className="group__say">
                What each rule requires, the margin, and what it is worth per household.
              </span>
            </summary>
            <div className="verdicts">
              {outcome.verdicts.map((verdict) => (
                <VerdictCard
                  key={verdict.ruleId}
                  verdict={verdict}
                  householdCount={households.value}
                  typicalErrorGbpm={typicalErrorGbpm}
                />
              ))}
            </div>
          </details>
          {briefingsFor('budget-day').map((b) => (
            <AdviserBriefing key={b.id} briefing={b} compact />
          ))}
          <details className="panel">
            <summary className="group__head">
              <span className="group__line">
                <span className="group__name">Your measures</span>
                <span className="group__count">{outcome.leverEffects.length}</span>
              </span>
              <span className="group__say">
                Every lever you moved, and what it does in {targetYear}.
              </span>
            </summary>
            <MeasuresTable outcome={outcome} levers={levers} targetYear={targetYear} />
            <p className="source">
              Economic assumptions:{' '}
              {macro.length > 0
                ? macro
                    .map((x) => `${x.lever.shortTitle} ${formatLeverValue(x.lever, x.value)}`)
                    .join(' · ')
                : "the OBR's March view"}
              {' · '}
              <StepLink to="/assumptions">change</StepLink>
            </p>
          </details>
          <details className="panel">
            <summary className="group__head">
              <span className="group__line">
                <span className="group__name">What your advisers want on the record</span>
              </span>
              <span className="group__say">
                The caveats attached to the measures you chose, in their own words.
              </span>
            </summary>
            <ClosingNotes outcome={outcome} levers={levers} />
          </details>
          <InteractionsNotice interactions={outcome.interactions} />
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
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={copyLink}>
              {copied ? 'Link copied' : 'Copy a link to this Budget'}
            </button>
            <StepLink to="/budget/taxes" className="btn">
              Back to taxes and spending
            </StepLink>
            <StepLink to="/recommendations" className="btn">
              Back to your colleagues
            </StepLink>
            <button
              type="button"
              className="btn"
              onClick={() => {
                dispatch({ type: 'reset' });
                navigate('/');
              }}
            >
              Start again
            </button>
          </div>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
