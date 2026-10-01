import { ambitionStatus, FINAL_STAGE, householdReactions, receptions } from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Households } from '../components/Households';
import { JourneyLayout } from '../components/JourneyLayout';
import { ReceptionCard } from '../components/ReceptionCard';
import { electorate, incidence, levers, pm, reception, vintage, options } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { isMissed, missedBy } from '../journey/rules';
import { useBudget } from '../state/budget';

/** "a, b and c" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Step 6: feedback, on one screen. The rules line, which is the one thing here that is arithmetic;
 * the backbenchers, the markets and the public, each rating the Budget out of five and saying
 * which choices caused it. The households are one fold away.
 * Arriving here marks the game finished, so a link shared from here opens as a finished Budget.
 */
export function BudgetDayPage() {
  const { state, dispatch, outcome, query } = useBudget();
  const outcomeOf = useOutcomeOf();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const guard = useStageGuard('budget-day');
  const game = state.game;
  const { paths } = outcome;
  const years = paths.years;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = years[years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (paths.baseline.nominalGdpFy[lastYear] ?? 0);

  // The game's readings: ambitions against the package, and the package as the OBR saw it.
  const status = useMemo(
    () => (game ? ambitionStatus(game, pm, options, outcome, levers) : undefined),
    [game, outcome],
  );
  const room = useMemo(
    () =>
      receptions({
        outcome,
        levers,
        reception,
        typicalErrorGbpm,
        outcomeOf,
        pm,
        incidence,
        ...(game ? { game } : {}),
        ...(status ? { status } : {}),
      }),
    [outcome, typicalErrorGbpm, game, status, outcomeOf],
  );
  // The one audience that is arithmetic: the rules, in a line above the three cards, by their
  // plain names and the engine's own margins (Phase 25). The welfare cap is named when missed.
  const missedRules = outcome.verdicts.filter(isMissed);
  const rulesLine =
    missedRules.length === 0
      ? 'You meet both fiscal rules on these numbers.'
      : missedRules.every((v) => v.kind === 'welfareCap')
        ? `You meet both fiscal rules on these numbers, but miss ${list(missedRules.map(missedBy))}.`
        : `Missed on these numbers: ${list(missedRules.map(missedBy))}.`;
  const sizeOf = (code: string) => {
    const e = outcome.leverEffects.find((x) => x.code === code);
    if (!e) return 0;
    return (
      Math.abs(e.receipts[targetYear] ?? 0) +
      Math.abs(e.currentSpending[targetYear] ?? 0) +
      Math.abs(e.capitalSpending[targetYear] ?? 0)
    );
  };
  const voters = householdReactions(
    electorate,
    outcome.settings.leverValues,
    levers,
    sizeOf,
    status ?? null,
    (game?.priorities.length ?? 0) > 0,
    incidence,
  );
  // Arriving here is the end of the story: a link shared from here opens as a finished Budget.
  // Not when the guard is sending the player back to where they are.
  const reached = game?.reached;
  useEffect(() => {
    if (!guard && game && reached !== undefined && reached < FINAL_STAGE) {
      dispatch({ type: 'updateGame', patch: { reached: FINAL_STAGE } });
    }
  }, [guard, game, reached, dispatch]);
  // A game in play that jumps to Budget day is sent back to where it is; a finished, shared link
  // walks in. With no game there is no Budget day: the guard sends the link to the briefing.
  if (guard) return guard;

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

  return (
    <JourneyLayout step="budget-day">
      <p className="rules-line">{rulesLine}</p>
      <div className="receptions">
        {room.map((r) => (
          <ReceptionCard key={r.audience} reception={r} />
        ))}
      </div>

      <details className="more">
        <summary>Who feels it: five households</summary>
        <div className="more__body">
          <Households reactions={voters} />
        </div>
      </details>

      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={copyLink}>
          Copy a link to this Budget
        </button>
        <StepLink to="/review" className="btn">
          Change something
        </StepLink>
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: 'reset' });
            navigate('/');
          }}
        >
          Play again
        </button>
        <span role="status" className="actions__hint">
          {copied ? 'Link copied' : ''}
        </span>
      </p>
    </JourneyLayout>
  );
}
