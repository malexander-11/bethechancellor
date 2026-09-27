import { EngineError } from '../errors.js';
import type { Lever, RuleSet, Vintage } from '../types/data.js';
import type {
  AttributionRow,
  InteractionNotice,
  LeverEffect,
  Outcome,
  Settings,
  SettingsInput,
} from '../types/engine.js';
import { costLever } from '../costing/index.js';
import { evaluateRules } from '../rules/verdicts.js';
import { aggregateEffects } from './aggregate.js';
import { policyYearsOf, runFiscalArithmetic } from './arithmetic.js';
import { fyStart } from './years.js';

export interface ComputeInput {
  vintage: Vintage;
  rules: RuleSet;
  levers: readonly Lever[];
  settings?: SettingsInput;
}

/** Fill in defaults: implementation from the second forecast year, feedback on, assess as at the vintage. */
export function resolveSettings(vintage: Vintage, input: SettingsInput | undefined): Settings {
  const defaultImplementation =
    vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? vintage.years.inYear;
  const settings: Settings = {
    leverValues: { ...(input?.leverValues ?? {}) },
    implementationYear: input?.implementationYear ?? defaultImplementation,
    debtInterestFeedback: input?.debtInterestFeedback ?? true,
    assessAsOf: input?.assessAsOf ?? 'vintage',
  };
  if (input?.implementationYearByCode && Object.keys(input.implementationYearByCode).length > 0) {
    settings.implementationYearByCode = { ...input.implementationYearByCode };
  }
  return settings;
}

/** Snap a raw lever value to the control's step and range; a select snaps to its nearest offered option. */
export function normaliseLeverValue(lever: Lever, raw: number): number {
  const { min, max, step } = lever.control;
  if (lever.control.kind === 'select' && lever.control.labels) {
    const options = Object.keys(lever.control.labels)
      .map(Number)
      .filter((v) => Number.isFinite(v));
    if (options.length > 0) {
      return options.reduce((best, v) => (Math.abs(v - raw) < Math.abs(best - raw) ? v : best));
    }
  }
  const clamped = Math.min(max, Math.max(min, raw));
  const snapped = min + Math.round((clamped - min) / step) * step;
  const decimals = Math.max(0, Math.min(6, (step.toString().split('.')[1] ?? '').length));
  return Number(snapped.toFixed(decimals));
}

export function computeOutcome(input: ComputeInput): Outcome {
  const { vintage, rules, levers } = input;
  const settings = resolveSettings(vintage, input.settings);
  const policyYears = policyYearsOf(vintage);
  const warnings: string[] = [];

  const seen = new Set<string>();
  const effects: LeverEffect[] = [];
  for (const lever of levers) {
    if (seen.has(lever.code)) throw new EngineError(`duplicate lever code "${lever.code}"`);
    seen.add(lever.code);
    const raw = settings.leverValues[lever.code];
    if (raw === undefined) continue;
    const value = normaliseLeverValue(lever, raw);
    if (value === lever.control.default) continue;
    const effect = costLever(lever, value, vintage, settings, policyYears);
    effects.push(effect);
    warnings.push(...effect.warnings);
  }
  for (const code of Object.keys(settings.leverValues)) {
    if (!seen.has(code)) warnings.push(`Ignored unknown lever code "${code}".`);
  }

  const { deltas, growthAdjPp, marginalRateAdjPp } = aggregateEffects(effects, policyYears);
  const paths = runFiscalArithmetic({
    vintage,
    deltas,
    growthAdjPp,
    marginalRateAdjPp,
    debtInterestFeedback: settings.debtInterestFeedback,
  });
  const verdicts = evaluateRules(rules, vintage, paths, settings.assessAsOf);

  const stability = verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear =
    stability?.targetYear ?? vintage.years.forecast[3] ?? policyYears[policyYears.length - 1] ?? '';
  // A measure that does nothing in the target year but starts later names its first year.
  const size = (e: LeverEffect, y: string) =>
    Math.abs(e.receipts[y] ?? 0) +
    Math.abs(e.currentSpending[y] ?? 0) +
    Math.abs(e.capitalSpending[y] ?? 0) +
    Math.abs(e.macroPsnb[y] ?? 0);
  const startsAfterTarget = (e: LeverEffect): string | undefined =>
    size(e, targetYear) >= 0.5
      ? undefined
      : policyYears.find((y) => fyStart(y) > fyStart(targetYear) && size(e, y) >= 0.5);
  const attribution: AttributionRow[] = effects.map((e) => {
    const fromYear = startsAfterTarget(e);
    return {
      kind: e.category === 'macro' ? 'macro' : 'lever',
      code: e.code,
      label: e.title,
      badge: e.badge,
      currentBudgetGbpm:
        (e.currentSpending[targetYear] ?? 0) -
        (e.receipts[targetYear] ?? 0) +
        (e.macroCurrent[targetYear] ?? 0),
      psnbGbpm:
        (e.currentSpending[targetYear] ?? 0) +
        (e.capitalSpending[targetYear] ?? 0) -
        (e.receipts[targetYear] ?? 0) +
        (e.macroPsnb[targetYear] ?? 0),
      ...(fromYear ? { fromYear } : {}),
    };
  });
  const interest = paths.deltas.debtInterest[targetYear] ?? 0;
  if (Math.abs(interest) > 0.5) {
    attribution.push({
      kind: 'debtInterest',
      label: 'Debt interest on extra borrowing',
      badge: 'mechanical',
      currentBudgetGbpm: interest,
      psnbGbpm: interest,
    });
  }

  const interactions = findInteractions(levers, effects);

  return {
    vintageId: vintage.id,
    rulesId: rules.id,
    settings,
    paths,
    leverEffects: effects,
    verdicts,
    attribution,
    interactions,
    warnings,
  };
}

/** Surface authored interaction notes when both levers of a pair are away from their defaults. */
export function findInteractions(
  levers: readonly Lever[],
  effects: readonly LeverEffect[],
): InteractionNotice[] {
  const active = new Map(effects.map((e) => [e.leverId, e] as const));
  const byId = new Map(levers.map((l) => [l.id, l] as const));
  const seen = new Set<string>();
  const out: InteractionNotice[] = [];
  for (const lever of levers) {
    if (!active.has(lever.id)) continue;
    for (const interaction of lever.interactions ?? []) {
      const other = byId.get(interaction.withLever);
      if (!other || !active.has(other.id)) continue;
      const key = [lever.id, other.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        leverIds: [lever.id, other.id],
        codes: [lever.code, other.code],
        titles: [lever.shortTitle, other.shortTitle],
        text: interaction.text,
        severity: interaction.severity,
      });
    }
  }
  return out;
}
