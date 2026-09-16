import { EngineError } from '../errors.js';
import type { Lever, Vintage } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { costLinearLever } from './linear.js';
import { costLookupLever } from './lookup.js';
import { costPctOfBaselineLever } from './pctOfBaseline.js';
import { costScheduleLever } from './schedule.js';
import { costSensitivityLever } from './sensitivity.js';

/**
 * Dispatch a lever to its costing implementation. A lever the player has delayed gets its own
 * implementation year here, so every costing sees the delay through the one field they all read:
 * uprated costings shift their published profile, schedules and shares zero the early years.
 */
export function costLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  base: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const later = base.implementationYearByCode?.[lever.code];
  const settings: Settings = later ? { ...base, implementationYear: later } : base;
  switch (lever.costing.kind) {
    case 'sensitivity':
      return costSensitivityLever(lever, value, vintage, policyYears);
    case 'linearPerUnit':
      return costLinearLever(lever, value, vintage, settings, policyYears);
    case 'lookupTable':
      return costLookupLever(lever, value, vintage, settings, policyYears);
    case 'schedule':
      return costScheduleLever(lever, value, vintage, settings, policyYears);
    case 'pctOfBaseline':
      return costPctOfBaselineLever(lever, value, vintage, settings, policyYears);
    default: {
      const exhaustive: never = lever.costing;
      throw new EngineError(`unknown costing ${JSON.stringify(exhaustive)}`);
    }
  }
}
