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
  /** The package as it left the desk, re-run under today's conditions, for the compromises line. */
  snapshotOutcome?: Outcome;
  macroCodes?: readonly string[];
  /** The rabbit: the lever it moved, if any, and what to call it. */
  rabbit?: { code?: string; label: string };
  /** The PM file, for which themes a funded flagship delivers. */
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

export interface Readings {
  values: Record<string, number>;
  causes: Record<string, string[]>;
}

/** Every reading the signals can use, and the decisions behind each, computed once. */
export function readingsWithCauses(input: ReadingsInput): Readings {
  const { outcome, levers, typicalErrorGbpm, game, status } = input;
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const title = (code: string) => byCode.get(code)?.shortTitle ?? code;
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
  const adopted = levers.filter((l) => l.category === 'campaign' && moved.has(l.code));
  const reversals = levers.filter(
    (l) => moved.has(l.code) && /^rv/.test(l.code) && l.category !== 'campaign',
  );
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

  // The biggest movers of borrowing in the target year, macro rows included as one cause.
  const movers = [...outcome.attribution]
    .filter((r) => r.kind !== 'debtInterest')
    .sort((a, b) => Math.abs(b.psnbGbpm) - Math.abs(a.psnbGbpm))
    .slice(0, 3)
    .map((r) => (r.kind === 'macro' ? 'the OBR’s forecast' : r.code ? title(r.code) : r.label));
  const taxMovers = outcome.leverEffects
    .filter((e) => e.category === 'tax' || (e.receipts[year] ?? 0) !== 0)
    .sort((a, b) => Math.abs(b.receipts[year] ?? 0) - Math.abs(a.receipts[year] ?? 0))
    .slice(0, 3)
    .map((e) => title(e.code));

  // Credibility: how much of what improves the current budget rests on figures nobody certified.
  let improving = 0;
  let uncertified = 0;
  const uncertifiedTitles: string[] = [];
  for (const effect of outcome.leverEffects) {
    if (effect.category === 'macro') continue;
    const improvement =
      (effect.receipts[year] ?? 0) -
      (effect.currentSpending[year] ?? 0) -
      (effect.macroCurrent[year] ?? 0);
    if (improvement <= 0) continue;
    improving += improvement;
    if (effect.badge === 'assumption' || effect.badge === 'simulated') {
      uncertified += improvement;
      uncertifiedTitles.push(title(effect.code));
    }
  }

  // The game's own readings.
  const target = (game?.headroomTargetBn ?? 0) * 1000;
  const broken = status?.promises.filter((p) => !p.kept) ?? [];
  const unfunded =
    status?.priorities.filter((p) => p.status !== 'funded' && p.status !== 'delayed') ?? [];
  const funded =
    status?.priorities.filter((p) => p.status === 'funded' || p.status === 'delayed') ?? [];
  const delayed = Object.keys(game?.delays ?? {}).filter((code) => moved.has(code));
  let compromises = 0;
  const compromised: string[] = [];
  if (input.snapshotOutcome) {
    const macro = new Set(input.macroCodes ?? []);
    for (const before of input.snapshotOutcome.leverEffects) {
      const lever = byCode.get(before.code);
      if (!lever || macro.has(before.code) || lever.category === 'tax') continue;
      const cost = (e: typeof before | undefined) =>
        e ? (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0) : 0;
      const saving = cost(before) - cost(outcome.leverEffects.find((e) => e.code === before.code));
      if (saving > 0.5) {
        compromises += saving;
        compromised.push(title(before.code));
      }
    }
  }
  const rabbitEffect = input.rabbit?.code
    ? outcome.leverEffects.find((e) => e.code === input.rabbit?.code)
    : undefined;
  const rabbitGbpm = rabbitEffect
    ? (rabbitEffect.receipts[year] ?? 0) -
      (rabbitEffect.currentSpending[year] ?? 0) -
      (rabbitEffect.capitalSpending[year] ?? 0)
    : 0;
  const missedRules = outcome.verdicts
    .filter((v) => v.status === 'notMet' || v.status === 'aboveMargin')
    .map((v) => v.ruleName);

  // Spending, tax and who pays, in the target year (Phase 9). Titles are the levers' own.
  const policyEffects = outcome.leverEffects.filter((e) => e.category !== 'macro');
  const spendOf = (e: (typeof policyEffects)[number]) =>
    (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
  const topBy = (
    list: typeof policyEffects,
    size: (e: (typeof policyEffects)[number]) => number,
  ): string[] =>
    [...list]
      .filter((e) => size(e) !== 0)
      .sort((a, b) => Math.abs(size(b)) - Math.abs(size(a)))
      .slice(0, 3)
      .map((e) => title(e.code));
  const publicServiceSpending = policyEffects.reduce((acc, e) => acc + spendOf(e), 0);
  const capitalChange = policyEffects.reduce((acc, e) => acc + (e.capitalSpending[year] ?? 0), 0);
  const welfareEffects = policyEffects.filter((e) => e.category === 'welfare');
  const welfareChange = welfareEffects.reduce((acc, e) => acc + (e.currentSpending[year] ?? 0), 0);
  const rises = policyEffects.filter((e) => (e.receipts[year] ?? 0) > 0);
  const cuts = policyEffects.filter((e) => (e.receipts[year] ?? 0) < 0);
  const taxRises = rises.reduce((acc, e) => acc + (e.receipts[year] ?? 0), 0);
  const taxCuts = cuts.reduce((acc, e) => acc - (e.receipts[year] ?? 0), 0);
  let progressive = 0;
  const progressiveCauses: string[] = [];
  if (input.incidence) {
    for (const e of rises) {
      const group = input.incidence.levers[e.code];
      if (!group) continue;
      if (PROGRESSIVE_GROUPS.has(group)) progressive += e.receipts[year] ?? 0;
      else if (BROAD_GROUPS.has(group)) progressive -= e.receipts[year] ?? 0;
      else continue;
      progressiveCauses.push(title(e.code));
    }
  }
  // Themes: a ticked theme is delivered when a funded flagship it offers, or a cross-cutting
  // one, is in the package; one theme with everything ticked funded is a clear story.
  const themes = game?.themes ?? [];
  const fundedIds = new Set(funded.map((p) => p.flagship.id));
  const crossFunded = (input.pm?.crossCutting ?? []).some((id) => fundedIds.has(id));
  const delivered = (input.pm?.themes ?? []).filter(
    (t) => themes.includes(t.id) && (crossFunded || t.flagships.some((id) => fundedIds.has(id))),
  );
  const fundedFlagshipsGbpm = funded.reduce((acc, p) => acc + Math.abs(p.costGbpm), 0);
  const clearThemeGbpm =
    themes.length === 1 && funded.length > 0 && unfunded.length === 0 ? fundedFlagshipsGbpm : 0;
  const manifestoBroken = broken.filter((p) => p.promise.breaks.length > 0);

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
      recommendationsAdopted: adopted.length,
      budget2025Reversals: reversals.length,
      headroomVsTargetGbpm: headroom - target,
      promisesBroken: broken.length,
      manifestoBroken: manifestoBroken.length,
      prioritiesUnfunded: unfunded.length,
      prioritiesFunded: funded.length,
      fundedFlagshipsGbpm,
      themesChosen: themes.length,
      themesDelivered: delivered.length,
      clearThemeGbpm,
      welfareReversals: welfareReversals.length,
      welfareChangeGbpm: welfareChange,
      departmentsCut: cutDepartments.length,
      rebellionRisk: broken.length * 2 + unfunded.length + welfareReversals.length,
      credibilityShare: improving > 0 ? uncertified / improving : 0,
      priceRaisingMeasures: priceRaisers.length,
      compromisesGbpm: compromises,
      rabbitGbpm,
      breachAccepted: game?.breachAccepted ? 1 : 0,
      delayedMeasures: delayed.length,
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
      stabilityHeadroomGbpm: movers,
      stabilityHeadroomVsTypicalError: movers,
      investmentRuleStatus: movers,
      welfareCapStatus: welfareReversals.map((l) => l.shortTitle),
      rulesMissed: missedRules,
      borrowingChangeGbpm: movers,
      cumulativeBorrowingChangeGbpm: movers,
      debtChangePp: movers,
      debtFallingPp: movers,
      taxTakeChangePp: taxMovers,
      recommendationsAdopted: adopted.map((l) => l.shortTitle),
      budget2025Reversals: reversals.map((l) => l.shortTitle),
      headroomVsTargetGbpm: movers,
      promisesBroken: broken.map(
        (p) =>
          `${p.promise.title}${p.brokenBy.length > 0 ? ` (${p.brokenBy.map((b) => title(b.code)).join(', ')})` : ''}`,
      ),
      manifestoBroken: manifestoBroken.map(
        (p) => `${p.promise.title} (${p.brokenBy.map((b) => title(b.code)).join(', ')})`,
      ),
      prioritiesUnfunded: unfunded.map((p) => p.flagship.title),
      prioritiesFunded: funded.map((p) => p.flagship.title),
      fundedFlagshipsGbpm: funded.map((p) => p.flagship.title),
      themesChosen: (input.pm?.themes ?? [])
        .filter((t) => themes.includes(t.id))
        .map((t) => t.title),
      themesDelivered: delivered.map((t) => t.title),
      clearThemeGbpm: clearThemeGbpm > 0 ? funded.map((p) => p.flagship.title) : [],
      welfareReversals: welfareReversals.map((l) => l.shortTitle),
      welfareChangeGbpm: topBy(welfareEffects, (e) => e.currentSpending[year] ?? 0),
      departmentsCut: cutDepartments.map((l) => l.shortTitle),
      rebellionRisk: [
        ...broken.map((p) => p.promise.title),
        ...unfunded.map((p) => p.flagship.title),
        ...welfareReversals.map((l) => l.shortTitle),
      ],
      credibilityShare: uncertifiedTitles,
      priceRaisingMeasures: priceRaisers.map((l) => l.shortTitle),
      compromisesGbpm: compromised,
      rabbitGbpm: input.rabbit ? [input.rabbit.label] : [],
      breachAccepted: missedRules,
      delayedMeasures: delayed.map((code) => `${title(code)} → ${game?.delays[code] ?? ''}`),
      thresholdFreezeKept: moved.has('rvfrz') ? [title('rvfrz')] : [],
      efficienciesKept: moved.has('rveff') ? [title('rveff')] : [],
      publicServiceSpendingGbpm: topBy(policyEffects, spendOf),
      capitalChangeGbpm: topBy(policyEffects, (e) => e.capitalSpending[year] ?? 0),
      taxRisesGbpm: topBy(rises, (e) => e.receipts[year] ?? 0),
      taxCutsGbpm: topBy(cuts, (e) => e.receipts[year] ?? 0),
      netRevenueGbpm: taxMovers,
      progressiveBalanceGbpm: progressiveCauses.slice(0, 3),
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
