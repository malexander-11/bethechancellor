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
  readings,
  receptions,
} from '@btc/engine';
import { useMemo, useState } from 'react';
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
import { Scorecard } from '../components/Scorecard';
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
  rabbit,
  reception,
  rules,
  speech as speechFile,
  verdicts,
  vintage,
} from '../data';
import { Beat, Beats, resetProgress } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { describeAssumptions, macroCodesOf, scenarioCards } from '../journey/scenarios';
import { WorkingsOnly } from '../journey/workings';
import { permalinkQuery, useBudget } from '../state/budget';

const ASSUMPTION_CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

/**
 * Step 7. Three beats: the speech, built from the actual choices; the reaction, when the
 * backbenchers, the markets and the public each rate the Budget out of five and say why; and the
 * close. Every rating is a game judgement from authored thresholds, names the decisions behind it
 * and wears the badge; the rules line above the cards is the one thing here that is arithmetic.
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
    () => (game ? ambitionStatus(game, pm, outcome, levers) : undefined),
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
  const rabbitChoice = useMemo(() => {
    if (!game?.rabbit) return undefined;
    if (game.rabbit === 'keep') return { label: 'keeping the headroom' };
    if (game.rabbit.startsWith('flagship:')) {
      const id = game.rabbit.slice('flagship:'.length);
      const flagship = pm.flagships.find((f) => f.id === id);
      return { label: `going further on ${flagship?.title ?? id}` };
    }
    const option = rabbit.options.find((o) => o.id === game.rabbit);
    return option ? { code: option.code, label: option.title } : undefined;
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
    (game?.themes.length ?? 0) > 0,
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
        rabbitTitles: Object.fromEntries(rabbit.options.map((o) => [o.id, o.title])),
      }),
    [outcome, game, status, state.snapshot],
  );
  const fundedFlagships = (status?.priorities ?? []).filter(
    (p) => p.status === 'funded' || p.status === 'delayed',
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

  /** Reaching the close is the end of the story; a link shared from here opens everything. */
  const reachClose = () => {
    if (game && game.reached < FINAL_STAGE) {
      dispatch({ type: 'updateGame', patch: { reached: FINAL_STAGE } });
    }
  };

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
      <Beats step="budget-day">
        <Beat title="The speech" continueLabel="Sit down, and hear the room">
          <Speech speech={theSpeech} />
        </Beat>
        <Beat title="The reaction" continueLabel="Read the verdict" onAdvance={reachClose}>
          <Scorecard
            outcome={outcome}
            typicalErrorGbpm={typicalErrorGbpm}
            revealed={game?.revealed ?? false}
          />
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
          <h2 className="section-label">Five households</h2>
          <Households reactions={voters} />
          {fundedFlagships.length > 0 ? (
            <section className="panel" aria-labelledby="delivery-heading">
              <h2 id="delivery-heading" className="section-label">
                What the money does and does not buy
              </h2>
              <ul className="delivery">
                {fundedFlagships.map((p) => (
                  <li key={p.flagship.id}>
                    <strong>{p.flagship.title}.</strong> {p.flagship.delivery.text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Beat>
        <Beat title="The close">
          {verdict ? <Verdict verdict={verdict} replayHref={replayHref} /> : null}
          <WorkingsOnly>
            <details className="panel" aria-labelledby="verdicts-heading">
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
                {outcome.verdicts.map((verdict) => (
                  <VerdictCard
                    key={verdict.ruleId}
                    verdict={verdict}
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
                  <span className="group__name">Your measures</span>
                  <span className="group__count">{outcome.leverEffects.length}</span>
                </span>
                <span className="group__say">
                  Every lever you moved, and what it does in {targetYear}.
                </span>
              </summary>
              <MeasuresTable outcome={outcome} levers={levers} targetYear={targetYear} />
              <p className="source">
                Economic assumptions:{' '}
                {macroSummary.length > 0 ? macroSummary : "the OBR's March view"}
                {' · '}
                <StepLink to="/outlook">change</StepLink>
              </p>
            </details>
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
                <h2>Five-year paths</h2>
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
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={copyLink}>
              {copied ? 'Link copied' : 'Copy a link to this Budget'}
            </button>
            <StepLink to="/budget/taxes" className="btn">
              Back to the package
            </StepLink>
            <button
              type="button"
              className="btn"
              onClick={() => {
                dispatch({ type: 'reset' });
                resetProgress();
                navigate('/');
              }}
            >
              Start again
            </button>
          </div>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
