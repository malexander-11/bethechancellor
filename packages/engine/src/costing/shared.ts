import { EngineError } from '../errors.js';
import { zeros } from '../calc/series.js';
import type { Lever, Vintage, YearValues } from '../types/data.js';
import type { CostingDetail, LeverEffect } from '../types/engine.js';
import { headSourceTable } from './taxHead.js';
import { uprateToForecast, type UpratedSeries } from './uprate.js';

export function emptyEffect(
  lever: Lever,
  value: number,
  policyYears: readonly string[],
): LeverEffect {
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
    macroPsnb: zeros(policyYears),
    macroCurrent: zeros(policyYears),
    gdpGrowthAdjustmentPp: 0,
    marginalRateAdjustmentPp: 0,
    steps: [],
    warnings: [],
  };
}

/** Route an engine-sign effect series into receipts or the right spending line per the classification. */
export function applyClassification(effect: LeverEffect, lever: Lever, values: YearValues): void {
  const c = lever.classification;
  if (!c) throw new EngineError(`lever ${lever.id} has no classification`);
  for (const [year, v] of Object.entries(values)) {
    if (c.side === 'receipts') {
      effect.receipts[year] = (effect.receipts[year] ?? 0) + v;
    } else if (c.currentOrCapital === 'capital') {
      effect.capitalSpending[year] = (effect.capitalSpending[year] ?? 0) + v;
    } else {
      effect.currentSpending[year] = (effect.currentSpending[year] ?? 0) + v;
    }
    if (c.side === 'spending' && c.insideWelfareCap) {
      effect.welfareInCap[year] = (effect.welfareInCap[year] ?? 0) + v;
    }
  }
}

export function upratePublished(
  lever: Lever,
  years: string[],
  rawByPublishedYear: YearValues,
  vintage: Vintage,
  implementationYear: string,
  policyYears: readonly string[],
): UpratedSeries {
  const costing = lever.costing;
  if (costing.kind !== 'linearPerUnit' && costing.kind !== 'lookupTable') {
    throw new EngineError(`lever ${lever.id}: costing ${costing.kind} has no uprating rule`);
  }
  const headSource = {
    sourceId: vintage.primarySource.sourceId,
    table:
      costing.uprating.method === 'growWithSeries'
        ? headSourceTable(costing.uprating.head)
        : 'not used',
  };
  return uprateToForecast(
    { years, values: rawByPublishedYear },
    costing.uprating,
    vintage,
    implementationYear,
    policyYears,
    headSource,
  );
}

export function buildDetail(
  uprated: UpratedSeries,
  rawByPublishedYear: YearValues,
  caveats: string[],
): CostingDetail {
  const raw: YearValues = {};
  for (const [target, sourceYear] of Object.entries(uprated.sourceYearFor)) {
    raw[target] = rawByPublishedYear[sourceYear] ?? 0;
  }
  return {
    sourceYearFor: uprated.sourceYearFor,
    raw,
    factor: uprated.factors,
    uprated: uprated.values,
    caveats,
  };
}
