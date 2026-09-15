import type { ContextReading, Lever } from '@btc/engine';

export interface Suggestion {
  value: number;
  rationale: string;
  rule: 'gap' | 'authored';
}

type ReadingValue = ContextReading['obr'];

/** Latest minus OBR: a scalar difference, or the mean difference over the years both sides report. */
export function gapOf(reading: ContextReading): number | null {
  const { obr, latest } = reading;
  if (obr.value !== undefined && latest.value !== undefined) return latest.value - obr.value;
  if (obr.series && latest.series) {
    const years = Object.keys(obr.series).filter((y) => latest.series?.[y] !== undefined);
    if (years.length === 0) return null;
    const total = years.reduce(
      (acc, y) => acc + ((latest.series?.[y] ?? 0) - (obr.series?.[y] ?? 0)),
      0,
    );
    return total / years.length;
  }
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
  const { min, max, step } = lever.control;
  const rounded = Math.round(gap / step) * step;
  const value = Number(Math.min(max, Math.max(min, rounded)).toFixed(6));
  const averaged = reading.obr.series !== undefined;
  const rationale = `${reading.latest.label}: ${summarise(reading.latest, reading.unit)}, against the OBR's ${summarise(reading.obr, reading.unit)}. ${averaged ? 'An average gap' : 'A gap'} of ${gap.toFixed(2)} points, rounded to the slider's ${step} step${value !== rounded ? ' and clamped to its range' : ''}.`;
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
