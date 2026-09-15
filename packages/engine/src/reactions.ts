/**
 * Budget day feedback: how your Budget reads to four audiences. Every signal is a rule over the
 * outcome, and every word it shows is authored in data/journey/reactions.json with its sources.
 * Nothing here invents a mood or predicts a market move: the bands describe what commentators
 * watch, and the reading that selected the band is always shown beside the text.
 */
import type {
  Lever,
  ReactionBand,
  ReactionSignalSpec,
  ReactionsFile,
  SourceRef,
} from './types/data.js';
import type { Outcome } from './types/engine.js';

export interface ReactionSignal {
  id: string;
  audience: 'rules' | 'markets' | 'parliament' | 'public';
  level: 'good' | 'mixed' | 'bad' | 'neutral';
  headline: string;
  detail: string;
  reading: { label: string; value: number; unit: 'GBPm' | 'pp' | 'ratio' | 'count' | 'status' };
  sources: SourceRef[];
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
}

const STATUS_ORDER: Record<string, number> = {
  met: 0,
  withinCap: 0,
  aboveCapWithinMargin: 1,
  notMet: 2,
  aboveMargin: 2,
  unavailable: 3,
};

function at(values: Record<string, number>, year: string): number {
  return values[year] ?? 0;
}

/** Every reading the signals can use, computed once. */
export function readings(input: ReactionsInput): Record<string, number> {
  const { outcome, levers, typicalErrorGbpm } = input;
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
  const debtChange = at(policy.psnflPctGdp, year) - at(baseline.psnflPctGdp, year);
  const debtFalling = at(policy.psnflPctGdp, year) - at(policy.psnflPctGdp, previous);
  const taxTakeChange =
    (at(policy.receipts, year) / at(policy.nominalGdpFy, year) -
      at(baseline.receipts, year) / at(baseline.nominalGdpFy, year)) *
    100;

  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const adopted = levers.filter((l) => l.category === 'campaign' && moved.has(l.code)).length;
  const reversals = levers.filter(
    (l) => moved.has(l.code) && /^rv/.test(l.code) && l.category !== 'campaign',
  ).length;

  return {
    stabilityHeadroomGbpm: headroom,
    stabilityHeadroomVsTypicalError: typicalErrorGbpm > 0 ? headroom / typicalErrorGbpm : 0,
    investmentRuleStatus: STATUS_ORDER[investment?.status ?? 'unavailable'] ?? 3,
    welfareCapStatus: STATUS_ORDER[welfare?.status ?? 'unavailable'] ?? 3,
    borrowingChangeGbpm: borrowingChange,
    debtChangePp: debtChange,
    debtFallingPp: debtFalling,
    taxTakeChangePp: taxTakeChange,
    recommendationsAdopted: adopted,
    budget2025Reversals: reversals,
  };
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
  const values = readings(input);
  return input.reactions.signals.map((spec) => {
    const value = values[spec.measure] ?? 0;
    const band = bandFor(spec, value);
    return {
      id: spec.id,
      audience: spec.audience,
      level: band.level,
      headline: band.headline,
      detail: band.detail,
      reading: { label: spec.reading.label, value, unit: spec.reading.unit },
      sources: band.sources,
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
