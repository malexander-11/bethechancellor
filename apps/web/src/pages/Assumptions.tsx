import { AdviserBriefing } from '../components/AdviserBriefing';
import { AssumptionReading } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Scorecard } from '../components/Scorecard';
import { adviserById, briefingsFor, context, levers, vintage } from '../data';
import { StepLink } from '../journey/links';
import { suggestedSettings } from '../journey/suggest';
import { useBudget } from '../state/budget';

export function AssumptionsPage() {
  const { state, dispatch, outcome } = useBudget();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = outcome.paths.years[outcome.paths.years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const macroCodes = context.readings.map((r) => r.leverCode).filter((c): c is string => !!c);
  const suggested = suggestedSettings(context.readings, levers);
  const obrView = Object.fromEntries(
    macroCodes.map((code) => [code, levers.find((l) => l.code === code)?.control.default ?? 0]),
  );
  const adviser = adviserById.get(context.adviser);
  return (
    <JourneyLayout step="assumptions">
      <h1 className="page-title">Step 1 · Confirm the assumptions</h1>
      <p className="lede">{context.intro}</p>
      <p className="source">
        {adviser?.role ?? context.adviser} · readings as of {context.asOf} ·{' '}
        <LabelBadge badge="assumption" />
      </p>
      <div className="toolbar">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => dispatch({ type: 'setLevers', values: suggested })}
        >
          Take the advisers&rsquo; view
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'setLevers', values: obrView })}
        >
          Keep the OBR&rsquo;s March view
        </button>
      </div>
      <div className="readings">
        {context.readings.map((reading) => {
          const lever = reading.leverCode
            ? levers.find((l) => l.code === reading.leverCode)
            : undefined;
          return (
            <AssumptionReading
              key={reading.id}
              reading={reading}
              lever={lever}
              value={lever ? (state.leverValues[lever.code] ?? lever.control.default) : undefined}
              effect={lever ? outcome.leverEffects.find((e) => e.code === lever.code) : undefined}
              summaryYear={targetYear}
              onChange={
                lever
                  ? (value) => dispatch({ type: 'setLever', code: lever.code, value })
                  : undefined
              }
            />
          );
        })}
      </div>
      {briefingsFor('assumptions').map((b) => (
        <AdviserBriefing key={b.id} briefing={b} />
      ))}
      <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} />
      <p className="hero-start__actions">
        <StepLink to="/budget/taxes" className="btn btn--primary">
          Confirm and go to taxes
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
