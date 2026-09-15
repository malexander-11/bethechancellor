import { fyStart } from '../calc/years.js';
import { EngineError } from '../errors.js';
import type { DerivationStep, Lever, Vintage, YearValues } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { applyClassification, emptyEffect } from './shared.js';
import { describeHead, headSeries, headSourceTable } from './taxHead.js';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

export interface BaselinePath {
  /** £ million by policy year. */
  values: YearValues;
  /** Target year → the year its value was published for (itself, or the last plan year when extended). */
  sourceYearFor: Record<string, string>;
  /** First year carried beyond the published plan, if any. */
  extendedFrom?: string;
  steps: DerivationStep[];
  warnings: string[];
}

/**
 * The path a percentage-of-baseline lever scales: a vintage series as forecast, or a published
 * plan (a Spending Review settlement) for its own years, carried forward beyond the last plan
 * year with the growth of a vintage series (ADR-0006).
 */
export function baselinePath(
  lever: Lever,
  vintage: Vintage,
  policyYears: readonly string[],
): BaselinePath {
  const costing = lever.costing;
  if (costing.kind !== 'pctOfBaseline') {
    throw new EngineError(`lever ${lever.id} is not a percentage-of-baseline lever`);
  }
  const baseline = costing.baseline;
  const values: YearValues = {};
  const sourceYearFor: Record<string, string> = {};
  const steps: DerivationStep[] = [];
  const warnings: string[] = [];

  if (baseline.from === 'vintage') {
    const series = headSeries(vintage, baseline.series);
    for (const y of policyYears) {
      const v = series[y];
      if (v === undefined) {
        throw new EngineError(`vintage ${vintage.id} series "${baseline.series}" has no ${y}`);
      }
      values[y] = v;
      sourceYearFor[y] = y;
    }
    steps.push({
      op: 'manual',
      formula: `Baseline: the OBR forecast line "${baseline.series}" (${vintage.event}), £ million by year.`,
      source: { sourceId: vintage.primarySource.sourceId, table: headSourceTable(baseline.series) },
    });
    return { values, sourceYearFor, steps, warnings };
  }

  const published = [...baseline.years].sort((a, b) => fyStart(a) - fyStart(b));
  const first = published[0];
  const last = published[published.length - 1];
  if (!first || !last) throw new EngineError(`lever ${lever.id}: published baseline has no years`);
  const head = headSeries(vintage, baseline.extendWith);
  const lastValue = baseline.values[last] ?? 0;
  let extendedFrom: string | undefined;
  steps.push({
    op: 'manual',
    formula: `Baseline: the published plan for ${first} to ${last} (£ billion in the source, converted to £ million).`,
    source: costing.source,
  });
  for (const y of policyYears) {
    if (fyStart(y) < fyStart(first)) {
      values[y] = 0;
      warnings.push(`${lever.title}: no published plan for ${y}, so nothing is applied that year.`);
      continue;
    }
    if (fyStart(y) <= fyStart(last)) {
      const v = baseline.values[y];
      if (v === undefined) {
        throw new EngineError(`lever ${lever.id}: published baseline has no value for ${y}`);
      }
      values[y] = v;
      sourceYearFor[y] = y;
      continue;
    }
    const headTarget = head[y];
    const headLast = head[last];
    if (headTarget === undefined || headLast === undefined || headLast === 0) {
      throw new EngineError(
        `cannot extend: series "${baseline.extendWith}" missing for ${last} or ${y} in vintage ${vintage.id}`,
      );
    }
    const factor = headTarget / headLast;
    const value = lastValue * factor;
    values[y] = value;
    sourceYearFor[y] = last;
    extendedFrom ??= y;
    steps.push({
      op: 'extend',
      formula: `${y}: ${fmt(lastValue)} (plan for ${last}) × ${fmt(headTarget)} ÷ ${fmt(headLast)} (OBR ${describeHead(baseline.extendWith)}, ${y} ÷ ${last}) = ${fmt(value)}`,
      factor,
      from: last,
      to: y,
      source: {
        sourceId: vintage.primarySource.sourceId,
        table: headSourceTable(baseline.extendWith),
      },
      note: 'Assumption: the plan grows in line with the OBR total beyond the Spending Review period.',
    });
  }
  return { values, sourceYearFor, extendedFrom, steps, warnings };
}

/** Percentage change to a baseline path from the implementation year: effect = value ÷ 100 × baseline. */
export function costPctOfBaselineLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const costing = lever.costing;
  if (costing.kind !== 'pctOfBaseline') {
    throw new EngineError(`lever ${lever.id} is not a percentage-of-baseline lever`);
  }
  const effect = emptyEffect(lever, value, policyYears);
  const path = baselinePath(lever, vintage, policyYears);
  const start = fyStart(settings.implementationYear);
  const scaled: YearValues = {};
  const factor: YearValues = {};
  const activeYears: string[] = [];
  for (const y of policyYears) {
    const active = fyStart(y) >= start;
    scaled[y] = active ? (value / 100) * (path.values[y] ?? 0) : 0;
    factor[y] = active ? value / 100 : 0;
    if (active) activeYears.push(y);
  }
  applyClassification(effect, lever, scaled);
  effect.steps.push(...path.steps, {
    op: 'scale',
    formula: `${value}% of the baseline from ${settings.implementationYear}: ${activeYears
      .map((y) => `${y}: ${fmt(path.values[y] ?? 0)} × ${value}% = ${fmt(scaled[y] ?? 0)}`)
      .join(', ')}`,
    factor: value / 100,
    source: costing.source,
  });
  effect.warnings.push(...path.warnings);
  effect.detail = {
    sourceYearFor: path.sourceYearFor,
    raw: path.values,
    factor,
    uprated: scaled,
    caveats: costing.caveats,
    baseline: path.values,
    ...(path.extendedFrom ? { extendedFrom: path.extendedFrom } : {}),
  };
  return effect;
}
