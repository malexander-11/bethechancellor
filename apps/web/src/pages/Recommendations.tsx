import { formatGbpBn } from '@btc/engine';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { JourneyLayout } from '../components/JourneyLayout';
import { LeverControl } from '../components/LeverControl';
import { Scorecard } from '../components/Scorecard';
import { briefingsFor, leversByCategory, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

/**
 * The last step before Budget day: eleven policies colleagues in Parliament are campaigning for,
 * each costed and each caveated. Adopting one is a toggle, so the scorecard moves as you read.
 */
export function RecommendationsPage() {
  const { state, dispatch, outcome } = useBudget();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = outcome.paths.years[outcome.paths.years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const items = leversByCategory.campaign;
  const adopted = items.filter(
    (l) => (state.leverValues[l.code] ?? l.control.default) !== l.control.default,
  );
  const total = adopted.reduce((sum, l) => {
    const effect = outcome.leverEffects.find((e) => e.code === l.code);
    if (!effect) return sum;
    return (
      sum +
      (effect.currentSpending[targetYear] ?? 0) +
      (effect.capitalSpending[targetYear] ?? 0) -
      (effect.receipts[targetYear] ?? 0)
    );
  }, 0);

  return (
    <JourneyLayout step="recommendations">
      <h1 className="page-title">Step 3 &middot; What your colleagues want</h1>
      <p className="lede">
        Eleven policies MPs are campaigning for. Adopt the ones you want. Every cost here is our own
        arithmetic, not an official costing.
      </p>
      <Beats step="recommendations">
        <Beat
          title="A bundle of letters arrives from your colleagues"
          continueLabel="Read the letters"
          foldWhenPast="What your advisers said about these letters"
        >
          <div className="briefing-row">
            {briefingsFor('recommendations').map((b) => (
              <AdviserBriefing key={b.id} briefing={b} compact />
            ))}
          </div>
        </Beat>
        <Beat title="The eleven policies, and what each would cost">
          <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} sticky />
          <p className="adopted-line" role="status">
            {adopted.length === 0
              ? 'Nothing adopted yet. Adopting one is a toggle; the scorecard moves as you read.'
              : `${adopted.length} adopted · ${
                  total >= 0 ? 'costing' : 'raising'
                } ${formatGbpBn(Math.abs(total), 1)} in ${targetYear}`}
          </p>
          <div className="cards">
            {items.map((lever) => (
              <LeverControl
                key={lever.id}
                lever={lever}
                value={state.leverValues[lever.code] ?? lever.control.default}
                effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                summaryYear={targetYear}
                onChange={(value) => dispatch({ type: 'setLever', code: lever.code, value })}
              />
            ))}
          </div>
          <p className="hero-start__actions">
            <StepLink to="/budget/spending" className="btn">
              Back to spending
            </StepLink>
            <StepLink to="/budget-day" className="btn btn--primary">
              Go to Budget day
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
