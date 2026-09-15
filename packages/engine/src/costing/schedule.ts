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
  // A one-off falls entirely in the implementation year; a yearly schedule runs from it.
  const onceYear = Object.keys(costing.effect)[0] ?? '';
  const onceAmount = costing.effect[onceYear] ?? 0;
  for (const y of policyYears) {
    const published = costing.once
      ? y === settings.implementationYear
        ? onceAmount
        : 0
      : (costing.effect[y] ?? 0);
    const active = costing.once ? true : fyStart(y) >= start;
    scaled[y] = active ? published * value : 0;
    raw[y] = active ? published : 0;
    factor[y] = value;
    sourceYearFor[y] = costing.once ? onceYear : y;
  }
  applyClassification(effect, lever, scaled);
  effect.steps.push({
    op: 'manual',
    formula: costing.once
      ? `One-off payment of ${fmt(onceAmount)} × ${value} in ${settings.implementationYear}`
      : `Scheduled effect × ${value} from ${settings.implementationYear}: ${policyYears
          .filter((y) => fyStart(y) >= start)
          .map((y) => `${y}: ${fmt(scaled[y] ?? 0)}`)
          .join(', ')}`,
    factor: value,
    source: costing.source,
  });
  effect.detail = { sourceYearFor, raw, factor, uprated: scaled, caveats: costing.caveats };
  return effect;
}
