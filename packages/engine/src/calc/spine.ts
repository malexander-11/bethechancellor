import { EngineError } from '../errors.js';
import type { Lever, RuleSet, Vintage } from '../types/data.js';
import type {
  AttributionRow,
  LeverEffect,
  Outcome,
  Settings,
  SettingsInput,
} from '../types/engine.js';
import { costLever } from '../costing/index.js';
import { evaluateRules } from '../rules/verdicts.js';
import { aggregateEffects } from './aggregate.js';
import { policyYearsOf, runFiscalArithmetic } from './arithmetic.js';

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
  return {
    leverValues: { ...(input?.leverValues ?? {}) },
    implementationYear: input?.implementationYear ?? defaultImplementation,
    debtInterestFeedback: input?.debtInterestFeedback ?? true,
    assessAsOf: input?.assessAsOf ?? 'vintage',
  };
}

/** Snap a raw lever value to the control's step and range. */
export function normaliseLeverValue(lever: Lever, raw: number): number {
  const { min, max, step } = lever.control;
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
  const attribution: AttributionRow[] = effects.map((e) => ({
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
  }));
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

  return {
    vintageId: vintage.id,
    rulesId: rules.id,
    settings,
    paths,
    leverEffects: effects,
    verdicts,
    attribution,
    warnings,
  };
}
