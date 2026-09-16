import type {
  ContextFile,
  ContextReading,
  ContextScenario,
  Lever,
  ScenarioKind,
} from '@btc/engine';
import { formatReading, meanSeriesGap, suggestSetting, toSliderValue, wouldClamp } from './suggest';
import { pick, sameValues } from './values';

/**
 * The four sets of economic assumptions a player chooses between, and where each number came from.
 *
 * Nothing here is authored. A card's settings are computed from the published rows in the context
 * file by one stated rule per card, so tampering with a row moves the card and a test catches it.
 * That is the same discipline every costing in the tool is held to; the words on a card are
 * authored, its numbers never are.
 */

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
 * One slider under one card. The optimistic and pessimistic cards read the highest and lowest
 * published rows; where a reading carries no range, the slider stays on the OBR's path and the
 * card says so rather than guessing.
 */
function settingFor(
  reading: ContextReading,
  lever: Lever,
  kind: ScenarioKind,
): ScenarioSetting | null {
  if (kind === 'baseline') {
    return {
      leverCode: lever.code,
      value: lever.control.default,
      workings: 'The OBR’s own March assumption, left as it is.',
    };
  }
  if (kind === 'adviser') {
    const s = suggestSetting(reading, lever);
    return s ? { leverCode: lever.code, value: s.value, workings: s.rationale } : null;
  }
  const alt = reading.alternatives;
  if (!alt) {
    return {
      leverCode: lever.code,
      value: lever.control.default,
      workings:
        'No published range in the comparison reaches this slider, so it stays on the OBR’s path.',
    };
  }
  const row = alt[kind];
  const gap = meanSeriesGap(row.series, alt.against.series);
  if (gap === null) return null;
  return {
    leverCode: lever.code,
    value: toSliderValue(lever, gap),
    workings: `${row.label}: ${listSeries(row.series, reading.unit)}, against ${alt.against.label} of ${listSeries(alt.against.series, reading.unit)}. An average gap of ${gap.toFixed(2)} points, rounded to the slider’s ${lever.control.step} step${wouldClamp(lever, gap) ? ' and clamped to its range' : ''}.`,
    note: alt.note,
  };
}

/** The cards as authored, each with the settings its rule produces. */
export function scenarioCards(context: ContextFile, levers: readonly Lever[]): ScenarioCard[] {
  return (context.scenarios ?? []).map((scenario) => {
    const settings: ScenarioSetting[] = [];
    for (const reading of context.readings) {
      if (!reading.leverCode) continue;
      const lever = levers.find((l) => l.code === reading.leverCode);
      if (!lever) continue;
      const setting = settingFor(reading, lever, scenario.kind);
      if (setting) settings.push(setting);
    }
    const values = Object.fromEntries(settings.map((s) => [s.leverCode, s.value]));
    return { ...scenario, settings, values };
  });
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
 */
export function describeAssumptions(
  cards: readonly ScenarioCard[],
  leverValues: Record<string, number>,
  codes: readonly string[],
): string | null {
  const kind = matchScenario(cards, leverValues, codes);
  if (kind === null) return null;
  if (kind === 'baseline') return 'the OBR’s March forecast, unchanged';
  const title = cards.find((c) => c.kind === kind)?.title ?? '';
  return title.charAt(0).toLowerCase() + title.slice(1);
}
