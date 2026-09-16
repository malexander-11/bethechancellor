import { psnbDirection } from '../costing/sensitivity.js';
import type {
  ContextFile,
  ContextReading,
  ContextScenario,
  Lever,
  ScenarioKind,
  Vintage,
} from '../types/data.js';

/**
 * The four sets of economic assumptions a player chooses between, and where each number came from.
 *
 * Nothing here is authored. A card's settings are computed from the published rows in the context
 * file by one stated rule per card, so tampering with a row moves the card and a test catches it.
 * That is the same discipline every costing in the tool is held to; the words on a card are
 * authored, its numbers never are. This lives in the engine rather than the web app because the
 * in-game OBR draw (ADR-0012) chooses among the same candidates.
 */

export interface Suggestion {
  value: number;
  rationale: string;
  rule: 'gap' | 'authored';
}

/** Which published figure a slider takes: the OBR's path, the adviser's reading, or a range row. */
export type MacroCandidate = 'obr' | 'adviser' | 'lowest' | 'highest';

export interface ScenarioSetting {
  leverCode: string;
  value: number;
  /** Where this number came from, in one sentence. */
  workings: string;
  /** Said plainly when the published range is on a different footing from the reading above it. */
  note?: string;
}

export interface ScenarioCard extends ContextScenario {
  values: Record<string, number>;
  settings: ScenarioSetting[];
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

function listSeries(series: Record<string, number>, unit: ContextReading['unit']): string {
  return Object.entries(series)
    .map(([year, v]) => `${year} ${formatReading(v, unit, 2)}`)
    .join(', ');
}

/**
 * Every setting for one slider that the committed data can justify, by name, with its workings.
 * `obr` is always present; the rest depend on what the reading carries.
 */
export function candidatesFor(
  reading: ContextReading,
  lever: Lever,
): Partial<Record<MacroCandidate, ScenarioSetting>> & { obr: ScenarioSetting } {
  const out: Partial<Record<MacroCandidate, ScenarioSetting>> & { obr: ScenarioSetting } = {
    obr: {
      leverCode: lever.code,
      value: lever.control.default,
      workings: 'The OBR’s own March assumption, left as it is.',
    },
  };
  const adviser = suggestSetting(reading, lever);
  if (adviser) {
    out.adviser = { leverCode: lever.code, value: adviser.value, workings: adviser.rationale };
  }
  const alt = reading.alternatives;
  if (alt) {
    for (const [name, row] of [
      ['lowest', alt.lowest],
      ['highest', alt.highest],
    ] as const) {
      const gap = meanSeriesGap(row.series, alt.against.series);
      if (gap === null) continue;
      out[name] = {
        leverCode: lever.code,
        value: toSliderValue(lever, gap),
        workings: `${row.label}: ${listSeries(row.series, reading.unit)}, against ${alt.against.label} of ${listSeries(alt.against.series, reading.unit)}. An average gap of ${gap.toFixed(2)} points, rounded to the slider’s ${lever.control.step} step${wouldClamp(lever, gap) ? ' and clamped to its range' : ''}.`,
        note: alt.note,
      };
    }
  }
  return out;
}

const NO_RANGE =
  'No published range in the comparison reaches this slider, so it stays on the OBR’s path.';

/**
 * One slider under one card.
 *
 * The two analysts do not read one row of one table. They pick, out of every published figure this
 * slider has, the one that is kindest or cruellest to the public finances — and the OBR's own
 * assumption and the adviser's reading are both in that pool. That is what makes the cards come
 * out ordered: the pessimist is by construction at least as harmful as the baseline and at least
 * as harmful as the adviser on every slider, so it can never leave more headroom than either.
 *
 * Which direction is harmful comes from the sign of the OBR's own sensitivity for the lever, so
 * nothing about it is authored here. See ADR-0010.
 */
function settingFor(
  reading: ContextReading,
  lever: Lever,
  kind: ScenarioKind,
  direction: 1 | -1,
): ScenarioSetting | null {
  const candidates = candidatesFor(reading, lever);
  if (kind === 'baseline') return candidates.obr;
  if (kind === 'adviser') return candidates.adviser ?? null;
  const worst = kind === 'pessimistic';
  let best: ScenarioSetting = candidates.obr;
  for (const c of Object.values(candidates)) {
    if (!c) continue;
    const better = worst
      ? direction * c.value > direction * best.value
      : direction * c.value < direction * best.value;
    if (better) best = c;
  }
  if (best.value === lever.control.default && !reading.alternatives) {
    return { ...best, workings: NO_RANGE };
  }
  return best;
}

/** The lever a reading drives, if it is a sensitivity lever the engine can orient. */
export function macroLeverFor(
  reading: ContextReading,
  levers: readonly Lever[],
): (Lever & { costing: { kind: 'sensitivity'; sensitivityId: string } }) | undefined {
  if (!reading.leverCode) return undefined;
  const lever = levers.find((l) => l.code === reading.leverCode);
  if (!lever || lever.costing.kind !== 'sensitivity') return undefined;
  return lever as Lever & { costing: { kind: 'sensitivity'; sensitivityId: string } };
}

/** The cards as authored, each with the settings its rule produces. */
export function scenarioCards(
  context: ContextFile,
  levers: readonly Lever[],
  vintage: Vintage,
): ScenarioCard[] {
  return (context.scenarios ?? []).map((scenario) => {
    const settings: ScenarioSetting[] = [];
    for (const reading of context.readings) {
      const lever = macroLeverFor(reading, levers);
      if (!lever) continue;
      const direction = psnbDirection(vintage, lever.costing.sensitivityId);
      const setting = settingFor(reading, lever, scenario.kind, direction);
      if (setting) settings.push(setting);
    }
    const values = Object.fromEntries(settings.map((s) => [s.leverCode, s.value]));
    return { ...scenario, settings, values };
  });
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
 * Which card the player is on, or null for a budget that matches none of them — a permalink with
 * hand-set sliders, which the step shows as "your own figures" rather than pretending it is one of
 * the four.
 */
export function matchScenario(
  cards: readonly ScenarioCard[],
  leverValues: Record<string, number>,
  codes: readonly string[],
): ScenarioKind | null {
  const current = pick(leverValues, codes);
  return cards.find((card) => sameValues(pick(card.values, codes), current))?.kind ?? null;
}

/**
 * How to name the current assumptions in a sentence elsewhere in the journey — "your Chief
 * Economic Adviser's view" rather than "Interest rates +0.75 pp · Inflation (RPI) +0.5 pp".
 * Returns null for sliders set by hand, where the figures themselves are the only honest summary.
 * Once the in-game OBR has spoken, the sliders are its forecast and are named as such, whichever
 * card they happen to coincide with.
 */
export function describeAssumptions(
  cards: readonly ScenarioCard[],
  leverValues: Record<string, number>,
  codes: readonly string[],
  revealed = false,
): string | null {
  if (revealed) return 'the OBR’s October forecast';
  const kind = matchScenario(cards, leverValues, codes);
  if (kind === null) return null;
  if (kind === 'baseline') return 'the OBR’s March forecast, unchanged';
  const title = cards.find((c) => c.kind === kind)?.title ?? '';
  return title.charAt(0).toLowerCase() + title.slice(1);
}
