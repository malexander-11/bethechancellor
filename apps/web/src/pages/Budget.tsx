import { formatGbpBn, formatPct } from '@btc/engine';
import { useState } from 'react';
import { AttributionList } from '../components/AttributionList';
import { LeverControl } from '../components/LeverControl';
import { PathChart } from '../components/PathChart';
import { PresetPicker } from '../components/PresetPicker';
import { VerdictCard } from '../components/VerdictCard';
import { households, leversByCategory, rules, vintage } from '../data';
import { useBudget } from '../state/budget';

const nextBudget = new Date(rules.assessment.nextFormalAssessmentOn).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function BudgetPage() {
  const { state, dispatch, outcome, query } = useBudget();
  const [copied, setCopied] = useState(false);
  const { paths } = outcome;
  const years = paths.years;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (paths.baseline.nominalGdpFy[lastYear] ?? 0);

  async function copyLink() {
    const url = `${window.location.origin}/b?${query}`;
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
    <>
      <h1 className="page-title">Set the assumptions. See if the rules hold.</h1>
      <p className="lede">
        Start from the Office for Budget Responsibility&rsquo;s March 2026 forecast, change what you
        believe about the economy, and watch the Chancellor&rsquo;s room for manoeuvre change. Every
        number tells you whether it is an official costing, a mechanical consequence, an assumption
        or commentary.
      </p>
      <div className="context-strip" role="note">
        <span>
          Baseline: <strong>{vintage.event}</strong>
        </span>
        <span>
          Rules: <strong>{rules.title}</strong>
        </span>
        <span>
          Next formal assessment: <strong>Budget, {nextBudget}</strong>
        </span>
      </div>

      <div className="layout">
        <aside>
          <section className="panel" aria-labelledby="assumptions-heading">
            <h2 id="assumptions-heading">Economic assumptions</h2>
            <p className="panel__hint">
              These are not policies. They replace the OBR&rsquo;s view of the economy with yours,
              using the OBR&rsquo;s own published sensitivities.
            </p>
            <PresetPicker
              onApply={(leverValues) => dispatch({ type: 'applyPreset', leverValues })}
              current={state.leverValues}
            />
            {leversByCategory.macro.map((lever) => (
              <LeverControl
                key={lever.id}
                lever={lever}
                value={state.leverValues[lever.code] ?? lever.control.default}
                effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                onChange={(value) => dispatch({ type: 'setLever', code: lever.code, value })}
              />
            ))}
          </section>

          <section className="panel" aria-labelledby="tax-heading">
            <h2 id="tax-heading">Tax</h2>
            {leversByCategory.tax.length === 0 ? (
              <p className="coming">
                Tax levers (income tax, National Insurance, VAT, corporation tax, capital taxes,
                duties) arrive in the next release, costed from HMRC&rsquo;s ready reckoner and
                Treasury policy costings.
              </p>
            ) : (
              leversByCategory.tax.map((lever) => (
                <LeverControl
                  key={lever.id}
                  lever={lever}
                  value={state.leverValues[lever.code] ?? lever.control.default}
                  effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                  onChange={(value) => dispatch({ type: 'setLever', code: lever.code, value })}
                />
              ))
            )}
          </section>

          <section className="panel" aria-labelledby="spend-heading">
            <h2 id="spend-heading">Spending</h2>
            {leversByCategory.spend.length === 0 ? (
              <p className="coming">
                Departmental budgets, investment and welfare levers follow, built from the Spending
                Review 2025 settlements and the OBR welfare forecast.
              </p>
            ) : (
              leversByCategory.spend.map((lever) => (
                <LeverControl
                  key={lever.id}
                  lever={lever}
                  value={state.leverValues[lever.code] ?? lever.control.default}
                  effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                  onChange={(value) => dispatch({ type: 'setLever', code: lever.code, value })}
                />
              ))
            )}
          </section>
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

          <section
            className="panel"
            aria-labelledby="attribution-heading"
            style={{ marginTop: 16 }}
          >
            <h2 id="attribution-heading">What moved the {targetYear} current budget</h2>
            <p className="panel__hint">
              Each line is the effect on day-to-day borrowing in the stability rule&rsquo;s target
              year. Positive means the position gets worse.
            </p>
            <AttributionList
              rows={outcome.attribution}
              baselineHeadroomGbpm={
                outcome.verdicts.find((v) => v.kind === 'currentBudget')?.baseline.headroomGbpm ?? 0
              }
            />
          </section>

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

          <section aria-labelledby="charts-heading" style={{ marginTop: 16 }}>
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
        </div>
      </div>
    </>
  );
}
