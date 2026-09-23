import { fyStart } from '../calc/years.js';
import { EngineError } from '../errors.js';
import type { Lever, Vintage } from '../types/data.js';
import type { LeverEffect, Settings } from '../types/engine.js';
import { costLinearLever } from './linear.js';
import { costLookupLever } from './lookup.js';
import { costPctOfBaselineLever } from './pctOfBaseline.js';
import { costScheduleLever } from './schedule.js';
import { costSensitivityLever } from './sensitivity.js';

/**
 * The fiscal year a lever's effect begins: the game's start year, the player's delay for this
 * lever, or the lever's own earliest start, whichever is latest (ADR-0021). A lever cannot be
 * brought forward past what its source says it needs, however early the Budget starts everything
 * else.
 */
export function effectiveStartYear(
  lever: Pick<Lever, 'code' | 'earliestStart'>,
  settings: Pick<Settings, 'implementationYear' | 'implementationYearByCode'>,
): string {
  const candidates = [
    settings.implementationYear,
    settings.implementationYearByCode?.[lever.code],
    lever.earliestStart?.year,
  ].filter((y): y is string => y !== undefined);
  return candidates.reduce((latest, y) => (fyStart(y) > fyStart(latest) ? y : latest));
}

/**
 * Dispatch a lever to its costing implementation. A lever the player has delayed, or one whose
 * source says it cannot start before a given year, gets its own implementation year here, so
 * every costing sees it through the one field they all read: uprated costings shift their
 * published profile, schedules and shares zero the early years.
 */
export function costLever(
  lever: Lever,
  value: number,
  vintage: Vintage,
  base: Settings,
  policyYears: readonly string[],
): LeverEffect {
  const start = effectiveStartYear(lever, base);
  const settings: Settings =
    start === base.implementationYear ? base : { ...base, implementationYear: start };
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
