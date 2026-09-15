import { EngineError } from '../errors.js';
import type { Lever, Vintage } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { costSensitivityLever } from './sensitivity.js';

/** Dispatch a lever to its costing implementation. Direct costings (Phase 2) plug in here. */
export function costLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  _settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  switch (lever.costing.kind) {
    case 'sensitivity':
      return costSensitivityLever(lever, value, vintage, policyYears);
    case 'linearPerUnit':
    case 'lookupTable':
    case 'schedule':
    case 'shareOfBaselineSeries':
      throw new EngineError(
        `costing kind "${lever.costing.kind}" (lever ${lever.id}) is defined in the schema but not yet implemented; it arrives with the tax and spend levers`,
      );
    default: {
      const exhaustive: never = lever.costing;
      throw new EngineError(`unknown costing ${JSON.stringify(exhaustive)}`);
    }
  }
}
