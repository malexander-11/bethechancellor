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
import { isMissed } from '../rules/words.js';
import { ambitionStatus, type AmbitionStatus, type PriorityReport } from './ambitions.js';
import { blockedBy } from './options.js';
import { groupsInWords, inWords, lowerFirst } from './words.js';
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

/** Spending cuts at least this large, and larger than the tax rises, pay for a Budget by cuts. */
export const PAID_BY_CUTS_GBPM = 1_000;

/** Every rise and cut counted: at least this much moving in the target year is a big Budget. */
export const BIG_MOVES_GBPM = 5_000;

/** A group given less than this is too small to name among the cuts, £ million. */
const PAID_BY_CUTS_NAMED_GBPM = 100;

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
  /**
   * The kind of Budget, a judgement from data; `fact`, when the kind has one, is the worked-out
   * sentence behind it (Phase 25), shown with its own badge.
   */
  kind: { title: string; line: SimulatedLine; id: string; fact?: string };
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
      ? p.promise.judgedBy === 'fiscalRules'
        ? 'broken-by-arithmetic'
        : 'broken-by-choice'
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

  const rulesMet = !outcome.verdicts.some(isMissed);
  const delivered = status.delivered;
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const nounOf = (code: string) => byCode.get(code)?.noun ?? byCode.get(code)?.shortTitle ?? code;
  const money = (gbpm: number) => formatGbpBn(gbpm, 1, gbpm < 0);
  const headroomOf = (o: Outcome) =>
    o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;

  // Was the broken promise needed? Put the levers that break it back and re-run the engine on the
  // same estimate (Phase 25, Worked out). A lever inside a priority's chosen way to deliver it is
  // the programme itself, so a break there is never called avoidable.
  const programme = new Set(
    status.priorities.flatMap((p) =>
      p.options
        .filter((o) => o.state === 'on' || o.state === 'adjusted')
        .flatMap((o) => Object.keys(o.option.values)),
    ),
  );
  const breakers = [
    ...new Set(
      status.promises
        .filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules')
        .flatMap((p) => p.brokenBy.map((b) => b.code)),
    ),
  ];
  let withoutBreak: number | undefined;
  if (rulesMet && breakers.length > 0 && breakers.every((code) => !programme.has(code))) {
    const without = input.outcomeOf(withDefaults(values, breakers, levers));
    if (!without.verdicts.some(isMissed)) withoutBreak = headroomOf(without);
  }

  // Cuts, rises and how much moved in the target year, every lever counted, never netted.
  let cuts = 0;
  let rises = 0;
  let gross = 0;
  for (const e of outcome.leverEffects) {
    if (e.category === 'macro') continue;
    const receipts = e.receipts[year] ?? 0;
    const spending = (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
    if (receipts > 0) rises += receipts;
    if (spending < 0) cuts -= spending;
    gross += Math.abs(receipts) + Math.abs(spending);
  }
  // Who gets less, by the groups' own labels: a lever's noun can read backwards here ("cutting
  // the 2025 PIP cuts"), a group cannot.
  const cutFrom = benefited
    .filter((r) => r.gbpm <= -PAID_BY_CUTS_NAMED_GBPM)
    .slice(0, 2)
    .map((r) => lowerFirst(r.label));

  // A priority left out with money to spare: the first unfunded priority, in rank order, whose
  // way to deliver it in full would still meet the rules on the same estimate (Worked out).
  let leftOut: { noun: string; option: string; headroomGbpm: number } | undefined;
  if (rulesMet) {
    for (const p of status.priorities) {
      if (p.status !== 'notFunded') continue;
      let best: { option: string; headroomGbpm: number } | undefined;
      for (const o of p.options) {
        if (o.option.scale.kind !== 'full') continue;
        if (blockedBy(o.option, input.options, levers, values)) continue;
        const trial = input.outcomeOf({ ...values, ...o.option.values });
        if (trial.verdicts.some(isMissed)) continue;
        const h = headroomOf(trial);
        if (!best || h > best.headroomGbpm) best = { option: o.option.title, headroomGbpm: h };
      }
      if (best) {
        leftOut = { noun: p.priority.noun, ...best };
        break;
      }
    }
  }

  const facts: Record<string, boolean> = {
    rulesMet,
    promisesAllKept: status.promises.every((p) => p.kept),
    prioritiesAllFunded: status.priorities.length > 0 && delivered === status.priorities.length,
    prioritiesNoneFunded: status.priorities.every((p) => p.status === 'notFunded'),
    headroomAmple: headroom >= AMPLE_HEADROOM_GBPM,
    // The markets' own line (Phase 25): the close, the statement and the reception agree.
    headroomThin: headroom < THIN_HEADROOM_GBPM,
    certified: input.credibilityShare <= 0.1,
    restive: input.rebellionRisk >= 3,
    breakAvoidable: withoutBreak !== undefined,
    paidByCuts: cuts >= PAID_BY_CUTS_GBPM && cuts > rises,
    bigMoves: gross >= BIG_MOVES_GBPM,
    leftOutAffordable: leftOut !== undefined,
  };
  const chosen =
    input.kinds.kinds.find((k) => fits(k, facts)) ??
    input.kinds.kinds.find((k) => k.id === input.kinds.fallback) ??
    input.kinds.kinds[0]!;
  // The first priority ranked names the Budget: "A cost-of-living Budget that…".
  const priorityWords = prioritiesInWords(pm, game.priorities.slice(0, 1));
  const words: Record<string, string> = {
    priority: priorityWords,
    headroom: money(headroom),
    breakers: inWords(breakers.map(nounOf)),
    withoutBreak: withoutBreak === undefined ? '' : money(withoutBreak),
    cutFrom: groupsInWords(cutFrom),
    leftOut: leftOut?.noun ?? '',
    leftOutOption: leftOut?.option ?? '',
    withRoom: leftOut ? money(leftOut.headroomGbpm) : '',
  };
  const fillText = (s: string) =>
    s
      .replace(/\{(\w+)\}/g, (match, key: string) => words[key] ?? match)
      .replace(/\s+,/g, ',')
      .replace(/\s{2,}/g, ' ');
  return {
    ambitions,
    paid,
    benefited,
    kind: {
      id: chosen.id,
      title: fillText(chosen.title),
      line: {
        ...chosen.line,
        text: fillText(chosen.line.text),
        ...(chosen.line.short ? { short: fillText(chosen.line.short) } : {}),
      },
      ...(chosen.fact ? { fact: fillText(chosen.fact) } : {}),
    },
    targetYear: year,
    headroomGbpm: headroom,
  };
}
