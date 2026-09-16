import { EngineError } from '../errors.js';
import type { ContextFile, DrawOutcome, DrawsFile, Lever, Vintage } from '../types/data.js';
import type { LeverRevision } from '../types/engine.js';
import { candidatesFor, macroLeverFor, type ScenarioSetting } from './scenarios.js';

/**
 * The in-game OBR forecast (ADR-0012). A seed picks one of a handful of named outcomes, weighted
 * to the centre; the outcome names a *published candidate* for each slider and the value is
 * derived through the same rule as the assumption cards. So the draw decides *which* published
 * figure arrives, never *what* the figure is. It knows nothing about the outlook the player chose.
 */

/** Seeds are small positive integers, so a link can carry one and a person can read it. */
export const SEED_MIN = 1;
export const SEED_MAX = 999;

/** A 32-bit mixer (mulberry32): the same seed always gives the same unit interval value. */
export function mix(seed: number): number {
  let t = (Math.trunc(seed) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The outcome a seed lands on: cumulative weights over the unit interval, in authored order. */
export function pickOutcome(seed: number, outcomes: readonly DrawOutcome[]): DrawOutcome {
  if (outcomes.length === 0) throw new EngineError('no draw outcomes to pick from');
  const total = outcomes.reduce((acc, o) => acc + o.weight, 0);
  const u = mix(seed) * total;
  let acc = 0;
  for (const o of outcomes) {
    acc += o.weight;
    if (u < acc) return o;
  }
  return outcomes[outcomes.length - 1] as DrawOutcome;
}

export interface DrawnForecast {
  outcome: DrawOutcome;
  /** Macro slider values, by lever code. */
  values: Record<string, number>;
  /** The workings behind each value, from the same candidate machinery as the cards. */
  settings: ScenarioSetting[];
  /** Re-scorings for every lever in the data that carries a named consideration. */
  revisions: Record<string, LeverRevision>;
}

/**
 * Turn an outcome's candidate names into slider values. A candidate the reading does not carry
 * (there is no `highest` growth row, for instance) is a data error and is reported as such rather
 * than silently falling back: `validateDataset` catches it first, this is the last line.
 */
export function drawSettings(
  outcome: DrawOutcome,
  context: ContextFile,
  levers: readonly Lever[],
): { values: Record<string, number>; settings: ScenarioSetting[] } {
  const values: Record<string, number> = {};
  const settings: ScenarioSetting[] = [];
  for (const reading of context.readings) {
    const lever = macroLeverFor(reading, levers);
    if (!lever) continue;
    const name = outcome.macro[lever.code] ?? 'obr';
    const candidate = candidatesFor(reading, lever)[name];
    if (!candidate) {
      throw new EngineError(
        `draw outcome ${outcome.id} names the ${name} figure for ${lever.code}, which the ${reading.id} reading does not carry`,
      );
    }
    values[lever.code] = candidate.value;
    settings.push(candidate);
  }
  return { values, settings };
}

/**
 * The OBR's re-scoring, by lever code: a factor for every lever carrying one of the outcome's
 * named considerations. A lever with none of them is untouched, which is how certified HMRC rate
 * rows and Treasury scorecard lines stay certified.
 */
export function revisionsFor(
  outcome: DrawOutcome,
  levers: readonly Lever[],
): Record<string, LeverRevision> {
  const out: Record<string, LeverRevision> = {};
  for (const lever of levers) {
    if (lever.category === 'macro') continue;
    for (const revision of outcome.revisions) {
      if (!lever.considerations.some((c) => c.id === revision.considerationId)) continue;
      const existing = out[lever.code];
      // Two caveats on one lever: the harsher one wins, so nothing is revised twice.
      if (existing && existing.factor <= revision.factor) continue;
      out[lever.code] = {
        factor: revision.factor,
        considerationId: revision.considerationId,
        note: revision.note,
      };
    }
  }
  return out;
}

/** Everything the forecast stage needs, from one seed. */
export function drawForecast(
  seed: number,
  draws: DrawsFile,
  context: ContextFile,
  levers: readonly Lever[],
  _vintage: Vintage,
): DrawnForecast {
  const outcome = pickOutcome(seed, draws.outcomes);
  const { values, settings } = drawSettings(outcome, context, levers);
  return { outcome, values, settings, revisions: revisionsFor(outcome, levers) };
}

/** Share of seeds that land on each outcome, for the disclosure text and for tests. */
export function outcomeOdds(draws: DrawsFile): Record<string, number> {
  const total = draws.outcomes.reduce((acc, o) => acc + o.weight, 0);
  return Object.fromEntries(draws.outcomes.map((o) => [o.id, o.weight / total]));
}
