import {
  ambitionStatus,
  FINAL_STAGE,
  householdReactions,
  receptions,
  typicalErrorGbpm,
} from '@btc/engine';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Households } from '../components/Households';
import { JourneyLayout } from '../components/JourneyLayout';
import { ReceptionCard } from '../components/ReceptionCard';
import { PostToBoard } from '../components/PostToBoard';
import { SharePanel } from '../components/SharePanel';
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
 * which choices caused it; five households, each saying what the Budget did to it (ADR-0043); the
 * Budget as a picture to share, whose link invites whoever opens it to play; and, once it is open,
 * a way onto the leaderboard under a title (ADR-0044).
 * Arriving here marks the game finished, so a link to it opens as a finished Budget.
 */
export function BudgetDayPage() {
  const { state, dispatch, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const navigate = useNavigate();
  const guard = useStageGuard('budget-day');
  const game = state.game;
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const typicalError = typicalErrorGbpm(vintage, outcome);

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
        typicalErrorGbpm: typicalError,
        outcomeOf,
        pm,
        incidence,
        ...(game ? { game } : {}),
        ...(status ? { status } : {}),
      }),
    [outcome, typicalError, game, status, outcomeOf],
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

  return (
    <JourneyLayout step="budget-day">
      <p className="rules-line">{rulesLine}</p>
      <div className="receptions">
        {room.map((r) => (
          <ReceptionCard key={r.audience} reception={r} />
        ))}
      </div>

      <section aria-labelledby="households-heading">
        <h2 id="households-heading" className="section-label">
          Who feels it: five households
        </h2>
        <Households reactions={voters} />
      </section>

      <SharePanel />
      <PostToBoard />

      <p className="actions">
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
      </p>
    </JourneyLayout>
  );
}
