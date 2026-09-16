import { computeOutcome } from '../calc/spine.js';
import type { Lever, RuleSet, Vintage } from '../types/data.js';
import type { LeverEffect, LeverRevision, Outcome, Settings } from '../types/engine.js';

/**
 * The OBR's in-game forecast, taken apart without double counting (ADR-0012). Three outcomes,
 * each one `computeOutcome` call:
 *
 *   A. what you planned on      planning outlook · measures as scored
 *   B. the economy moved         the OBR's draw    · measures as scored
 *   C. the OBR re-scored you     the OBR's draw    · measures revised
 *
 * Economy = B − A, costings = C − B, total = C − A, all read off the stability rule's headroom.
 * The economy line includes what dearer money does to the player's own borrowing, because the
 * debt-interest feedback runs on the increment while the sensitivity covers the baseline stock:
 * not a double count, but the label on the page says so.
 */

export interface DecompositionInput {
  vintage: Vintage;
  rules: RuleSet;
  levers: readonly Lever[];
  /** Everything but the macro sliders, plus delays and the assessment basis. */
  settings: Omit<Settings, 'leverValues' | 'revisions'>;
  /** Policy lever values: the package. Macro codes in here are ignored. */
  policy: Record<string, number>;
  /** The macro sliders as the player planned on them. */
  planningMacro: Record<string, number>;
  /** The macro sliders as the OBR's draw set them. */
  drawMacro: Record<string, number>;
  revisions: Record<string, LeverRevision>;
  macroCodes: readonly string[];
}

export interface Decomposition {
  planned: Outcome;
  economy: Outcome;
  revised: Outcome;
  /** Headroom against the stability rule in its target year, £ million, for each of the three. */
  headroom: { planned: number; economy: number; revised: number };
  /** The three lines the page shows; economy + costings = total exactly. */
  economyGbpm: number;
  costingsGbpm: number;
  totalGbpm: number;
  targetYear: string;
}

function headroomOf(outcome: Outcome): number {
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}

function withoutMacro(
  values: Record<string, number>,
  macroCodes: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [code, v] of Object.entries(values)) if (!macroCodes.includes(code)) out[code] = v;
  return out;
}

export function decomposeForecast(input: DecompositionInput): Decomposition {
  const policy = withoutMacro(input.policy, input.macroCodes);
  const run = (macro: Record<string, number>, revisions?: Record<string, LeverRevision>) =>
    computeOutcome({
      vintage: input.vintage,
      rules: input.rules,
      levers: input.levers,
      settings: {
        ...input.settings,
        leverValues: { ...policy, ...macro },
        ...(revisions && Object.keys(revisions).length > 0 ? { revisions } : {}),
      },
    });
  const planned = run(input.planningMacro);
  const economy = run(input.drawMacro);
  const revised = run(input.drawMacro, input.revisions);
  const h = {
    planned: headroomOf(planned),
    economy: headroomOf(economy),
    revised: headroomOf(revised),
  };
  return {
    planned,
    economy,
    revised,
    headroom: h,
    economyGbpm: h.economy - h.planned,
    costingsGbpm: h.revised - h.economy,
    totalGbpm: h.revised - h.planned,
    targetYear:
      revised.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ??
      revised.paths.policyYears[revised.paths.policyYears.length - 1] ??
      '',
  };
}

export interface RevisedMeasure {
  effect: LeverEffect;
  revision: LeverRevision;
  /** Effect on borrowing in the target year as originally scored and as the OBR now scores it, £m. */
  asScoredGbpm: number;
  revisedGbpm: number;
}

/** The measures the in-game OBR re-scored, with the figure before and after, for the second panel. */
export function revisedMeasures(outcome: Outcome, targetYear: string): RevisedMeasure[] {
  const out: RevisedMeasure[] = [];
  for (const effect of outcome.leverEffects) {
    if (!effect.revision) continue;
    const revisedGbpm =
      (effect.currentSpending[targetYear] ?? 0) +
      (effect.capitalSpending[targetYear] ?? 0) -
      (effect.receipts[targetYear] ?? 0);
    const asScoredGbpm = effect.revision.factor === 0 ? 0 : revisedGbpm / effect.revision.factor;
    out.push({ effect, revision: effect.revision, asScoredGbpm, revisedGbpm });
  }
  return out.sort(
    (a, b) => Math.abs(b.revisedGbpm - b.asScoredGbpm) - Math.abs(a.revisedGbpm - a.asScoredGbpm),
  );
}
