import type { Deltas, LeverEffect } from '../types/engine.js';
import { addInto, zeros } from './series.js';

export interface Aggregated {
  deltas: Deltas;
  growthAdjPp: number;
  marginalRateAdjPp: number;
}

export function aggregateEffects(
  effects: readonly LeverEffect[],
  policyYears: readonly string[],
): Aggregated {
  const deltas: Deltas = {
    receipts: zeros(policyYears),
    currentSpending: zeros(policyYears),
    capitalSpending: zeros(policyYears),
    welfareInCap: zeros(policyYears),
    macroPsnb: zeros(policyYears),
    macroCurrent: zeros(policyYears),
  };
  let growthAdjPp = 0;
  let marginalRateAdjPp = 0;
  for (const e of effects) {
    addInto(deltas.receipts, e.receipts);
    addInto(deltas.currentSpending, e.currentSpending);
    addInto(deltas.capitalSpending, e.capitalSpending);
    addInto(deltas.welfareInCap, e.welfareInCap);
    addInto(deltas.macroPsnb, e.macroPsnb);
    addInto(deltas.macroCurrent, e.macroCurrent);
    growthAdjPp += e.gdpGrowthAdjustmentPp;
    marginalRateAdjPp += e.marginalRateAdjustmentPp;
  }
  return { deltas, growthAdjPp, marginalRateAdjPp };
}
