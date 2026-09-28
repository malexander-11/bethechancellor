/**
 * The readings of a Budget: every figure the reception (game/reception.ts) and the close can
 * compare with an authored threshold, and the decisions behind each. Nothing here invents a mood
 * or predicts a market move: a reading is arithmetic over the outcome, and the words about it
 * live in data/journey/reception.json with their sources.
 */
import { fyStart } from './calc/years.js';
import { formatGbpBn } from './format.js';
import type { IncidenceFile, Lever, PmFile, SourceRef } from './types/data.js';
import type { GamePermalink, Outcome } from './types/engine.js';
import type { AmbitionStatus } from './game/ambitions.js';
import { preBudget, type OutcomeOf } from './game/prices.js';

/** A distributional note carried straight from a lever the player moved. */
export interface DistributionalNote {
  leverId: string;
  leverTitle: string;
  text: string;
  magnitudeWords: string;
  sources: SourceRef[];
}

export interface ReadingsInput {
  outcome: Outcome;
  levers: readonly Lever[];
  /** The OBR's typical five-year receipts forecast error, £ million. */
  typicalErrorGbpm: number;
  /**
   * The engine re-run under the Budget's own settings (Phase 25). Borrowing, debt and the tax take
   * are measured from the Budget before any measure, today's estimate with nothing moved, so the
   * economy since March is never the player's doing.
   */
  outcomeOf: OutcomeOf;
  /** The playthrough, when there is one (Phase 8). Without it the game readings sit at nought. */
  game?: GamePermalink;
  /** Ambitions against the package, computed by the caller from the same outcome. */
  status?: AmbitionStatus;
  /** The PM file; kept so callers need not change, read by nothing since Phase 18. */
  pm?: PmFile;
  /** Who each lever falls on, for whether the revenue comes from the top or the broad base. */
  incidence?: IncidenceFile;
}

const STATUS_ORDER: Record<string, number> = {
  met: 0,
  withinCap: 0,
  aboveCapWithinMargin: 1,
  notMet: 2,
  aboveMargin: 2,
  unavailable: 3,
};

const WELFARE_REVERSALS = new Set(['rv2ch', 'rvpip', 'rvwfp']);
/** Incidence groups on the two sides of "who pays": the top and business, or everyone. */
const PROGRESSIVE_GROUPS = new Set(['top', 'higher-earners', 'savers-owners', 'business']);
/** The services people use most (Phase 25): cuts to them count from a lower threshold. */
const PROTECTED_GROUPS = new Set(['nhs', 'schools']);
/**
 * Paid for (Phase 25): the measures cost something worth paying for, at least this much in some
 * year, and borrowing is no higher than before the Budget, give or take this much, in any year.
 */
const PAID_FOR_COST_GBPM = 1000;
const PAID_FOR_TOLERANCE_GBPM = 500;
/** A cut too small to name, £ million. */
const NAMED_CUT_GBPM = 50;
/** Below this a measure raises nothing yet in a year, £ million: the cards' "unchanged". */
const NOTHING_YET_GBPM = 50;
const BROAD_GROUPS = new Set(['broad-base', 'motorists', 'duties']);
const PRICE_RAISERS = new Set([
  'vatfood',
  'vatnrg',
  'vatkids',
  'vatbook',
  'vattrn',
  'vathome',
  'vats',
  'vatr',
  'fuel',
  'alc',
  'rvfuel',
]);
function at(values: Record<string, number>, year: string): number {
  return values[year] ?? 0;
}

/**
 * A decision behind a reading (Phase 25): its name in running words, and, where the reading has a
 * direction, how far the decision moved it (positive raises the reading). The reception keeps only
 * the causes that pushed the way its reason says, so a saving is never blamed for more borrowing.
 */
export interface Cause {
  title: string;
  delta?: number;
}

export interface Readings {
  values: Record<string, number>;
  causes: Record<string, Cause[]>;
  /**
   * Words the reception's sentences fill in (Phase 25): `{payers}`, the groups who pay the most;
   * `{feltHow}`, how households feel the tax rises that most of them feel; `{protected}` and
   * `{protectedCut}`, the health and schools budgets cut and by how much; `{cutServices}`, the
   * budgets cut; `{year}`, the target year, and `{lateFrom}`, the year before it.
   */
  words: Record<string, string>;
}

/** "a, b and c" */
function inWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Every reading the signals can use, and the decisions behind each, computed once. */
export function readingsWithCauses(input: ReadingsInput): Readings {
  const { outcome, levers, typicalErrorGbpm, status } = input;
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  // A cause is named as a sentence says it (Phase 25): "Because of the health and social care levy".
  const title = (code: string) => byCode.get(code)?.noun ?? byCode.get(code)?.shortTitle ?? code;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const investment = outcome.verdicts.find((v) => v.kind === 'stockFalling');
  const welfare = outcome.verdicts.find((v) => v.kind === 'welfareCap');
  const year =
    stability?.targetYear ?? outcome.paths.policyYears[outcome.paths.policyYears.length - 1] ?? '';
  const years = outcome.paths.years;
  const previous = years[years.indexOf(year) - 1] ?? year;
  const { policy } = outcome.paths;

  // Before the Budget (Phase 25): today's estimate with no measure moved. Every change below is
  // measured from here, so what the economy did since March is never counted as the player's.
  const pre = preBudget(input.outcomeOf, outcome.settings.leverValues, levers);
  const before = pre.paths.policy;
  const headroom = stability?.headroomGbpm ?? 0;
  const headroomBefore = pre.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
  const moreBorrowing = (y: string) => at(policy.psnb, y) - at(before.psnb, y);
  const borrowingChange = moreBorrowing(year);
  const cumulativeBorrowing = outcome.paths.policyYears.reduce(
    (acc, y) => acc + moreBorrowing(y),
    0,
  );
  const debtChange = at(policy.psnflPctGdp, year) - at(before.psnflPctGdp, year);
  const debtFalling = at(policy.psnflPctGdp, year) - at(policy.psnflPctGdp, previous);
  const taxTakeChange =
    (at(policy.receipts, year) / at(policy.nominalGdpFy, year) -
      at(before.receipts, year) / at(before.nominalGdpFy, year)) *
    100;
  // The two fiscal rules, not the welfare cap: what the rules test (Phase 25).
  const fiscalRulesMissed = outcome.verdicts.filter(
    (v) => (v.kind === 'currentBudget' || v.kind === 'stockFalling') && v.status === 'notMet',
  ).length;
  // Borrowing higher in an earlier year than the target year shows: the rules test one year.
  let frontLoaded = 0;
  let frontYear: string | undefined;
  for (const y of outcome.paths.policyYears) {
    if (fyStart(y) >= fyStart(year)) continue;
    const excess = moreBorrowing(y) - Math.max(0, borrowingChange);
    if (excess > frontLoaded) {
      frontLoaded = excess;
      frontYear = y;
    }
  }

  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const values = outcome.settings.leverValues;
  const valueOf = (code: string) => values[code] ?? byCode.get(code)?.control.default ?? 0;
  // Every reversal of a Budget 2025 or Autumn Budget 2024 decision, whichever screen it sits on.
  const reversals = levers.filter((l) => moved.has(l.code) && /^rv/.test(l.code));
  const welfareReversals = levers.filter((l) => moved.has(l.code) && WELFARE_REVERSALS.has(l.code));
  // Benefits cut other than by a U-turn (Phase 25): a rate cut, or a reform that saves money in
  // the target year. The benches count each as they count a U-turn.
  const welfareCuts = outcome.leverEffects
    .filter(
      (e) =>
        e.category === 'welfare' &&
        !WELFARE_REVERSALS.has(e.code) &&
        (e.currentSpending[year] ?? 0) <= -NAMED_CUT_GBPM,
    )
    .map((e) => ({ code: e.code }));
  const cutDepartments = levers.filter(
    (l) =>
      (l.category === 'spend' || l.category === 'welfare') &&
      moved.has(l.code) &&
      valueOf(l.code) < l.control.default,
  );
  const priceRaisers = levers.filter(
    (l) => moved.has(l.code) && PRICE_RAISERS.has(l.code) && valueOf(l.code) > l.control.default,
  );

  // The decisions behind a reading, each with how far it moved it, biggest first. The economy is
  // not the player's decision, so the macro rows are never a cause (Phase 25).
  const signed = (rows: { code: string; delta: number }[]): Cause[] =>
    rows
      .filter((r) => Math.abs(r.delta) >= 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .map((r) => ({ title: title(r.code), delta: r.delta }));
  const leverRows = outcome.attribution.filter(
    (r): r is typeof r & { code: string } => r.kind === 'lever' && r.code !== undefined,
  );
  // More borrowing, and more debt with it: positive when a decision adds to borrowing.
  const borrowingMovers = signed(leverRows.map((r) => ({ code: r.code, delta: r.psnbGbpm })));
  // Headroom: positive when a decision adds to it (the current budget improves).
  const headroomMovers = signed(
    leverRows.map((r) => ({ code: r.code, delta: -r.currentBudgetGbpm })),
  );
  // The debt rule's margin: positive when a decision borrows less, so debt falls faster.
  const debtHeadroomMovers = signed(leverRows.map((r) => ({ code: r.code, delta: -r.psnbGbpm })));
  const cumulativeMovers = signed(
    outcome.leverEffects
      .filter((e) => e.category !== 'macro')
      .map((e) => ({
        code: e.code,
        delta: outcome.paths.policyYears.reduce(
          (acc, y) =>
            acc + (e.currentSpending[y] ?? 0) + (e.capitalSpending[y] ?? 0) - (e.receipts[y] ?? 0),
          0,
        ),
      })),
  );
  const taxMovers = signed(
    outcome.leverEffects
      .filter((e) => e.category !== 'macro')
      .map((e) => ({ code: e.code, delta: e.receipts[year] ?? 0 })),
  );

  // Credibility: how much of what improves the current budget rests on figures nobody certified.
  // HMRC's cost of a relief counts, whatever its badge: HMRC says it is not what ending the relief
  // would raise (Phase 25). The relief part is kept apart so the words can say which it is.
  let improving = 0;
  let uncertified = 0;
  let reliefs = 0;
  const uncertifiedTitles: string[] = [];
  for (const effect of outcome.leverEffects) {
    if (effect.category === 'macro') continue;
    const improvement =
      (effect.receipts[year] ?? 0) -
      (effect.currentSpending[year] ?? 0) -
      (effect.macroCurrent[year] ?? 0);
    if (improvement <= 0) continue;
    improving += improvement;
    const relief = byCode.get(effect.code)?.reliefCost === true;
    if (relief || effect.badge === 'assumption' || effect.badge === 'simulated') {
      uncertified += improvement;
      if (relief) reliefs += improvement;
      uncertifiedTitles.push(title(effect.code));
    }
  }

  // The game's own readings.
  const broken = status?.promises.filter((p) => !p.kept) ?? [];
  // Graded delivery (Phase 25): in full, started (or settled lower on step 4), or nothing.
  const unfunded = status?.priorities.filter((p) => p.status === 'notFunded') ?? [];
  const started =
    status?.priorities.filter((p) => p.status === 'started' || p.status === 'settledLower') ?? [];
  const funded = status?.priorities.filter((p) => p.status === 'delivered') ?? [];
  const missedRules = outcome.verdicts
    .filter((v) => v.status === 'notMet' || v.status === 'aboveMargin')
    .map((v) => v.shortName);

  // Spending, tax and who pays, in the target year (Phase 9). Titles are the levers' own.
  const policyEffects = outcome.leverEffects.filter((e) => e.category !== 'macro');
  const spendOf = (e: (typeof policyEffects)[number]) =>
    (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
  const topBy = (
    list: typeof policyEffects,
    size: (e: (typeof policyEffects)[number]) => number,
  ): Cause[] => signed(list.map((e) => ({ code: e.code, delta: size(e) })));
  // Public services are the departments, not benefits (Phase 25): welfare has its own readings.
  const departments = policyEffects.filter((e) => e.category === 'spend');
  const publicServiceSpending = departments.reduce((acc, e) => acc + spendOf(e), 0);
  // Cuts to departments' day-to-day budgets, each counted, never netted against a rise elsewhere.
  const cutOf = (e: (typeof policyEffects)[number]) => Math.max(0, -(e.currentSpending[year] ?? 0));
  const serviceCuts = departments.reduce((acc, e) => acc + cutOf(e), 0);
  const isProtected = (code: string) => PROTECTED_GROUPS.has(input.incidence?.levers[code] ?? '');
  const protectedEffects = departments.filter((e) => isProtected(e.code));
  const protectedCuts = protectedEffects.reduce((acc, e) => acc + cutOf(e), 0);
  const namesOf = (list: typeof policyEffects) =>
    inWords(
      list
        .filter((e) => cutOf(e) >= NAMED_CUT_GBPM)
        .sort((a, b) => cutOf(b) - cutOf(a))
        .slice(0, 3)
        .map((e) => title(e.code)),
    );
  const capitalChange = policyEffects.reduce((acc, e) => acc + (e.capitalSpending[year] ?? 0), 0);
  const welfareEffects = policyEffects.filter((e) => e.category === 'welfare');
  const welfareChange = welfareEffects.reduce((acc, e) => acc + (e.currentSpending[year] ?? 0), 0);
  const rises = policyEffects.filter((e) => (e.receipts[year] ?? 0) > 0);
  const cuts = policyEffects.filter((e) => (e.receipts[year] ?? 0) < 0);
  const taxRises = rises.reduce((acc, e) => acc + (e.receipts[year] ?? 0), 0);
  const taxCuts = cuts.reduce((acc, e) => acc - (e.receipts[year] ?? 0), 0);
  // Money that arrives late (Phase 25): of the new tax money in the target year, the share from
  // measures that raise nothing in any policy year before the one ahead of it.
  const lateFrom = outcome.paths.policyYears.find((y) => fyStart(y) === fyStart(year) - 1) ?? year;
  const early = outcome.paths.policyYears.filter((y) => fyStart(y) < fyStart(lateFrom));
  const late = rises.filter((e) =>
    early.every((y) => Math.abs(e.receipts[y] ?? 0) < NOTHING_YET_GBPM),
  );
  const lateYield = late.reduce((acc, e) => acc + (e.receipts[year] ?? 0), 0);
  // Taxes most households feel, and those they do not: levies on banks, energy producers and
  // the very top, an authored list (Phase 25). Felt rises are named by how they are felt.
  const notFelt = new Set(input.incidence?.notFelt ?? []);
  const feltRises = rises.filter((e) => !notFelt.has(e.code));
  const notFeltRises = rises.filter((e) => notFelt.has(e.code));
  const raisedBy = (list: typeof policyEffects) =>
    list.reduce((acc, e) => acc + (e.receipts[year] ?? 0), 0);
  const feltBy = new Map<string, number>();
  for (const e of feltRises) {
    const group = input.incidence?.levers[e.code];
    if (group) feltBy.set(group, (feltBy.get(group) ?? 0) + (e.receipts[year] ?? 0));
  }
  const feltMost = [...feltBy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const feltHow =
    (feltMost ? input.incidence?.groups[feltMost]?.felt : undefined) ?? 'in pay packets and prices';
  // Paid for (Phase 25): measures that cost something, and borrowing no higher than before the
  // Budget in any year. 0 paid for; 1 nothing to pay for; 2 borrowed in some year.
  const costIn = (y: string) =>
    policyEffects.reduce(
      (acc, e) =>
        acc +
        Math.max(
          0,
          (e.currentSpending[y] ?? 0) + (e.capitalSpending[y] ?? 0) - (e.receipts[y] ?? 0),
        ),
      0,
    );
  const somethingToPay = outcome.paths.policyYears.some((y) => costIn(y) >= PAID_FOR_COST_GBPM);
  const borrowedSomeYear = outcome.paths.policyYears.some(
    (y) => moreBorrowing(y) > PAID_FOR_TOLERANCE_GBPM,
  );
  const paidForStatus = !somethingToPay ? 1 : borrowedSomeYear ? 2 : 0;
  const frontMovers = frontYear
    ? signed(
        policyEffects.map((e) => ({
          code: e.code,
          delta:
            (e.currentSpending[frontYear] ?? 0) +
            (e.capitalSpending[frontYear] ?? 0) -
            (e.receipts[frontYear] ?? 0),
        })),
      )
    : [];
  // Who pays: rises on the top and business count up, rises on everyone else count down.
  let progressive = 0;
  const progressiveRows: { code: string; delta: number }[] = [];
  const paidBy = new Map<string, number>();
  if (input.incidence) {
    for (const e of rises) {
      const group = input.incidence.levers[e.code];
      if (!group) continue;
      const raised = e.receipts[year] ?? 0;
      let delta: number;
      if (PROGRESSIVE_GROUPS.has(group)) delta = raised;
      else if (BROAD_GROUPS.has(group)) delta = -raised;
      else continue;
      progressive += delta;
      progressiveRows.push({ code: e.code, delta });
      paidBy.set(group, (paidBy.get(group) ?? 0) + delta);
    }
  }
  // The side that pays the most, named by its groups' own labels, biggest first.
  const payers = [...paidBy.entries()]
    .filter(([, gbpm]) => Math.sign(gbpm) === Math.sign(progressive) && gbpm !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([group]) => lowerFirst(input.incidence?.groups[group]?.label ?? group));
  // Priorities: one priority ranked, delivered, with nothing partly done, is a clear story.
  const ranked = status?.priorities ?? [];
  const deliveredGbpm = funded.reduce((acc, p) => acc + Math.abs(p.spendingGbpm), 0);
  const clearPriorityGbpm =
    ranked.length === 1 && funded.length === 1 && unfunded.length === 0 && started.length === 0
      ? deliveredGbpm
      : 0;
  // Only the 2024 manifesto's own words are red lines (Phase 25). A Budget 2025 decision
  // reversed is a broken commitment, a U-turn; the fiscal rules are read as the rules.
  const byLevers = broken.filter((p) => p.promise.judgedBy !== 'fiscalRules');
  const manifestoBroken = byLevers.filter((p) => p.promise.origin === 'manifesto-2024');
  const commitmentsBroken = byLevers.filter((p) => p.promise.origin !== 'manifesto-2024');
  // Amber (Phase 23): the pledge's words kept, its spirit tested; a promise also broken counts
  // once. Only a scored strain of a manifesto promise counts (Phase 25): the others are shown.
  const strained = (status?.strains ?? []).filter(
    (s) =>
      s.strained &&
      s.promise.origin === 'manifesto-2024' &&
      !broken.some((p) => p.promise.id === s.promise.id) &&
      s.promise.strains.some(
        (rule) => rule.scored && s.strainedBy.some((b) => b.code === rule.code),
      ),
  );

  const out: Readings = {
    values: {
      stabilityHeadroomGbpm: headroom,
      stabilityHeadroomVsTypicalError: typicalErrorGbpm > 0 ? headroom / typicalErrorGbpm : 0,
      investmentRuleStatus: STATUS_ORDER[investment?.status ?? 'unavailable'] ?? 3,
      welfareCapStatus: STATUS_ORDER[welfare?.status ?? 'unavailable'] ?? 3,
      rulesMissed: missedRules.length,
      borrowingChangeGbpm: borrowingChange,
      cumulativeBorrowingChangeGbpm: cumulativeBorrowing,
      debtChangePp: debtChange,
      debtFallingPp: debtFalling,
      taxTakeChangePp: taxTakeChange,
      budget2025Reversals: reversals.length,
      promisesBroken: broken.length,
      manifestoBroken: manifestoBroken.length,
      manifestoStrained: strained.length,
      prioritiesUnfunded: unfunded.length,
      prioritiesStarted: started.length,
      prioritiesFunded: funded.length,
      deliveredGbpm,
      clearPriorityGbpm,
      welfareReversals: welfareReversals.length,
      welfareChangeGbpm: welfareChange,
      departmentsCut: cutDepartments.length,
      rebellionRisk:
        broken.length * 2 + unfunded.length + welfareReversals.length + welfareCuts.length,
      credibilityShare: improving > 0 ? uncertified / improving : 0,
      reliefShareOfUncertified: uncertified > 0 ? reliefs / uncertified : 0,
      priceRaisingMeasures: priceRaisers.length,
      thresholdFreezeKept: moved.has('rvfrz') ? 0 : 1,
      efficienciesKept: moved.has('rveff') ? 0 : 1,
      publicServiceSpendingGbpm: publicServiceSpending,
      capitalChangeGbpm: capitalChange,
      taxRisesGbpm: taxRises,
      taxCutsGbpm: taxCuts,
      netRevenueGbpm: taxRises - taxCuts,
      progressiveBalanceGbpm: progressive,
      headroomChangeGbpm: headroom - headroomBefore,
      investmentHeadroomGbpm: investment?.headroomGbpm ?? 0,
      fiscalRulesMissed,
      serviceCutsGbpm: serviceCuts,
      protectedCutsGbpm: protectedCuts,
      feltTaxRisesGbpm: raisedBy(feltRises),
      notFeltTaxRisesGbpm: raisedBy(notFeltRises),
      paidForStatus,
      frontLoadedBorrowingGbpm: frontLoaded,
      commitmentsBroken: commitmentsBroken.length,
      lateYieldShare: taxRises > 0 ? lateYield / taxRises : 0,
    },
    causes: {
      stabilityHeadroomGbpm: headroomMovers,
      stabilityHeadroomVsTypicalError: headroomMovers,
      investmentRuleStatus: borrowingMovers,
      welfareCapStatus: welfareReversals.map((l) => ({ title: title(l.code) })),
      rulesMissed: missedRules.map((name) => ({ title: name })),
      borrowingChangeGbpm: borrowingMovers,
      cumulativeBorrowingChangeGbpm: cumulativeMovers,
      debtChangePp: borrowingMovers,
      debtFallingPp: borrowingMovers,
      taxTakeChangePp: taxMovers,
      budget2025Reversals: reversals.map((l) => ({ title: title(l.code) })),
      promisesBroken: broken.map((p) => ({
        title: `${p.promise.noun}${p.brokenBy.length > 0 ? ` (${p.brokenBy.map((b) => title(b.code)).join(', ')})` : ''}`,
      })),
      manifestoBroken: manifestoBroken.map((p) => ({
        title: `${p.promise.noun} (${p.brokenBy.map((b) => title(b.code)).join(', ')})`,
      })),
      manifestoStrained: strained.map((s) => ({
        title: `${s.promise.noun} (${s.strainedBy.map((b) => title(b.code)).join(', ')})`,
      })),
      prioritiesUnfunded: unfunded.map((p) => ({ title: p.priority.noun })),
      prioritiesStarted: started.map((p) => ({ title: p.priority.noun })),
      prioritiesFunded: funded.map((p) => ({ title: p.priority.noun })),
      deliveredGbpm: funded.map((p) => ({ title: p.priority.noun })),
      clearPriorityGbpm:
        clearPriorityGbpm > 0 ? funded.map((p) => ({ title: p.priority.noun })) : [],
      welfareReversals: welfareReversals.map((l) => ({ title: title(l.code) })),
      welfareChangeGbpm: topBy(welfareEffects, (e) => e.currentSpending[year] ?? 0),
      departmentsCut: cutDepartments.map((l) => ({ title: title(l.code) })),
      rebellionRisk: [
        ...broken.map((p) => ({ title: p.promise.noun })),
        ...unfunded.map((p) => ({ title: p.priority.noun })),
        ...welfareReversals.map((l) => ({ title: title(l.code) })),
        ...welfareCuts.map((l) => ({ title: title(l.code) })),
      ],
      credibilityShare: uncertifiedTitles.map((t) => ({ title: t })),
      reliefShareOfUncertified: uncertifiedTitles.map((t) => ({ title: t })),
      priceRaisingMeasures: priceRaisers.map((l) => ({ title: title(l.code) })),
      thresholdFreezeKept: moved.has('rvfrz') ? [{ title: title('rvfrz') }] : [],
      efficienciesKept: moved.has('rveff') ? [{ title: title('rveff') }] : [],
      publicServiceSpendingGbpm: topBy(departments, spendOf),
      capitalChangeGbpm: topBy(policyEffects, (e) => e.capitalSpending[year] ?? 0),
      taxRisesGbpm: topBy(rises, (e) => e.receipts[year] ?? 0),
      taxCutsGbpm: topBy(cuts, (e) => -(e.receipts[year] ?? 0)),
      netRevenueGbpm: taxMovers,
      progressiveBalanceGbpm: signed(progressiveRows),
      headroomChangeGbpm: headroomMovers,
      investmentHeadroomGbpm: debtHeadroomMovers,
      fiscalRulesMissed: borrowingMovers,
      serviceCutsGbpm: topBy(departments, cutOf),
      protectedCutsGbpm: topBy(protectedEffects, cutOf),
      feltTaxRisesGbpm: topBy(feltRises, (e) => e.receipts[year] ?? 0),
      notFeltTaxRisesGbpm: topBy(notFeltRises, (e) => e.receipts[year] ?? 0),
      paidForStatus: borrowingMovers,
      frontLoadedBorrowingGbpm: frontMovers,
      commitmentsBroken: commitmentsBroken.flatMap((p) =>
        p.brokenBy.map((b) => ({ title: title(b.code) })),
      ),
      lateYieldShare: topBy(late, (e) => e.receipts[year] ?? 0),
    },
    words: {
      payers: inWords(payers),
      feltHow,
      protected: namesOf(protectedEffects),
      protectedCut: formatGbpBn(protectedCuts, 1),
      cutServices: namesOf(departments),
      year,
      lateFrom,
    },
  };
  return out;
}

/** The readings alone. */
export function readings(input: ReadingsInput): Record<string, number> {
  return readingsWithCauses(input).values;
}

/**
 * What the public feels is not a band: it is the distributional consideration each moved lever
 * already carries, with its own sources. Ordered by the size of the lever's effect.
 */
/**
 * What the Budget may do to growth, in words (Phase 25): the note on the wider economy carried by
 * the biggest measure moved that has one; else the tool's own note that choices can affect growth
 * but the game does not model it. Commentary with its sources; never a number of the game's own.
 */
export function growthNote(
  outcome: Outcome,
  levers: readonly Lever[],
  year: string,
): DistributionalNote | null {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const noteOf = (lever: Lever): DistributionalNote | null => {
    const c = lever.considerations.find((x) => x.kind === 'macro' && x.growth);
    return c
      ? {
          leverId: lever.id,
          leverTitle: lever.shortTitle,
          text: c.text,
          magnitudeWords: c.magnitudeWords ?? '',
          sources: c.sources,
        }
      : null;
  };
  const moved = outcome.leverEffects
    .map((e) => ({
      lever: byCode.get(e.code),
      size:
        Math.abs(at(e.receipts, year)) +
        Math.abs(at(e.currentSpending, year)) +
        Math.abs(at(e.capitalSpending, year)),
    }))
    .filter((x): x is { lever: Lever; size: number } => x.lever !== undefined)
    .filter((x) => x.lever.category !== 'macro')
    .sort((a, b) => b.size - a.size);
  for (const { lever } of moved) {
    const note = noteOf(lever);
    if (note) return note;
  }
  for (const lever of levers) {
    if (lever.category !== 'macro') continue;
    const note = noteOf(lever);
    if (note) return note;
  }
  return null;
}

export function distributionalNotes(
  outcome: Outcome,
  levers: readonly Lever[],
  year: string,
): DistributionalNote[] {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const notes: Array<{ size: number; note: DistributionalNote }> = [];
  for (const effect of outcome.leverEffects) {
    const lever = byCode.get(effect.code);
    if (!lever) continue;
    const size =
      Math.abs(at(effect.receipts, year)) +
      Math.abs(at(effect.currentSpending, year)) +
      Math.abs(at(effect.capitalSpending, year));
    for (const consideration of lever.considerations) {
      if (consideration.kind !== 'distributional') continue;
      notes.push({
        size,
        note: {
          leverId: lever.id,
          leverTitle: lever.shortTitle,
          text: consideration.text,
          magnitudeWords: consideration.magnitudeWords ?? '',
          sources: consideration.sources,
        },
      });
    }
  }
  return notes.sort((a, b) => b.size - a.size).map((n) => n.note);
}
