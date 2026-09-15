import { EngineError } from '../errors.js';
import type { Lever, Vintage, YearValues } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { applyClassification, buildDetail, emptyEffect, upratePublished } from './shared.js';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** Piecewise-linear interpolation between published points; never extrapolates. */
export function interpolateLookup(
  points: ReadonlyArray<{ input: number; effect: YearValues }>,
  value: number,
): { effect: YearValues; lower: number; upper: number } {
  const sorted = [...points].sort((a, b) => a.input - b.input);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) throw new EngineError('lookup table needs at least two points');
  if (value < first.input || value > last.input) {
    throw new EngineError(
      `value ${value} is outside the published range [${first.input}, ${last.input}]`,
    );
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!a || !b) continue;
    if (value >= a.input && value <= b.input) {
      const t = b.input === a.input ? 0 : (value - a.input) / (b.input - a.input);
      const effect: YearValues = {};
      const years = new Set([...Object.keys(a.effect), ...Object.keys(b.effect)]);
      for (const y of years)
        effect[y] = (a.effect[y] ?? 0) + t * ((b.effect[y] ?? 0) - (a.effect[y] ?? 0));
      return { effect, lower: a.input, upper: b.input };
    }
  }
  return { effect: { ...last.effect }, lower: last.input, upper: last.input };
}

export function costLookupLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const costing = lever.costing;
  if (costing.kind !== 'lookupTable')
    throw new EngineError(`lever ${lever.id} is not a lookup lever`);
  const effect = emptyEffect(lever, value, policyYears);
  const { effect: rawByYear, lower, upper } = interpolateLookup(costing.points, value);
  const publishedYears = Object.keys(rawByYear).sort();
  const uprated = upratePublished(
    lever,
    publishedYears,
    rawByYear,
    vintage,
    settings.implementationYear,
    policyYears,
  );
  applyClassification(effect, lever, uprated.values);
  effect.steps.push(
    {
      op: 'interpolate',
      formula:
        lower === upper
          ? `${value} ${costing.input} matches HMRC's published point: ${publishedYears.map((y) => `${y}: ${fmt(rawByYear[y] ?? 0)}`).join(', ')}`
          : `${value} ${costing.input} lies between HMRC's published points ${lower} and ${upper}; straight-line interpolation gives ${publishedYears.map((y) => `${y}: ${fmt(rawByYear[y] ?? 0)}`).join(', ')}`,
      source: costing.source,
    },
    ...uprated.steps,
  );
  effect.detail = buildDetail(uprated, rawByYear, costing.caveats);
  return effect;
}
