import {
  ambitionStatus,
  assembleSpeech,
  budgetVerdict,
  describeAssumptions,
  distributionalNotes,
  FINAL_STAGE,
  formatGbpBn,
  formatPct,
  householdReactions,
  rankedPriorities,
  readings,
  receptions,
  THIN_HEADROOM_GBPM,
  type BudgetVerdict,
  type Outcome,
} from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { ClosingNotes } from '../components/ClosingNotes';
import { Households } from '../components/Households';
import { InteractionsNotice } from '../components/InteractionsNotice';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { formatLeverValue } from '../components/LeverControl';
import { MeasuresTable } from '../components/MeasuresTable';
import { PathChart } from '../components/PathChart';
import { ReceptionCard } from '../components/ReceptionCard';
import { Speech } from '../components/Speech';
import { Verdict } from '../components/Verdict';
import { VerdictCard } from '../components/VerdictCard';
import {
  ESTIMATE,
  MACRO_CODES,
  briefingsFor,
  electorate,
  households,
  incidence,
  levers,
  leversByCategory,
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
import { WorkingsOnly } from '../journey/workings';
import { onEstimate, useBudget } from '../state/budget';

/** "a, b and c" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function lowerFirst(s: string): string {
  return s.replace(/^./, (c) => c.toLowerCase());
}

/**
 * The Budget in three sentences: what was prioritised, who pays, what was accepted or kept. Every
 * clause is read from the engine's figures and the player's own choices: the ranked priorities'
 * nouns, the largest payers by the incidence tags, and the most consequential thing given up, in
 * this order: a rule missed, a promise broken, a promise strained, a thin margin; with none of
 * those, what was kept.
 */
function statementOf(
  game: NonNullable<ReturnType<typeof useBudget>['state']['game']>,
  outcome: Outcome,
  verdict: BudgetVerdict,
  status: ReturnType<typeof ambitionStatus>,
): { prioritised: string; paid: string; accepted: string } {
  const nouns = rankedPriorities(game, pm).map((p) => p.noun);
  const prioritised =
    nouns.length > 0
      ? `I prioritised ${list(nouns)}.`
      : 'I set no priorities with the Prime Minister.';
  const payers = verdict.paid.filter((r) => r.gbpm > 0).slice(0, 2);
  const losers = verdict.benefited.filter((r) => r.gbpm < 0).slice(0, 2);
  const paid =
    payers.length > 0
      ? `I paid for it by asking ${list(payers.map((r) => lowerFirst(r.label)))}.`
      : losers.length > 0
        ? `I paid for it with less for ${list(losers.map((r) => lowerFirst(r.label)))}.`
        : 'I paid for it out of the headroom I had.';
  const missed = outcome.verdicts.filter(isMissed);
  const broken = status.promises.filter((p) => !p.kept);
  const brokenIds = new Set(broken.map((p) => p.promise.id));
  const strained = status.strains.filter((s) => s.strained && !brokenIds.has(s.promise.id));
  const headroom = formatGbpBn(verdict.headroomGbpm, 1);
  const accepted =
    missed.length > 0
      ? `I accepted missing ${list(missed.map(missedBy))}.`
      : broken.length > 0
        ? `I accepted breaking ${list(broken.map((p) => lowerFirst(p.promise.title)))}.`
        : strained.length > 0
          ? `I accepted straining ${list(strained.map((p) => lowerFirst(p.promise.title)))}.`
          : verdict.headroomGbpm < THIN_HEADROOM_GBPM
            ? `I accepted a thin margin: ${headroom} of headroom.`
            : `I kept every promise and ${headroom} of headroom.`;
  return { prioritised, paid, accepted };
}

/**
 * Step 6: feedback, on one screen. The Budget in three sentences; the rules line, which is the one
 * thing here that is arithmetic; the backbenchers, the markets and the public, each rating the
 * Budget out of five and saying which choices caused it; and the close, with the ambitions and who
 * paid. The speech, the households and the Budget documents are one fold away. Arriving here marks
 * the game finished, so a link shared from here opens as a finished Budget.
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
  // The economy the Budget was built on: today's estimate in a game; a sandbox may set its own.
  const economy = describeAssumptions(state.leverValues, ESTIMATE, MACRO_CODES);
  const ownFigures = onEstimate(state.leverValues)
    ? ''
    : leversByCategory.macro
        .map((l) => ({ lever: l, value: state.leverValues[l.code] ?? l.control.default }))
        .filter((x) => x.value !== x.lever.control.default)
        .map((x) => `${x.lever.shortTitle} ${formatLeverValue(x.lever, x.value)}`)
        .join(' · ');

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
  // A game in play that jumps to Budget day is sent back to where it is; a sandbox link and a
  // finished, shared link both walk in.
  if (guard) return guard;
  const statement = game && verdict && status ? statementOf(game, outcome, verdict, status) : null;

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

  const toBn = (values: Record<string, number>) => years.map((y) => (values[y] ?? 0) / 1000);
  const surplus = (values: Record<string, number>) => years.map((y) => -(values[y] ?? 0) / 1000);

  return (
    <JourneyLayout step="budget-day">
      {statement ? (
        <section className="statement doc" aria-labelledby="statement-heading">
          <h2 id="statement-heading" className="section-label">
            Your Budget, in three sentences <LabelBadge badge="mechanical" />
          </h2>
          <p className="statement__line">{statement.prioritised}</p>
          <p className="statement__line">{statement.paid}</p>
          <p className="statement__line">{statement.accepted}</p>
        </section>
      ) : null}
      <p className="rules-line">
        <LabelBadge badge="mechanical" /> {rulesLine}
      </p>
      <div className="receptions">
        {room.map((r) => (
          <ReceptionCard
            key={r.audience}
            reception={r}
            notes={r.audience === 'public' ? notes : undefined}
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
            <p className="source">
              Economic assumptions: {economy}
              {ownFigures ? ` (${ownFigures})` : ''}.
            </p>
            <ul className="documents">
              <li>
                <strong>Economic and fiscal outlook.</strong> The OBR publishes its own forecast
                beside the Budget; this game uses {economy} in its place.
              </li>
              <li>
                <strong>Policy costings.</strong> One note per measure with the method behind it:
                the detail and sources under each lever, with the workings on.
              </li>
            </ul>
          </section>
          <WorkingsOnly>
            <details className="panel">
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
                {outcome.verdicts.map((v) => (
                  <VerdictCard
                    key={v.ruleId}
                    verdict={v}
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
                <span className="details__title">Five-year paths</span>
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
          </WorkingsOnly>
        </div>
      </details>

      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={copyLink}>
          Copy a link to this Budget
        </button>
        <StepLink to={game ? '/review' : '/budget/taxes'} className="btn">
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
