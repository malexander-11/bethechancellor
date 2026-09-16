import {
  psnbDirection,
  type ContextFile,
  type ContextReading,
  type ContextScenario,
  type Lever,
  type ScenarioKind,
  type Vintage,
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

/** Every setting for one slider that the committed data can justify, with its workings. */
function candidatesFor(reading: ContextReading, lever: Lever): ScenarioSetting[] {
  const out: ScenarioSetting[] = [
    {
      leverCode: lever.code,
      value: lever.control.default,
      workings: 'The OBR’s own March assumption, left as it is.',
    },
  ];
  const adviser = suggestSetting(reading, lever);
  if (adviser) {
    out.push({ leverCode: lever.code, value: adviser.value, workings: adviser.rationale });
  }
  const alt = reading.alternatives;
  if (alt) {
    for (const row of [alt.lowest, alt.highest]) {
      const gap = meanSeriesGap(row.series, alt.against.series);
      if (gap === null) continue;
      out.push({
        leverCode: lever.code,
        value: toSliderValue(lever, gap),
        workings: `${row.label}: ${listSeries(row.series, reading.unit)}, against ${alt.against.label} of ${listSeries(alt.against.series, reading.unit)}. An average gap of ${gap.toFixed(2)} points, rounded to the slider’s ${lever.control.step} step${wouldClamp(lever, gap) ? ' and clamped to its range' : ''}.`,
        note: alt.note,
      });
    }
  }
  return out;
}

/**
 * One slider under one card.
 *
 * The two analysts do not read one row of one table. They pick, out of every published figure this
 * slider has, the one that is kindest or cruellest to the public finances — and the OBR's own
 * assumption and the adviser's reading are both in that pool. That is what makes the cards come
 * out ordered: the pessimist is by construction at least as harmful as the baseline and at least
 * as harmful as the adviser on every slider, so it can never leave more headroom than either.
 *
 * Binding the analysts to the forecast comparison alone, as this first did, produced a pessimist
 * cheerier than the player's own adviser, because the comparison's gloomiest interest-rate figure
 * is milder than today's gilt yield. See ADR-0010.
 *
 * Which direction is harmful comes from the sign of the OBR's own sensitivity for the lever, so
 * nothing about it is authored here.
 */
function settingFor(
  reading: ContextReading,
  lever: Lever,
  kind: ScenarioKind,
  direction: 1 | -1,
): ScenarioSetting | null {
  const candidates = candidatesFor(reading, lever);
  if (kind === 'baseline') return candidates[0] ?? null;
  if (kind === 'adviser') {
    const s = suggestSetting(reading, lever);
    return s ? { leverCode: lever.code, value: s.value, workings: s.rationale } : null;
  }
  // `direction * value` rises with harm, so the gloomiest card is the largest and the sunniest the
  // smallest. Where a slider has no published range, every candidate is the OBR's path or the
  // adviser's, and the cards say so rather than guessing at one.
  const worst = kind === 'pessimistic';
  let best = candidates[0];
  if (!best) return null;
  for (const c of candidates) {
    const better = worst
      ? direction * c.value > direction * best.value
      : direction * c.value < direction * best.value;
    if (better) best = c;
  }
  if (best.value === lever.control.default && !reading.alternatives) {
    return {
      ...best,
      workings:
        'No published range in the comparison reaches this slider, so it stays on the OBR’s path.',
    };
  }
  return best;
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
      if (!reading.leverCode) continue;
      const lever = levers.find((l) => l.code === reading.leverCode);
      if (!lever || lever.costing.kind !== 'sensitivity') continue;
      const direction = psnbDirection(vintage, lever.costing.sensitivityId);
      const setting = settingFor(reading, lever, scenario.kind, direction);
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
