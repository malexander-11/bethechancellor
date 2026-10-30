import type { IncidenceFile, Lever } from '../types/data.js';
import type { Outcome } from '../types/engine.js';
import { isMissed } from '../rules/words.js';
import type { AmbitionStatus } from './ambitions.js';
import { withDefaults, type OutcomeOf } from './prices.js';

/**
 * What the review reads of a Budget beyond its rules: who paid and who benefited, the engine's
 * figures totalled by the incidence tags; whether a broken promise was needed; where a margin turns
 * thin. Nothing here adds a number: it totals and re-runs the engine.
 */

/**
 * Below this much headroom the margin is thin: the ten billion commentators called wafer-thin
 * before Budget 2025, the ceiling of the markets' "thin" band (reception.json, mk-headroom).
 */
export const THIN_HEADROOM_GBPM = 10_000;

export interface IncidenceRow {
  group: string;
  label: string;
  /** £ million in the target year: receipts raised from payers, spending directed to beneficiaries. */
  gbpm: number;
  levers: string[];
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

/** The levers that break a promise with levers of its own, each once. */
function breakingCodes(status: AmbitionStatus): string[] {
  return [
    ...new Set(
      status.promises
        .filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules')
        .flatMap((p) => p.brokenBy.map((b) => b.code)),
    ),
  ];
}

/**
 * Was the broken promise needed (Phase 25, Worked out)? Put the levers that break it back and
 * re-run the engine on the same estimate: the headroom without the break when both rules would
 * still be met, else undefined. A break in a Budget that already misses a rule is never called
 * avoidable.
 */
export function headroomWithoutBreak(input: {
  status: AmbitionStatus;
  outcome: Outcome;
  levers: readonly Lever[];
  outcomeOf: OutcomeOf;
}): number | undefined {
  const { status, outcome, levers } = input;
  // The two fiscal rules: the welfare cap can be missed before any measure is moved.
  const missesRule = (v: Outcome['verdicts'][number]) => v.kind !== 'welfareCap' && isMissed(v);
  if (outcome.verdicts.some(missesRule)) return undefined;
  const breakers = breakingCodes(status);
  if (breakers.length === 0) return undefined;
  const without = input.outcomeOf(withDefaults(outcome.settings.leverValues, breakers, levers));
  if (without.verdicts.some(missesRule)) return undefined;
  return without.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}
