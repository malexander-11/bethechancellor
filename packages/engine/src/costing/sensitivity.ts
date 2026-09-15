import { EngineError } from '../errors.js';
import type { Lever, Vintage } from '../types/data.js';
import type { LeverEffect } from '../types/engine.js';
import { mapYears, zeros } from '../calc/series.js';

/** Cost a macro assumption slider from an OBR sensitivity (methodology §7). */
export function costSensitivityLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  policyYears: readonly string[],
): LeverEffect {
  if (lever.costing.kind !== 'sensitivity') {
    throw new EngineError(`lever ${lever.id} is not a sensitivity lever`);
  }
  const sensitivityId = lever.costing.sensitivityId;
  const sens = vintage.sensitivities.find((s) => s.id === sensitivityId);
  if (!sens) {
    throw new EngineError(
      `vintage ${vintage.id} has no sensitivity "${sensitivityId}" for lever ${lever.id}`,
    );
  }
  const units = value / sens.perUnit;
  const useDecrease = value < 0 && sens.effectOnPsnbGbpmDecrease !== undefined;
  const table = useDecrease ? sens.effectOnPsnbGbpmDecrease! : sens.effectOnPsnbGbpm;
  const scale = useDecrease ? -units : units;

  const macroPsnb = mapYears(policyYears, (y) => (table[y] ?? 0) * scale);
  const macroCurrent = mapYears(policyYears, (y) => (macroPsnb[y] ?? 0) * sens.currentBudgetShare);

  let gdpGrowthAdjustmentPp = 0;
  let marginalRateAdjustmentPp = 0;
  for (const adj of sens.adjusts ?? []) {
    if (adj.target === 'nominalGdp') gdpGrowthAdjustmentPp = value;
    if (adj.target === 'marginalInterestRate') marginalRateAdjustmentPp = value;
  }

  const warnings: string[] = [];
  if (sens.provisional) {
    warnings.push(
      `${lever.shortTitle}: the OBR publishes the end-year effect; the year-by-year path is an assumption (${sens.rampNote}).`,
    );
  }

  return {
    leverId: lever.id,
    code: lever.code,
    category: lever.category,
    title: lever.title,
    value,
    badge: lever.badge,
    receipts: zeros(policyYears),
    currentSpending: zeros(policyYears),
    capitalSpending: zeros(policyYears),
    welfareInCap: zeros(policyYears),
    macroPsnb,
    macroCurrent,
    gdpGrowthAdjustmentPp,
    marginalRateAdjustmentPp,
    steps: [
      {
        op: 'scale',
        formula: `${value} ${sens.unit} ÷ ${sens.perUnit} ${sens.unit} per unit = ${units} × OBR effect on borrowing by year${useDecrease ? ' (decrease table)' : ''}`,
        factor: scale,
        source: sens.source,
        note: sens.rampNote,
      },
    ],
    warnings,
  };
}
