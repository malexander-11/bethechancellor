import {
  affordSuggestions,
  ambitionStatus,
  deliverSuggestions,
  optionState,
  resilienceRows,
  spendingMeasures,
  stageIndex,
  type Lever,
} from '@btc/engine';
import { useMemo } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { adviserById, context, draws, levers, options, pm, rules, vintage } from '../data';
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { macroCodesOf } from '../journey/scenarios';
import { useBudget } from '../state/budget';
import { LEAD_MISSED, LEADS, NEXT, PARTS, QUESTIONS, SCREENS, type Mood } from './compromise/copy';
import { KeepHeadroom } from './compromise/Headroom';
import { EaseOffTax, RaiseMoreTax } from './compromise/Revenue';
import type { Moves } from './compromise/shared';
import { DoMore, SpendLessOrLater } from './compromise/Spending';

const MACRO_CODES = macroCodesOf(context.readings);
const byCode = new Map(levers.map((l) => [l.code, l] as const));

/** The route of the n-th compromise screen (1-based): the first has the bare route. */
export function compromisePath(n: number): string {
  return n <= 1 ? '/compromise' : `/compromise/${n}`;
}

/**
 * Step 5, screens two to four: the compromises, one question a screen (Phase 23), in one of two
 * moods the live headroom decides. Short of the margin the player meant to keep, or with a rule
 * missed, the sums: will you raise more tax (the ways to pay not yet chosen, ranked by yield);
 * will you spend less, or later (what was chosen to deliver, each with a later start, half the
 * distance or dropped, and who feels it); will you keep less headroom (the target, and, with a
 * rule missed, borrow and say so). With room to spare and every rule met: will you do more for
 * your priorities, ease off a tax rise, keep the extra headroom. The mood is read again on every
 * screen, so a move that closes the gap or opens one changes the question and keeps the screen
 * number. The manifesto is not a route: its red lines are fixed. Every figure is the engine's,
 * re-run for the move in question; every word beside them is an adviser's and wears the badge.
 * The bar keeps score on every screen; the stress test under every other forecast is one fold
 * away on the last.
 */
export function CompromisePage() {
  const { n: nParam } = useParams();
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const delays = game?.delays ?? {};
  const headroomOf = useHeadroomOf();
  const priceOf = useOptionPrices();
  // Which screen, and which mood, before the guards as every hook is: both are pure reads.
  const requested = Number(nParam ?? '1');
  const n = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), SCREENS) : 1;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = (game?.headroomTargetBn ?? 0) * 1000;
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  // Room to spare, and every rule met: the screens offer ways to use it rather than ways out.
  const surplus = missed.length === 0 && target - headroom < 0;
  const mood: Mood = surplus ? 'room' : 'sums';
  // The Director of Tax's ranking runs the engine once a candidate; it is wanted on the first
  // screen of the sums and nowhere else. The package under every other forecast likewise waits
  // for the last screen.
  const revenue = useMemo(
    () =>
      n === 1 && !surplus
        ? affordSuggestions(options, levers, state.leverValues, pm.promises, headroomOf, 3)
        : [],
    [n, surplus, state.leverValues, headroomOf],
  );
  const stress = useMemo(
    () =>
      n === SCREENS && game
        ? resilienceRows({
            vintage,
            rules,
            levers,
            draws,
            context,
            outcome,
            macroCodes: MACRO_CODES,
            game,
          })
        : [],
    [n, game, outcome],
  );

  const guard = useStageGuard('compromise');
  if (guard || !game) return guard;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;
  // A screen number that is not one of the three lands on the nearest; the first keeps the bare
  // route, so there is one address for each screen.
  if (nParam !== undefined && (String(n) !== nParam || n === 1)) {
    return <Navigate to={{ pathname: compromisePath(n), search }} replace />;
  }

  const status = ambitionStatus(game, pm, options, outcome, levers);
  const spend = (patch: Partial<typeof game>) => dispatch({ type: 'updateGame', patch });
  const moves: Moves = {
    values: state.leverValues,
    delays,
    setAll: (values) => dispatch({ type: 'setLevers', values }),
    set: (code, value) => dispatch({ type: 'setLever', code, value }),
    setDelay: (code, year) => {
      const next = { ...delays };
      if (year === '') delete next[code];
      else next[code] = year;
      spend({ delays: next });
    },
    effectOf: (values, overrideDelays) => headroomOf(values, overrideDelays) - headroom,
    byCode,
    valueOf: (lever) => state.leverValues[lever.code] ?? lever.control.default,
    role: (id) => adviserById.get(id)?.role ?? id,
  };

  const screen = (() => {
    if (n === 1) {
      return surplus ? (
        <DoMore
          more={deliverSuggestions(status, options, levers, state.leverValues, 3)}
          priceOf={priceOf}
          moves={moves}
        />
      ) : (
        <RaiseMoreTax revenue={revenue} moves={moves} />
      );
    }
    if (n === 2) {
      if (surplus) {
        const ways = options.afford.filter(
          (o) => optionState(o, state.leverValues, levers) !== 'off',
        );
        return <EaseOffTax ways={ways} moves={moves} />;
      }
      // What was chosen to deliver and costs money in the target year, biggest first; then
      // anything else in the Budget that costs money, moved on the desk rather than chosen.
      const chosen = status.priorities
        .flatMap((p) => p.options)
        .filter((o) => o.state !== 'off' && o.costGbpm > 0)
        .sort((a, b) => b.costGbpm - a.costGbpm);
      const chosenCodes = new Set(chosen.flatMap((o) => Object.keys(o.option.values)));
      const spending = spendingMeasures(levers, outcome, targetYear)
        .filter((m) => !chosenCodes.has(m.lever.code))
        .slice(0, 3);
      // Who feels it: the spending measures cut back since the forecast.
      const felt = Object.entries(state.snapshot ?? {})
        .filter(([code, was]) => {
          const lever = byCode.get(code);
          if (!lever || MACRO_CODES.includes(code) || lever.category === 'tax') return false;
          return (state.leverValues[code] ?? lever.control.default) < was;
        })
        .map(([code]) => byCode.get(code))
        .filter((l): l is Lever => l !== undefined)
        .slice(0, 3);
      return (
        <SpendLessOrLater
          chosen={chosen}
          spending={spending}
          felt={felt}
          policyYears={outcome.paths.policyYears}
          targetYear={targetYear}
          moves={moves}
        />
      );
    }
    return (
      <KeepHeadroom
        surplus={surplus}
        game={game}
        missed={missed}
        stress={stress}
        spend={spend}
        moves={moves}
      />
    );
  })();

  const question = QUESTIONS[mood][n - 1] ?? QUESTIONS[mood][0];
  const lead =
    !surplus && n === SCREENS && missed.length > 0
      ? LEAD_MISSED
      : (LEADS[mood][n - 1] ?? LEADS[mood][0]);
  const onward =
    n < SCREENS
      ? { to: compromisePath(n + 1), label: NEXT[mood][n - 1] ?? '' }
      : { to: '/rabbit', label: 'Next: final choices' };
  const back = n > 1 ? compromisePath(n - 1) : '/forecast';

  return (
    <JourneyLayout
      step="compromise"
      part={{ index: n + 1, total: SCREENS + 1, label: PARTS[mood][n - 1] ?? '' }}
      title={question}
      tabTitle={question}
      lead={lead}
    >
      <HeadroomBar outcome={outcome} game={game} status={status} />
      {screen}
      <p className="actions">
        <StepLink
          to={onward.to}
          className="btn btn--primary"
          {...(n === SCREENS
            ? { onClick: () => spend({ reached: Math.max(game.reached, stageIndex('rabbit')) }) }
            : {})}
        >
          {onward.label}
        </StepLink>
        <StepLink to={back} className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
