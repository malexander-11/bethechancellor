import { formatGbpBn } from '../format.js';
import type {
  IncidenceFile,
  Lever,
  OptionsFile,
  PmFile,
  SimulatedLine,
  VerdictKind,
  VerdictsFile,
} from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import { ambitionStatus, type AmbitionStatus, type PriorityReport } from './ambitions.js';
import { priceMove, withDefaults, type OutcomeOf } from './prices.js';

/**
 * The close (the feedback, step 6): what the playthrough came to. Which ambitions survived and
 * how each promise fared; who paid and who benefited, the engine's figures totalled by the
 * incidence tags; and the kind of Budget it was, which is a judgement chosen from data and badged
 * as one. Nothing here adds a number: it totals and ranks the engine's figures.
 */

/**
 * Below this much headroom the margin is thin: the ten billion commentators called wafer-thin
 * before Budget 2025, the ceiling of the markets' "thin" band (reception.json, mk-headroom).
 */
export const THIN_HEADROOM_GBPM = 10_000;

/**
 * At or above this much the margin is ample: the advisers' rule of thumb of twenty billion, the
 * ceiling of the markets' "modest" band (reception.json, mk-headroom). A judgement, not a
 * published threshold, and badged as one wherever it is said.
 */
export const AMPLE_HEADROOM_GBPM = 20_000;

/** Graded in Phase 25: a start is not delivery, and a trim on step 4 settles an ask lower. */
export type PriorityFate = 'delivered' | 'settledLower' | 'started' | 'unfunded';
/** `strained` (Phase 23): kept in its words, tested in its spirit; amber, not red. */
export type PromiseFate = 'kept' | 'strained' | 'broken-by-choice' | 'broken-by-arithmetic';

export interface AmbitionVerdict {
  /**
   * `priceGbpm` is the one price (Phase 25): what the options counting towards the priority do to
   * the headroom in the target year, interest included; negative costs, positive saves.
   */
  priorities: { title: string; fate: PriorityFate; priceGbpm: number }[];
  promises: { title: string; fate: PromiseFate; by?: string[] }[];
}

export interface IncidenceRow {
  group: string;
  label: string;
  /** £ million in the target year: receipts raised from payers, spending directed to beneficiaries. */
  gbpm: number;
  levers: string[];
}

export interface BudgetVerdict {
  ambitions: AmbitionVerdict;
  paid: IncidenceRow[];
  benefited: IncidenceRow[];
  kind: { title: string; line: SimulatedLine; id: string };
  targetYear: string;
  headroomGbpm: number;
}

export interface VerdictInput {
  levers: readonly Lever[];
  pm: PmFile;
  options: OptionsFile;
  incidence: IncidenceFile;
  kinds: VerdictsFile;
  game: GamePermalink;
  outcome: Outcome;
  typicalErrorGbpm: number;
  /** Readings the reactions engine already computed, for the kind of Budget. */
  credibilityShare: number;
  rebellionRisk: number;
  /** The engine re-run under the Budget's own settings, for each priority's one price. */
  outcomeOf: OutcomeOf;
}

function priorityFate(p: PriorityReport): PriorityFate {
  if (p.status === 'notFunded') return 'unfunded';
  return p.status;
}

/**
 * Which ambitions survived, and how each promise fared and why. A priority's figure is its price
 * by id, when given: what its options do to the headroom (Phase 25); nought without one.
 */
export function ambitionVerdict(
  status: AmbitionStatus,
  levers: readonly Lever[],
  prices: ReadonlyMap<string, number> = new Map(),
): AmbitionVerdict {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const priorities = status.priorities.map((p) => ({
    title: p.priority.title,
    fate: priorityFate(p),
    priceGbpm: prices.get(p.priority.id) ?? 0,
  }));
  const strainedBy = new Map(
    status.strains.filter((s) => s.strained).map((s) => [s.promise.id, s.strainedBy] as const),
  );
  const promises: AmbitionVerdict['promises'] = status.promises.map((p) => {
    const strain = p.kept ? strainedBy.get(p.promise.id) : undefined;
    const fate: PromiseFate = !p.kept
      ? p.promise.breaks.length > 0
        ? 'broken-by-choice'
        : 'broken-by-arithmetic'
      : strain
        ? 'strained'
        : 'kept';
    const by = p.brokenBy.length > 0 ? p.brokenBy : (strain ?? []);
    return {
      title: p.promise.title,
      fate,
      ...(by.length > 0 ? { by: by.map((b) => byCode.get(b.code)?.shortTitle ?? b.code) } : {}),
    };
  });
  return { priorities, promises };
}

/** The engine's figures in the target year, totalled by who they fall on. */
export function incidenceRows(
  outcome: Outcome,
  levers: readonly Lever[],
  incidence: IncidenceFile,
  year: string,
): { paid: IncidenceRow[]; benefited: IncidenceRow[] } {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const totals = new Map<string, IncidenceRow>();
  for (const effect of outcome.leverEffects) {
    const lever = byCode.get(effect.code);
    const group = incidence.levers[effect.code];
    if (!lever || !group) continue;
    const spec = incidence.groups[group];
    if (!spec) continue;
    const gbpm =
      spec.side === 'pays'
        ? (effect.receipts[year] ?? 0)
        : (effect.currentSpending[year] ?? 0) + (effect.capitalSpending[year] ?? 0);
    if (Math.abs(gbpm) < 0.5) continue;
    const row = totals.get(group) ?? { group, label: spec.label, gbpm: 0, levers: [] };
    row.gbpm += gbpm;
    row.levers.push(lever.shortTitle);
    totals.set(group, row);
  }
  const rows = [...totals.values()].sort((a, b) => Math.abs(b.gbpm) - Math.abs(a.gbpm));
  return {
    paid: rows.filter((r) => incidence.groups[r.group]?.side === 'pays'),
    benefited: rows.filter((r) => incidence.groups[r.group]?.side === 'benefits'),
  };
}

function fits(kind: VerdictKind, facts: Record<string, boolean>): boolean {
  for (const [key, want] of Object.entries(kind.when)) {
    if (want === undefined) continue;
    if (facts[key] !== want) return false;
  }
  return true;
}

/** "the cost of living", "defence and the NHS", "a, b and c": the ranked priorities as words. */
export function prioritiesInWords(pm: PmFile, ids: readonly string[]): string {
  const nouns = ids
    .map((id) => pm.priorities.find((p) => p.id === id)?.noun)
    .filter((n): n is string => n !== undefined);
  if (nouns.length <= 1) return nouns[0] ?? '';
  return `${nouns.slice(0, -1).join(', ')} and ${nouns[nouns.length - 1]}`;
}

export function budgetVerdict(input: VerdictInput): BudgetVerdict {
  const { game, outcome, levers, pm } = input;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const status = ambitionStatus(game, pm, input.options, outcome, levers);
  // Each priority's one price: the Budget as it stands against it without the options that count.
  const values = outcome.settings.leverValues;
  const prices = new Map(
    status.priorities.map((p) => {
      const codes = p.options
        .filter((o) => o.state === 'on' || o.state === 'adjusted')
        .flatMap((o) => Object.keys(o.option.values));
      if (codes.length === 0) return [p.priority.id, 0] as const;
      const price = priceMove({
        outcomeOf: input.outcomeOf,
        levers,
        from: withDefaults(values, codes, levers),
        to: values,
      });
      return [p.priority.id, price.headroomChangeGbpm] as const;
    }),
  );
  const ambitions = ambitionVerdict(status, levers, prices);
  const { paid, benefited } = incidenceRows(outcome, levers, input.incidence, year);

  const rulesMet = !outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const delivered = status.delivered;
  const facts: Record<string, boolean> = {
    rulesMet,
    promisesAllKept: status.broken === 0,
    prioritiesAllFunded: status.priorities.length > 0 && delivered === status.priorities.length,
    prioritiesNoneFunded: status.priorities.every((p) => p.status === 'notFunded'),
    headroomAmple: headroom >= AMPLE_HEADROOM_GBPM,
    headroomThin: headroom < input.typicalErrorGbpm / 2,
    certified: input.credibilityShare <= 0.1,
    restive: input.rebellionRisk >= 3,
  };
  const chosen =
    input.kinds.kinds.find((k) => fits(k, facts)) ??
    input.kinds.kinds.find((k) => k.id === input.kinds.fallback) ??
    input.kinds.kinds[0]!;
  // The first priority ranked names the Budget: "A cost-of-living Budget that…".
  const priorityWords = prioritiesInWords(pm, game.priorities.slice(0, 1));
  const fillText = (s: string) =>
    s
      .replace(/\{priority\}/g, priorityWords)
      .replace(/\{headroom\}/g, formatGbpBn(headroom, 1, headroom < 0))
      .replace(/\s+,/g, ',')
      .replace(/\s{2,}/g, ' ');
  return {
    ambitions,
    paid,
    benefited,
    kind: {
      id: chosen.id,
      title: fillText(chosen.title),
      line: { ...chosen.line, text: fillText(chosen.line.text) },
    },
    targetYear: year,
    headroomGbpm: headroom,
  };
}
