/**
 * Budget day feedback: how your Budget reads to four audiences, on the afternoon and the morning
 * after. Every signal is a rule over the outcome, and every word it shows is authored in
 * data/journey/reactions.json with its sources. Nothing here invents a mood or predicts a market
 * move: the bands describe what commentators watch, the reading that selected the band is always
 * shown beside the text, and each signal names the decisions that moved its reading.
 */
import type {
  Lever,
  ReactionBand,
  ReactionSignalSpec,
  ReactionsFile,
  SourceRef,
} from './types/data.js';
import type { GamePermalink, Outcome } from './types/engine.js';
import type { AmbitionStatus } from './game/ambitions.js';

export interface ReactionSignal {
  id: string;
  audience: 'rules' | 'markets' | 'parliament' | 'public';
  group?: string;
  phase: 'afternoon' | 'morning';
  level: 'good' | 'mixed' | 'bad' | 'neutral';
  headline: string;
  detail: string;
  reading: { label: string; value: number; unit: 'GBPm' | 'pp' | 'ratio' | 'count' | 'status' };
  sources: SourceRef[];
  /** The decisions behind the reading, as the levers' own short titles. */
  causes: string[];
}

/** A distributional note carried straight from a lever the player moved. */
export interface DistributionalNote {
  leverId: string;
  leverTitle: string;
  text: string;
  magnitudeWords: string;
  sources: SourceRef[];
}

export interface ReactionsInput {
  outcome: Outcome;
  levers: readonly Lever[];
  reactions: ReactionsFile;
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
export function readingsWithCauses(input: ReactionsInput): Readings {
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

  const out: Readings = {
    values: {
      stabilityHeadroomGbpm: headroom,
      stabilityHeadroomVsTypicalError: typicalErrorGbpm > 0 ? headroom / typicalErrorGbpm : 0,
      investmentRuleStatus: STATUS_ORDER[investment?.status ?? 'unavailable'] ?? 3,
      welfareCapStatus: STATUS_ORDER[welfare?.status ?? 'unavailable'] ?? 3,
      borrowingChangeGbpm: borrowingChange,
      cumulativeBorrowingChangeGbpm: cumulativeBorrowing,
      debtChangePp: debtChange,
      debtFallingPp: debtFalling,
      taxTakeChangePp: taxTakeChange,
      recommendationsAdopted: adopted.length,
      budget2025Reversals: reversals.length,
      headroomVsTargetGbpm: headroom - target,
      promisesBroken: broken.length,
      prioritiesUnfunded: unfunded.length,
      prioritiesFunded: funded.length,
      welfareReversals: welfareReversals.length,
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
    },
    causes: {
      stabilityHeadroomGbpm: movers,
      stabilityHeadroomVsTypicalError: movers,
      investmentRuleStatus: movers,
      welfareCapStatus: welfareReversals.map((l) => l.shortTitle),
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
      prioritiesUnfunded: unfunded.map((p) => p.flagship.title),
      prioritiesFunded: funded.map((p) => p.flagship.title),
      welfareReversals: welfareReversals.map((l) => l.shortTitle),
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
    },
  };
  return out;
}

/** The readings alone, as the earlier tests and callers expect them. */
export function readings(input: ReactionsInput): Record<string, number> {
  return readingsWithCauses(input).values;
}

function bandFor(spec: ReactionSignalSpec, value: number): ReactionBand {
  for (const band of spec.bands) {
    if (band.upTo === undefined || value <= band.upTo) return band;
  }
  // The schema requires a final band with no upTo, so this is unreachable in validated data.
  const last = spec.bands[spec.bands.length - 1];
  if (!last) throw new Error(`reaction signal ${spec.id} has no bands`);
  return last;
}

/** Deterministic: the same outcome always produces the same signals, in the authored order. */
export function computeReactions(input: ReactionsInput): ReactionSignal[] {
  const { values, causes } = readingsWithCauses(input);
  return input.reactions.signals.map((spec) => {
    const value = values[spec.measure] ?? 0;
    const band = bandFor(spec, value);
    return {
      id: spec.id,
      audience: spec.audience,
      ...(spec.group ? { group: spec.group } : {}),
      phase: spec.phase,
      level: band.level,
      headline: band.headline,
      detail: band.detail,
      reading: { label: spec.reading.label, value, unit: spec.reading.unit },
      sources: band.sources,
      causes: causes[spec.measure] ?? [],
    };
  });
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
