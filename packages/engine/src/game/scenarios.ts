import type { ContextReading, Lever } from '../types/data.js';

/**
 * Today's estimate (Phase 24, ADR-0025): the economic settings every game plans on, and where each
 * number came from.
 *
 * Nothing here is authored. Each setting is the advisers' stated rule applied to a published
 * reading in the context file (the latest figure less the OBR's March one, rounded to the slider's
 * step), so tampering with a reading moves the estimate and a test catches it. That is the same
 * discipline every costing in the tool is held to. The four forecast cards the rule once shared
 * (ADR-0010) and the seeded OBR draw (ADR-0012) retired with Phase 24.
 */

export interface Suggestion {
  value: number;
  rationale: string;
  rule: 'gap' | 'authored';
}

type ReadingValue = ContextReading['obr'];

/** Mean difference over the years both series report, or null if they share none. */
export function meanSeriesGap(
  latest: Record<string, number>,
  base: Record<string, number>,
): number | null {
  const years = Object.keys(base).filter((y) => latest[y] !== undefined);
  if (years.length === 0) return null;
  const total = years.reduce((acc, y) => acc + ((latest[y] ?? 0) - (base[y] ?? 0)), 0);
  return total / years.length;
}

/**
 * A raw gap in percentage points becomes a slider setting: rounded to the slider's step, then
 * clamped to its range. Every card and every draw goes through this, so the settings a player can
 * reach are always ones the control can actually represent.
 */
export function toSliderValue(lever: Lever, gap: number): number {
  const { min, max, step } = lever.control;
  const rounded = Math.round(gap / step) * step;
  return Number(Math.min(max, Math.max(min, rounded)).toFixed(6));
}

/** Whether rounding a gap to the step would have landed outside the slider. */
export function wouldClamp(lever: Lever, gap: number): boolean {
  const { min, max, step } = lever.control;
  const rounded = Math.round(gap / step) * step;
  return rounded < min || rounded > max;
}

/** Latest minus OBR: a scalar difference, or the mean difference over the years both sides report. */
export function gapOf(reading: ContextReading): number | null {
  const { obr, latest } = reading;
  if (obr.value !== undefined && latest.value !== undefined) return latest.value - obr.value;
  if (obr.series && latest.series) return meanSeriesGap(latest.series, obr.series);
  return null;
}

export function formatReading(value: number, unit: ContextReading['unit'], decimals = 2): string {
  const n = Number(value.toFixed(decimals)).toString();
  return unit === 'GBPbn' ? `£${n}bn` : unit === 'pp' ? `${n}pp` : `${n}%`;
}

function summarise(v: ReadingValue, unit: ContextReading['unit']): string {
  if (v.value !== undefined) return formatReading(v.value, unit);
  const years = Object.keys(v.series ?? {});
  return years.map((y) => `${y} ${formatReading(v.series?.[y] ?? 0, unit, 1)}`).join(', ');
}

/**
 * The advisers' suggested slider setting for a reading (methodology §11): the gap between the
 * latest reading and the OBR's assumption, rounded to the slider's step and clamped to its
 * range; or an authored value with its reasoning.
 */
export function suggestSetting(reading: ContextReading, lever: Lever): Suggestion | null {
  const rule = reading.suggestion;
  if (!rule) return null;
  if (rule.rule === 'authored') {
    return { value: rule.value, rationale: rule.rationale, rule: 'authored' };
  }
  const gap = gapOf(reading);
  if (gap === null) return null;
  const value = toSliderValue(lever, gap);
  const averaged = reading.obr.series !== undefined;
  const rationale = `${reading.latest.label}: ${summarise(reading.latest, reading.unit)}, against the OBR's ${summarise(reading.obr, reading.unit)}. ${averaged ? 'An average gap' : 'A gap'} of ${gap.toFixed(2)} points, rounded to the slider's ${lever.control.step} step${wouldClamp(lever, gap) ? ' and clamped to its range' : ''}.`;
  return { value, rationale, rule: 'gap' };
}

/** Suggested settings for every reading that drives a lever. */
export function suggestedSettings(
  readings: readonly ContextReading[],
  levers: readonly Lever[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const reading of readings) {
    if (!reading.leverCode) continue;
    const lever = levers.find((l) => l.code === reading.leverCode);
    if (!lever) continue;
    const s = suggestSetting(reading, lever);
    if (s) out[lever.code] = s.value;
  }
  return out;
}

/** Every lever the assumptions step can set, in the order the readings list them. */
export function macroCodesOf(readings: readonly ContextReading[]): string[] {
  return readings.map((r) => r.leverCode).filter((c): c is string => !!c);
}

/** Two sets of lever values are the same budget when every code they mention agrees. */
export function sameValues(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

/** The subset of a budget that a given set of codes covers, with defaults dropped. */
export function pick(
  values: Record<string, number>,
  codes: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of codes) if (values[code] !== undefined) out[code] = values[code] as number;
  return out;
}

/**
 * How to name the economy a Budget plans on, in a sentence elsewhere in the journey (Phase 24,
 * ADR-0025): "the OBR’s March forecast" when every macro setting is the OBR's own, "today’s
 * estimate" when they are the estimate every game plans on (the suggestion rule applied to every
 * reading, `suggestedSettings`), and "your own figures" for anything else, which only a sandbox
 * link can carry.
 */
export function describeAssumptions(
  leverValues: Record<string, number>,
  estimate: Record<string, number>,
  codes: readonly string[],
): string {
  const current = pick(leverValues, codes);
  if (Object.values(current).every((v) => v === 0)) return 'the OBR’s March forecast';
  if (sameValues(current, pick(estimate, codes))) return 'today’s estimate';
  return 'your own figures';
}
