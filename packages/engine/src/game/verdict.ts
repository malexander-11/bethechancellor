import { computeOutcome } from '../calc/spine.js';
import { formatGbpBn } from '../format.js';
import type {
  ContextFile,
  DrawOutcome,
  DrawsFile,
  IncidenceFile,
  Lever,
  PmFile,
  RuleSet,
  SimulatedLine,
  VerdictKind,
  VerdictsFile,
  Vintage,
} from '../types/data.js';
import type { GamePermalink, Outcome, Settings } from '../types/engine.js';
import { ambitionStatus, type AmbitionStatus, type PriorityReport } from './ambitions.js';
import { drawSettings, pickOutcome, revisionsFor } from './draw.js';

/**
 * The close (stage 7): what the playthrough came to. Which ambitions survived and how each
 * promise fared; who paid and who benefited, the engine's figures totalled by the incidence tags;
 * the compromises that mattered, ranked; how the final package fares under every forecast the
 * draw could have produced; and the kind of Budget it was, which is a judgement chosen from data
 * and badged as one. Nothing here adds a number: it totals, ranks and re-runs the engine.
 */

export type PriorityFate = 'delivered' | 'narrowed' | 'delayed' | 'unfunded';
export type PromiseFate = 'kept' | 'broken-by-choice' | 'broken-by-arithmetic';

export interface AmbitionVerdict {
  priorities: { title: string; fate: PriorityFate; costGbpm: number }[];
  promises: { title: string; fate: PromiseFate; by?: string[] }[];
}

export interface IncidenceRow {
  group: string;
  label: string;
  /** £ million in the target year: receipts raised from payers, spending directed to beneficiaries. */
  gbpm: number;
  levers: string[];
}

export interface CompromiseRow {
  lever: Lever;
  from: number;
  to: number;
  /** Change in borrowing in the target year from the move, £ million; negative = saved. */
  deltaGbpm: number;
}

export interface ResilienceRow {
  outcome: DrawOutcome;
  headroomGbpm: number;
  rulesMissed: string[];
  /** The one that actually arrived in this playthrough. */
  drawn: boolean;
}

export interface BudgetVerdict {
  ambitions: AmbitionVerdict;
  paid: IncidenceRow[];
  benefited: IncidenceRow[];
  compromises: CompromiseRow[];
  resilience: ResilienceRow[];
  kind: { title: string; line: SimulatedLine; id: string };
  targetYear: string;
  headroomGbpm: number;
}

export interface VerdictInput {
  vintage: Vintage;
  rules: RuleSet;
  levers: readonly Lever[];
  pm: PmFile;
  draws: DrawsFile;
  context: ContextFile;
  incidence: IncidenceFile;
  kinds: VerdictsFile;
  game: GamePermalink;
  outcome: Outcome;
  snapshot?: Record<string, number>;
  macroCodes: readonly string[];
  typicalErrorGbpm: number;
  /** Readings the reactions engine already computed, for the kind of Budget. */
  credibilityShare: number;
  rebellionRisk: number;
}

function effectOnBorrowing(outcome: Outcome, code: string, year: string): number {
  const e = outcome.leverEffects.find((x) => x.code === code);
  if (!e) return 0;
  return (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0) - (e.receipts[year] ?? 0);
}

function priorityFate(p: PriorityReport): PriorityFate {
  if (p.status === 'delayed') return 'delayed';
  if (p.status === 'funded') return 'delivered';
  if (p.status === 'part-funded') return 'narrowed';
  return 'unfunded';
}

/** Which ambitions survived, and how each promise fared and why. */
export function ambitionVerdict(status: AmbitionStatus, levers: readonly Lever[]): AmbitionVerdict {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const priorities = status.priorities.map((p) => ({
    title: p.flagship.title,
    fate: priorityFate(p),
    costGbpm: p.costGbpm,
  }));
  const promises: AmbitionVerdict['promises'] = status.promises.map((p) => ({
    title: p.promise.title,
    fate: p.kept
      ? ('kept' as const)
      : p.promise.breaks.length > 0
        ? ('broken-by-choice' as const)
        : ('broken-by-arithmetic' as const),
    ...(p.brokenBy.length > 0
      ? { by: p.brokenBy.map((b) => byCode.get(b.code)?.shortTitle ?? b.code) }
      : {}),
  }));
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

/** What changed between the forecast and Budget day, ranked by what it did to borrowing. */
export function compromiseRows(
  input: Pick<VerdictInput, 'vintage' | 'rules' | 'levers' | 'outcome' | 'snapshot' | 'macroCodes'>,
  year: string,
): CompromiseRow[] {
  if (!input.snapshot) return [];
  const byCode = new Map(input.levers.map((l) => [l.code, l] as const));
  const values = input.outcome.settings.leverValues;
  const before: Record<string, number> = {};
  for (const [code, v] of Object.entries(input.snapshot)) {
    if (!input.macroCodes.includes(code)) before[code] = v;
  }
  for (const code of input.macroCodes) if (values[code] !== undefined) before[code] = values[code]!;
  const changed = [...new Set([...Object.keys(before), ...Object.keys(values)])].filter((code) => {
    const lever = byCode.get(code);
    if (!lever || input.macroCodes.includes(code)) return false;
    return (before[code] ?? lever.control.default) !== (values[code] ?? lever.control.default);
  });
  if (changed.length === 0) return [];
  const snapshotOutcome = computeOutcome({
    vintage: input.vintage,
    rules: input.rules,
    levers: input.levers,
    settings: { ...input.outcome.settings, leverValues: before },
  });
  return changed
    .map((code) => {
      const lever = byCode.get(code)!;
      return {
        lever,
        from: before[code] ?? lever.control.default,
        to: values[code] ?? lever.control.default,
        deltaGbpm:
          effectOnBorrowing(input.outcome, code, year) -
          effectOnBorrowing(snapshotOutcome, code, year),
      };
    })
    .sort((a, b) => Math.abs(b.deltaGbpm) - Math.abs(a.deltaGbpm));
}

/** The final package under every forecast the draw could have produced. */
export function resilienceRows(
  input: Pick<
    VerdictInput,
    'vintage' | 'rules' | 'levers' | 'draws' | 'context' | 'outcome' | 'macroCodes' | 'game'
  >,
): ResilienceRow[] {
  const drawn = pickOutcome(input.game.seed, input.draws.outcomes).id;
  const policy: Record<string, number> = {};
  for (const [code, v] of Object.entries(input.outcome.settings.leverValues)) {
    if (!input.macroCodes.includes(code)) policy[code] = v;
  }
  const base: Omit<Settings, 'leverValues' | 'revisions'> = {
    implementationYear: input.outcome.settings.implementationYear,
    debtInterestFeedback: input.outcome.settings.debtInterestFeedback,
    assessAsOf: input.outcome.settings.assessAsOf,
    ...(input.outcome.settings.implementationYearByCode
      ? { implementationYearByCode: input.outcome.settings.implementationYearByCode }
      : {}),
  };
  return input.draws.outcomes.map((outcome) => {
    const { values } = drawSettings(outcome, input.context, input.levers);
    const revisions = revisionsFor(outcome, input.levers);
    const run = computeOutcome({
      vintage: input.vintage,
      rules: input.rules,
      levers: input.levers,
      settings: {
        ...base,
        leverValues: { ...policy, ...values },
        ...(Object.keys(revisions).length > 0 ? { revisions } : {}),
      },
    });
    const stability = run.verdicts.find((v) => v.kind === 'currentBudget');
    return {
      outcome,
      headroomGbpm: stability?.headroomGbpm ?? 0,
      rulesMissed: run.verdicts
        .filter((v) => v.status === 'notMet' || v.status === 'aboveMargin')
        .map((v) => v.ruleName),
      drawn: outcome.id === drawn,
    };
  });
}

function fits(
  kind: VerdictKind,
  facts: Record<string, boolean>,
  themes: readonly string[],
): boolean {
  for (const [key, want] of Object.entries(kind.when)) {
    if (want === undefined) continue;
    // A kind keyed to a theme fits a Budget that ticked that theme, among others or alone.
    if (key === 'themeIs') {
      if (!themes.includes(String(want))) return false;
      continue;
    }
    if (facts[key] !== want) return false;
  }
  return true;
}

/** "cost of living", "security and cost of living", "a, b and c": the ticked themes as words. */
export function themesInWords(pm: PmFile, themes: readonly string[]): string {
  const titles = themes
    .map((id) => pm.themes.find((t) => t.id === id)?.title)
    .filter((t): t is string => t !== undefined)
    .map((t) => t.charAt(0).toLowerCase() + t.slice(1));
  if (titles.length <= 1) return titles[0] ?? '';
  return `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`;
}

export function budgetVerdict(input: VerdictInput): BudgetVerdict {
  const { game, outcome, levers, pm } = input;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const status = ambitionStatus(game, pm, outcome, levers);
  const ambitions = ambitionVerdict(status, levers);
  const { paid, benefited } = incidenceRows(outcome, levers, input.incidence, year);
  const compromises = compromiseRows(input, year);
  const resilience = resilienceRows(input);

  const rulesMet = !outcome.verdicts.some(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const target = game.headroomTargetBn * 1000;
  const funded = status.priorities.filter(
    (p) => p.status === 'funded' || p.status === 'delayed',
  ).length;
  const facts: Record<string, boolean> = {
    rulesMet,
    breachAccepted: game.breachAccepted,
    promisesAllKept: status.broken === 0,
    prioritiesAllFunded: status.priorities.length > 0 && funded === status.priorities.length,
    prioritiesNoneFunded: funded === 0,
    headroomAtLeastTarget: headroom >= target,
    headroomThin: headroom < input.typicalErrorGbpm / 2,
    rabbitKept: game.rabbit === 'keep',
    certified: input.credibilityShare <= 0.1,
    restive: input.rebellionRisk >= 3,
  };
  const chosen =
    input.kinds.kinds.find((k) => fits(k, facts, game.themes)) ??
    input.kinds.kinds.find((k) => k.id === input.kinds.fallback) ??
    input.kinds.kinds[0]!;
  const themeWords = themesInWords(pm, game.themes);
  const fillText = (s: string) =>
    s
      .replace(/\{theme\}/g, themeWords)
      .replace(/\{headroom\}/g, formatGbpBn(headroom, 1, headroom < 0))
      .replace(/\s+,/g, ',')
      .replace(/\s{2,}/g, ' ');
  return {
    ambitions,
    paid,
    benefited,
    compromises,
    resilience,
    kind: {
      id: chosen.id,
      title: fillText(chosen.title),
      line: { ...chosen.line, text: fillText(chosen.line.text) },
    },
    targetYear: year,
    headroomGbpm: headroom,
  };
}
