import { EngineError } from '../errors.js';
import type { Lever, Vintage, YearValues } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { applyClassification, buildDetail, emptyEffect, upratePublished } from './shared.js';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** Linear direct costing: value ÷ unitDelta × the published per-unit effect, then uprated. */
export function costLinearLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const costing = lever.costing;
  if (costing.kind !== 'linearPerUnit') throw new EngineError(`lever ${lever.id} is not linear`);
  const effect = emptyEffect(lever, value, policyYears);
  const useDecrease = value < 0 && !costing.symmetric;
  if (useDecrease && !costing.decreasePerUnit) {
    throw new EngineError(`lever ${lever.id} cannot decrease: no decreasePerUnit table`);
  }
  const table = useDecrease ? (costing.decreasePerUnit ?? {}) : costing.perUnit;
  const multiplier = useDecrease ? Math.abs(value) / costing.unitDelta : value / costing.unitDelta;
  const publishedYears = Object.keys(table).sort();
  const rawByYear: YearValues = {};
  for (const y of publishedYears) rawByYear[y] = (table[y] ?? 0) * multiplier;

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
      op: 'scale',
      formula: `${value} ${lever.control.unit} ÷ ${costing.unitDelta} per unit = ${multiplier} × published effect per unit (${publishedYears.map((y) => `${y}: ${fmt(table[y] ?? 0)}`).join(', ')})${useDecrease ? ' using the decrease table' : ''}`,
      factor: multiplier,
      source: costing.source,
    },
    ...uprated.steps,
  );
  effect.detail = buildDetail(uprated, rawByYear, costing.caveats);
  return effect;
}
