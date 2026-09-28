/**
 * The readings of a Budget: every figure the reception (game/reception.ts) and the close can
 * compare with an authored threshold, and the decisions behind each. Nothing here invents a mood
 * or predicts a market move: a reading is arithmetic over the outcome, and the words about it
 * live in data/journey/reception.json with their sources.
 */
import type { IncidenceFile, Lever, PmFile, SourceRef } from './types/data.js';
import type { GamePermalink, Outcome } from './types/engine.js';
import type { AmbitionStatus } from './game/ambitions.js';

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
const PROGRESSIVE_GROUPS = new Set(['top', 'savers-owners', 'business']);
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
  /** Words the reception's sentences fill in: `{payers}`, the groups who pay the most. */
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
  const { baseline, policy } = outcome.paths;

  const headroom = stability?.headroomGbpm ?? 0;
  const borrowingChange = at(policy.psnb, year) - at(baseline.psnb, year);
  const cumulativeBorrowing = outcome.paths.policyYears.reduce(
    (acc, y) => acc + at(policy.psnb, y) - at(baseline.psnb, y),
    0,
  );
  const debtChange = at(policy.psnflPctGdp, year) - at(baseline.psnflPctGdp, year);
  const debtFalling = at(policy.psnflPctGdp, year) - at(policy.psnflPctGdp, previous);
  const taxTakeChange =
    (at(policy.receipts, year) / at(policy.nominalGdpFy, year) -
      at(baseline.receipts, year) / at(baseline.nominalGdpFy, year)) *
    100;

  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const values = outcome.settings.leverValues;
  const valueOf = (code: string) => values[code] ?? byCode.get(code)?.control.default ?? 0;
  // Every reversal of a Budget 2025 or Autumn Budget 2024 decision, whichever screen it sits on.
  const reversals = levers.filter((l) => moved.has(l.code) && /^rv/.test(l.code));
  const welfareReversals = levers.filter((l) => moved.has(l.code) && WELFARE_REVERSALS.has(l.code));
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
  const publicServiceSpending = policyEffects.reduce((acc, e) => acc + spendOf(e), 0);
  const capitalChange = policyEffects.reduce((acc, e) => acc + (e.capitalSpending[year] ?? 0), 0);
  const welfareEffects = policyEffects.filter((e) => e.category === 'welfare');
  const welfareChange = welfareEffects.reduce((acc, e) => acc + (e.currentSpending[year] ?? 0), 0);
  const rises = policyEffects.filter((e) => (e.receipts[year] ?? 0) > 0);
  const cuts = policyEffects.filter((e) => (e.receipts[year] ?? 0) < 0);
  const taxRises = rises.reduce((acc, e) => acc + (e.receipts[year] ?? 0), 0);
  const taxCuts = cuts.reduce((acc, e) => acc - (e.receipts[year] ?? 0), 0);
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
  const manifestoBroken = broken.filter((p) => p.promise.breaks.length > 0);
  // Amber (Phase 23): the pledge's words kept, its spirit tested; a promise also broken counts once.
  const strained = (status?.strains ?? []).filter(
    (s) => s.strained && !broken.some((p) => p.promise.id === s.promise.id),
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
      rebellionRisk: broken.length * 2 + unfunded.length + welfareReversals.length,
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
        title: `${lowerFirst(p.promise.title)}${p.brokenBy.length > 0 ? ` (${p.brokenBy.map((b) => title(b.code)).join(', ')})` : ''}`,
      })),
      manifestoBroken: manifestoBroken.map((p) => ({
        title: `${lowerFirst(p.promise.title)} (${p.brokenBy.map((b) => title(b.code)).join(', ')})`,
      })),
      manifestoStrained: strained.map((s) => ({
        title: `${lowerFirst(s.promise.title)} (${s.strainedBy.map((b) => title(b.code)).join(', ')})`,
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
        ...broken.map((p) => ({ title: lowerFirst(p.promise.title) })),
        ...unfunded.map((p) => ({ title: p.priority.noun })),
        ...welfareReversals.map((l) => ({ title: title(l.code) })),
      ],
      credibilityShare: uncertifiedTitles.map((t) => ({ title: t })),
      reliefShareOfUncertified: uncertifiedTitles.map((t) => ({ title: t })),
      priceRaisingMeasures: priceRaisers.map((l) => ({ title: title(l.code) })),
      thresholdFreezeKept: moved.has('rvfrz') ? [{ title: title('rvfrz') }] : [],
      efficienciesKept: moved.has('rveff') ? [{ title: title('rveff') }] : [],
      publicServiceSpendingGbpm: topBy(policyEffects, spendOf),
      capitalChangeGbpm: topBy(policyEffects, (e) => e.capitalSpending[year] ?? 0),
      taxRisesGbpm: topBy(rises, (e) => e.receipts[year] ?? 0),
      taxCutsGbpm: topBy(cuts, (e) => -(e.receipts[year] ?? 0)),
      netRevenueGbpm: taxMovers,
      progressiveBalanceGbpm: signed(progressiveRows),
    },
    words: { payers: inWords(payers) },
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
