import {
  ambitionStatus,
  assembleSpeech,
  budgetVerdict,
  distributionalNotes,
  FINAL_STAGE,
  formatGbpBn,
  growthNote,
  householdReactions,
  preBudget,
  readings,
  receptions,
  reconcile,
} from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Households } from '../components/Households';
import { JourneyLayout } from '../components/JourneyLayout';
import { MeasuresTable } from '../components/MeasuresTable';
import { ReceptionCard, type EconomyLine } from '../components/ReceptionCard';
import { Speech } from '../components/Speech';
import { Verdict } from '../components/Verdict';
import {
  MACRO_CODES,
  electorate,
  incidence,
  levers,
  pm,
  reception,
  speech as speechFile,
  verdicts,
  vintage,
  options,
} from '../data';
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
 * which choices caused it; and the close, with the ambitions and who paid. The speech, the
 * households and the Budget documents are one fold away. Arriving here marks the game finished, so
 * a link shared from here opens as a finished Budget.
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
  const notes = distributionalNotes(outcome, levers, targetYear).slice(0, 3);
  // The markets' fold on the wider economy (Phase 25): growth in words, from the biggest measure
  // that has a note on it; and, when the Budget borrows more, what that costs in interest.
  const growth = growthNote(outcome, levers, targetYear);
  const interestGbpm = useMemo(
    () => reconcile(outcome, preBudget(outcomeOf, state.leverValues, levers)).interestGbpm,
    [outcome, outcomeOf, state.leverValues],
  );
  const wider: EconomyLine[] = [
    ...(growth
      ? [
          {
            key: 'growth',
            ...(growth.leverId ? { lead: growth.leverTitle } : {}),
            text: growth.text,
            sources: growth.sources,
          },
        ]
      : []),
    ...(interestGbpm >= 50
      ? [
          {
            key: 'interest',
            text: `Extra borrowing adds about ${formatGbpBn(interestGbpm, 1)} a year to debt interest by ${targetYear}.`,
            sources: [],
          },
        ]
      : []),
  ];
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
  const theSpeech = useMemo(
    () =>
      assembleSpeech({
        speech: speechFile,
        outcome,
        levers,
        ...(game ? { game } : {}),
        pm,
        ...(status ? { status } : {}),
        macroCodes: MACRO_CODES,
        outcomeOf,
      }),
    [outcome, game, status, outcomeOf],
  );
  // The options on in the package, for what the money does and does not buy.
  const deliveredOptions = (status?.priorities ?? []).flatMap((p) =>
    p.options.filter((o) => o.state === 'on'),
  );
  // The close: what the playthrough came to.
  const verdict = useMemo(() => {
    if (!game) return undefined;
    const values = readings({
      outcome,
      levers,
      typicalErrorGbpm,
      outcomeOf,
      game,
      ...(status ? { status } : {}),
    });
    return budgetVerdict({
      levers,
      pm,
      options,
      incidence,
      kinds: verdicts,
      game,
      outcome,
      typicalErrorGbpm,
      credibilityShare: values.credibilityShare ?? 0,
      rebellionRisk: values.rebellionRisk ?? 0,
      outcomeOf,
    });
  }, [game, outcome, status, typicalErrorGbpm, outcomeOf]);
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
          <ReceptionCard
            key={r.audience}
            reception={r}
            notes={r.audience === 'public' ? notes : undefined}
            economy={r.audience === 'markets' ? wider : undefined}
          />
        ))}
      </div>
      {verdict ? <Verdict verdict={verdict} /> : null}

      <details className="more">
        <summary>Read the speech</summary>
        <div className="more__body">
          <Speech speech={theSpeech} />
        </div>
      </details>
      <details className="more">
        <summary>Who feels it: five households</summary>
        <div className="more__body">
          <Households reactions={voters} />
          {deliveredOptions.length > 0 ? (
            <section className="panel" aria-labelledby="delivery-heading">
              <h3 id="delivery-heading" className="section-label">
                What the money does and does not buy
              </h3>
              <ul className="delivery">
                {deliveredOptions.map((o) => (
                  <li key={o.option.id}>
                    <strong>{o.option.title}.</strong> {o.option.line.text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </details>
      <details className="more">
        <summary>Budget documents</summary>
        <div className="more__body">
          <section className="panel" aria-labelledby="documents-heading">
            <h3 id="documents-heading" className="section-label">
              What the Treasury publishes
            </h3>
            <p className="panel__hint">
              What the Treasury publishes as the Chancellor sits down: the Red Book with its table
              of policy decisions, the OBR’s forecast beside it, and a costing note for every
              measure.
            </p>
            <h4 className="section-label">Table 4.1: your policy decisions</h4>
            <MeasuresTable outcome={outcome} levers={levers} targetYear={targetYear} />
            {/* Every game is played on today's estimate (ADR-0025). */}
            <p className="source">Economic assumptions: today’s estimate.</p>
            <ul className="documents">
              <li>
                <strong>Economic and fiscal outlook.</strong> The OBR publishes its own forecast
                beside the Budget; this game uses today’s estimate in its place.
              </li>
              <li>
                <strong>Policy costings.</strong> One note per measure with the method behind it:
                here, what each lever assumes, under its card on the fine-tune screens; the About
                page lists every source.
              </li>
            </ul>
          </section>
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
