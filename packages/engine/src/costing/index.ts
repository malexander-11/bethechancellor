import { EngineError } from '../errors.js';
import type { Lever, Vintage } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { costLinearLever } from './linear.js';
import { costLookupLever } from './lookup.js';
import { costScheduleLever } from './schedule.js';
import { costSensitivityLever } from './sensitivity.js';

/** Dispatch a lever to its costing implementation. */
export function costLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  settings: Settings,
  policyYears: readonly string[],
): LeverEffect {
  switch (lever.costing.kind) {
    case 'sensitivity':
      return costSensitivityLever(lever, value, vintage, policyYears);
    case 'linearPerUnit':
      return costLinearLever(lever, value, vintage, settings, policyYears);
    case 'lookupTable':
      return costLookupLever(lever, value, vintage, settings, policyYears);
    case 'schedule':
      return costScheduleLever(lever, value, vintage, settings, policyYears);
    case 'shareOfBaselineSeries':
      throw new EngineError(
        `costing kind "shareOfBaselineSeries" (lever ${lever.id}) arrives with the spending levers`,
      );
    default: {
      const exhaustive: never = lever.costing;
      throw new EngineError(`unknown costing ${JSON.stringify(exhaustive)}`);
    }
  }
}
