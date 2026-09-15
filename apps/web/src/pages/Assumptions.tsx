import { AdviserBriefing } from '../components/AdviserBriefing';
import { AssumptionReading, ContextRow } from '../components/AssumptionsTable';
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
          if (!lever) return null;
          return (
            <AssumptionReading
              key={reading.id}
              reading={reading}
              lever={lever}
              value={state.leverValues[lever.code] ?? lever.control.default}
              effect={outcome.leverEffects.find((e) => e.code === lever.code)}
              summaryYear={targetYear}
              onChange={(value) => dispatch({ type: 'setLever', code: lever.code, value })}
            />
          );
        })}
      </div>
      <details className="panel">
        <summary className="group__head">
          <span className="group__line">
            <span className="group__name">Also changed since March</span>
            <span className="group__count">
              {context.readings.filter((r) => !r.leverCode).length}
            </span>
          </span>
          <span className="group__say">No slider here: context for the numbers above.</span>
        </summary>
        <div className="table-scroll">
          <table className="measures">
            <thead>
              <tr>
                <th>Reading</th>
                <th>OBR in March</th>
                <th>Latest</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {context.readings
                .filter((r) => !r.leverCode)
                .map((r) => (
                  <ContextRow key={r.id} reading={r} />
                ))}
            </tbody>
          </table>
        </div>
      </details>
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
