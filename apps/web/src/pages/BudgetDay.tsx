import {
  ambitionStatus,
  assembleSpeech,
  budgetVerdict,
  computeOutcome,
  distributionalNotes,
  FINAL_STAGE,
  formatGbpBn,
  formatPct,
  freshGame,
  householdReactions,
  rankedPriorities,
  readings,
  receptions,
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
  briefingsFor,
  context,
  draws,
  electorate,
  households,
  incidence,
  levers,
  leversByCategory,
  pm,
  reception,
  rules,
  speech as speechFile,
  verdicts,
  vintage,
  options,
} from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { describeAssumptions, macroCodesOf, scenarioCards } from '../journey/scenarios';
import { WorkingsOnly } from '../journey/workings';
import { permalinkQuery, useBudget } from '../state/budget';

const ASSUMPTION_CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

/** "a, b and c" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function lowerFirst(s: string): string {
  return s.replace(/^./, (c) => c.toLowerCase());
}

/**
 * The Budget in three sentences: what was prioritised, who pays, what was accepted. Every clause
 * is read from the engine's figures and the player's own choices: the ranked priorities' nouns,
 * the largest payers by the incidence tags, and the most consequential thing given up, in this
 * order: a rule missed, a promise broken, a target not kept, a measure moved after the forecast.
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
        : 'I paid for it out of the headroom the forecast left.';
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const broken = status.promises.filter((p) => !p.kept);
  const target = game.headroomTargetBn * 1000;
  // A measure moved since the OBR saw the package, the add-ons aside: they are announcements.
  const addOnCodes = new Set(
    options.addOns.filter((o) => game.rabbit.includes(o.id)).flatMap((o) => Object.keys(o.values)),
  );
  const change = verdict.compromises.find((c) => !addOnCodes.has(c.lever.code));
  const accepted =
    missed.length > 0
      ? `I accepted missing ${list(missed.map((v) => `the ${lowerFirst(v.ruleName)} by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`))}.`
      : broken.length > 0
        ? `I accepted breaking ${list(broken.map((p) => lowerFirst(p.promise.title)))}.`
        : target > 0 && verdict.headroomGbpm < target
          ? `I accepted ${formatGbpBn(target - verdict.headroomGbpm, 1)} less headroom than I set out to keep.`
          : change
            ? `I accepted ${lowerFirst(change.lever.shortTitle)} at ${formatLeverValue(change.lever, change.to)} rather than ${formatLeverValue(change.lever, change.from)}, after the forecast.`
            : 'I accepted no compromise the forecast forced: the OBR saw the Budget I delivered.';
  return { prioritised, paid, accepted };
}

/**
 * Step 7: what your Budget means, on one screen. The Budget in three sentences; the rules line,
 * which is the one thing here that is arithmetic; the backbenchers, the markets and the public,
 * each rating the Budget out of five and saying which choices caused it; and the close, with the
 * ambitions, who paid, the compromises and every other forecast. The speech, the households and
 * the Budget documents are one fold away. Arriving here marks the game finished, so a link shared
 * from here opens as a finished Budget.
 */
export function BudgetDayPage() {
  const { state, dispatch, outcome, query } = useBudget();
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
  const macroSummary =
    describeAssumptions(ASSUMPTION_CARDS, state.leverValues, MACRO_CODES, game?.revealed) ??
    leversByCategory.macro
      .map((l) => ({ lever: l, value: state.leverValues[l.code] ?? l.control.default }))
      .filter((x) => x.value !== x.lever.control.default)
      .map((x) => `${x.lever.shortTitle} ${formatLeverValue(x.lever, x.value)}`)
      .join(' · ');

  // The game's readings: ambitions against the package, and the package as the OBR saw it.
  const status = useMemo(
    () => (game ? ambitionStatus(game, pm, options, outcome, levers) : undefined),
    [game, outcome],
  );
  const snapshotOutcome = useMemo(() => {
    if (!game || !state.snapshot) return undefined;
    const policy: Record<string, number> = {};
    for (const [code, v] of Object.entries(state.snapshot)) {
      if (!MACRO_CODES.includes(code)) policy[code] = v;
    }
    for (const code of MACRO_CODES) {
      if (state.leverValues[code] !== undefined) policy[code] = state.leverValues[code]!;
    }
    return computeOutcome({
      vintage,
      rules,
      levers,
      settings: { ...outcome.settings, leverValues: policy },
    });
  }, [game, state.snapshot, state.leverValues, outcome.settings]);
  // The add-ons: the levers they moved, and what to call them together.
  const rabbitChoice = useMemo(() => {
    if (!game || game.rabbit.length === 0) return undefined;
    if (game.rabbit.length === 1 && game.rabbit[0] === 'keep') {
      return { codes: [], label: 'keeping the headroom' };
    }
    const codes: string[] = [];
    const labels: string[] = [];
    for (const id of game.rabbit) {
      if (id === 'keep') continue;
      if (id.startsWith('further:')) {
        const pid = id.slice('further:'.length);
        labels.push(`going further on ${pm.priorities.find((p) => p.id === pid)?.title ?? pid}`);
        continue;
      }
      const addOn = options.addOns.find((o) => o.id === id);
      if (!addOn) continue;
      codes.push(...Object.keys(addOn.values));
      labels.push(addOn.title);
    }
    return labels.length > 0 ? { codes, label: labels.join(', ') } : undefined;
  }, [game]);
  const room = useMemo(
    () =>
      receptions({
        outcome,
        levers,
        reception,
        typicalErrorGbpm,
        pm,
        incidence,
        ...(game ? { game } : {}),
        ...(status ? { status } : {}),
        ...(snapshotOutcome ? { snapshotOutcome } : {}),
        macroCodes: MACRO_CODES,
        ...(rabbitChoice ? { rabbit: rabbitChoice } : {}),
      }),
    [outcome, typicalErrorGbpm, game, status, snapshotOutcome, rabbitChoice],
  );
  const notes = distributionalNotes(outcome, levers, targetYear).slice(0, 3);
  // The one audience that is arithmetic: the rules, in a line above the three cards.
  const missedRules = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const rulesLine =
    missedRules.length === 0
      ? 'You meet both fiscal rules and the welfare cap on these numbers.'
      : `Missed on these numbers: ${missedRules.map((v) => v.ruleName).join(' and ')}.`;
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
        ...(state.snapshot ? { snapshot: state.snapshot } : {}),
        macroCodes: MACRO_CODES,
        rabbitTitles: Object.fromEntries(options.addOns.map((o) => [o.id, o.title])),
      }),
    [outcome, game, status, state.snapshot],
  );
  // The options on in the package, for what the money does and does not buy.
  const deliveredOptions = (status?.priorities ?? []).flatMap((p) =>
    p.options.filter((o) => o.state === 'on'),
  );
  // The close: what the playthrough came to, re-running the engine under every draw.
  const verdict = useMemo(() => {
    if (!game) return undefined;
    const values = readings({
      outcome,
      levers,
      typicalErrorGbpm,
      game,
      ...(status ? { status } : {}),
    });
    return budgetVerdict({
      vintage,
      rules,
      levers,
      pm,
      options,
      draws,
      context,
      incidence,
      kinds: verdicts,
      game,
      outcome,
      ...(state.snapshot ? { snapshot: state.snapshot } : {}),
      macroCodes: MACRO_CODES,
      typicalErrorGbpm,
      credibilityShare: values.credibilityShare ?? 0,
      rebellionRisk: values.rebellionRisk ?? 0,
    });
  }, [game, outcome, status, state.snapshot, typicalErrorGbpm]);
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
  const replayHref = game
    ? `/outlook?${permalinkQuery({
        leverValues: {},
        debtInterestFeedback: true,
        assessAsOf: 'vintage',
        warnings: [],
        game: freshGame(game.seed),
      })}`
    : '/outlook';
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
      {verdict ? <Verdict verdict={verdict} replayHref={replayHref} /> : null}

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
              Economic assumptions:{' '}
              {macroSummary.length > 0 ? macroSummary : "the OBR's March view"}
              {' · '}
              <StepLink to="/outlook">change</StepLink>
            </p>
            <ul className="documents">
              <li>
                <strong>Economic and fiscal outlook.</strong> The OBR’s forecast, published beside
                the Budget:{' '}
                {game?.revealed ? (
                  <StepLink to="/forecast">the one you opened</StepLink>
                ) : (
                  'the March forecast, as it stands'
                )}
                .
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
