import type { ContextReading, Lever } from '@btc/engine';

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
 * clamped to its range. Every card on the assumptions step goes through this, so the settings a
 * player can reach are always ones the control can actually represent.
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
