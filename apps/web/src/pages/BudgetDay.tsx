import { formatGbpBn, formatPct } from '@btc/engine';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { ClosingNotes } from '../components/ClosingNotes';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { JourneyLayout } from '../components/JourneyLayout';
import { formatLeverValue } from '../components/LeverControl';
import { MeasuresTable } from '../components/MeasuresTable';
import { PathChart } from '../components/PathChart';
import { Scorecard } from '../components/Scorecard';
import { VerdictCard } from '../components/VerdictCard';
import { briefingsFor, households, levers, leversByCategory, vintage } from '../data';
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
      <h1 className="page-title">Step 3 · Budget day</h1>
      <p className="lede">
        Wednesday 28 October 2026. {met} of {outcome.verdicts.length} tests pass on your figures.
      </p>
      <section aria-labelledby="verdicts-heading">
        <h2 id="verdicts-heading" className="sr-only">
          Fiscal rule verdicts
        </h2>
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
      </section>
      <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} />
      {briefingsFor('budget-day').map((b) => (
        <AdviserBriefing key={b.id} briefing={b} compact />
      ))}
      <section className="panel" aria-labelledby="measures-heading">
        <h2 id="measures-heading">Your measures</h2>
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
      </section>
      <section className="panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">What your advisers want on the record</h2>
        <ClosingNotes outcome={outcome} levers={levers} />
      </section>
      <InteractionsNotice interactions={outcome.interactions} />
      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">
          Five-year paths
        </h2>
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
      </section>
      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy a link to this Budget'}
        </button>
        <StepLink to="/budget/taxes" className="btn">
          Back to taxes and spending
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
    </JourneyLayout>
  );
}
