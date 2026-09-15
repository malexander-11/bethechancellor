import { fyStart } from '../calc/years.js';
import { EngineError } from '../errors.js';
import type { Lever, Vintage, YearValues } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { applyClassification, emptyEffect } from './shared.js';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** A dated schedule (e.g. reversing a scorecard measure): values as authored, zero before implementation. */
export function costScheduleLever(
  lever: Lever,
  value: number,
  _vintage: Vintage,
  settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const costing = lever.costing;
  if (costing.kind !== 'schedule')
    throw new EngineError(`lever ${lever.id} is not a schedule lever`);
  const effect = emptyEffect(lever, value, policyYears);
  const start = fyStart(settings.implementationYear);
  const scaled: YearValues = {};
  const raw: YearValues = {};
  const factor: YearValues = {};
  const sourceYearFor: Record<string, string> = {};
  for (const y of policyYears) {
    const published = costing.effect[y] ?? 0;
    const active = fyStart(y) >= start;
    scaled[y] = active ? published * value : 0;
    raw[y] = active ? published : 0;
    factor[y] = value;
    sourceYearFor[y] = y;
  }
  applyClassification(effect, lever, scaled);
  effect.steps.push({
    op: 'manual',
    formula: `Scheduled effect × ${value} from ${settings.implementationYear}: ${policyYears
      .filter((y) => fyStart(y) >= start)
      .map((y) => `${y}: ${fmt(scaled[y] ?? 0)}`)
      .join(', ')}`,
    factor: value,
    source: costing.source,
  });
  effect.detail = { sourceYearFor, raw, factor, uprated: scaled, caveats: costing.caveats };
  return effect;
}
