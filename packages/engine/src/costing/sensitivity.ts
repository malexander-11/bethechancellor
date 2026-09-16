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
    financialTransactions: zeros(policyYears),
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

/**
 * Which way a macro slider moves borrowing: +1 if turning it up raises PSNB, −1 if it lowers it.
 *
 * Derived from the sign of the OBR's own sensitivity table, never authored. The vintage's
 * convention is that `effectOnPsnbGbpm` is the effect of a `+perUnit` change and positive means
 * more borrowing, so `Math.sign` over its values is the whole answer.
 *
 * Read the increase table only. `rpi1pp` carries an `effectOnPsnbGbpmDecrease` whose values are
 * negative because they state the effect *of the decrease*; taking the sign from there would
 * invert the answer. The asymmetry is one of magnitude (£11bn up against £10bn down), not
 * direction.
 */
export function psnbDirection(vintage: Vintage, sensitivityId: string): 1 | -1 {
  const sens = vintage.sensitivities.find((s) => s.id === sensitivityId);
  if (!sens) {
    throw new EngineError(`vintage ${vintage.id} has no sensitivity "${sensitivityId}"`);
  }
  const signs = new Set(
    Object.values(sens.effectOnPsnbGbpm)
      .filter((v) => v !== 0)
      .map((v) => Math.sign(v)),
  );
  if (signs.size !== 1) {
    // A table that helps in one year and hurts in another has no single direction, so a caller
    // asking "is up good or bad" is asking a question the data cannot answer.
    throw new EngineError(
      `sensitivity ${sensitivityId} does not move borrowing one way: ${signs.size === 0 ? 'every year is zero' : 'its years disagree in sign'}`,
    );
  }
  return signs.has(1) ? 1 : -1;
}

/** The setting that hurts the public finances more, given which way this slider cuts. */
export function moreHarmful(direction: 1 | -1, a: number, b: number): number {
  return direction * a >= direction * b ? a : b;
}
