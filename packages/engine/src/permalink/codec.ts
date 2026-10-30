import type { Lever } from '../types/data.js';
import { freshGame, type AssessAsOf, type GamePermalink } from '../types/engine.js';
import { FINAL_STAGE } from '../game/stages.js';

export const PERMALINK_VERSION = 1;

export interface PermalinkState {
  vintageCode: string;
  rulesCode: string;
  implementationYear: string;
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  /** The playthrough, once the player has started changing the Budget (`g=`). */
  game?: GamePermalink;
}

export interface DecodedPermalink {
  state: Partial<PermalinkState> & { leverValues: Record<string, number> };
  warnings: string[];
}

const ITEM_SEPARATOR = '_';

/**
 * How a stage from before Phase 24 reads on the six-stage road, by its old index: the outlook,
 * the PM and the flagships stay where they were; the forecast (3) opens fine-tuning; the
 * compromises (4) and the final choices (5) open the review, short of Budget day; a finished
 * Budget (6) stays finished.
 */
export const LEGACY_STAGE: readonly number[] = [0, 1, 2, 3, 4, 4, 5];

/**
 * How a stage of the six-stage road (ADR-0025) reads on the three-stage one (ADR-0045): the
 * briefing, the priorities and the flagships open fine-tuning; the rest keep their place.
 */
export const SIX_STAGE: readonly number[] = [0, 0, 0, 0, 1, 2];

/** The road marker a link written on the three-stage road carries (`rd.2`). */
export const ROAD = 2;

/**
 * `g=` holds the story of a playthrough as `key.value` items: `g=st.1_rd.2`. The stage is always
 * written, so a `g=` always marks a game (`st.0` is a game at fine-tuning), and the road marker says
 * which road the stage counts on; a link without one is read on the six-stage road, and one with a
 * seed on the seven-stage road before it.
 *
 * Retired keys, never to be reused, ignored without a warning when an old link carries them:
 * `s` (the seed of the in-game OBR draw), `pl` (the forecast planned on), `hr` (the headroom
 * target), `dl` (delayed measures), `rv` (the forecast opened), `rb` (the add-ons) and `br` (a
 * rule breach accepted) went with the forecast, the compromises and the add-ons in Phase 24
 * (ADR-0025); `pp`, `cn`, `cp` and `dp` carried the Phase 8 negotiation with the PM; `th` (the
 * Phase 9 themes) and `pr` (the priorities ranked with the PM, Phase 18) went with the priorities
 * (ADR-0045). The `S=` snapshot of the package before the forecast is no longer read or written.
 */
export function encodeGame(g: GamePermalink): string {
  return [`st.${g.reached}`, `rd.${ROAD}`].join(ITEM_SEPARATOR);
}

/** Never throws. A `g=` with nothing in it that can be read is no game; unknown items are ignored. */
export function decodeGame(raw: string, warnings: string[]): GamePermalink | undefined {
  const items = new Map<string, string>();
  for (const item of raw.split(ITEM_SEPARATOR)) {
    const dot = item.indexOf('.');
    if (dot <= 0) continue;
    items.set(item.slice(0, dot), item.slice(dot + 1));
  }
  if (!['st', 's', 'pr', 'th'].some((key) => items.has(key))) {
    warnings.push('Ignored the game in this link: nothing in it could be read.');
    return undefined;
  }
  const g = freshGame();
  const st = Number(items.get('st'));
  const stage = Number.isInteger(st) ? Math.max(stage0(st), 0) : 0;
  const onThisRoad = Number(items.get('rd')) === ROAD;
  // A link from before Phase 24 carried a seed and seven stages; one from before ADR-0045 six.
  const six = items.has('s') ? (LEGACY_STAGE[Math.min(stage, 6)] ?? 0) : stage;
  const reached = onThisRoad ? stage : (SIX_STAGE[Math.min(six, 5)] ?? 0);
  g.reached = Math.min(reached, FINAL_STAGE);
  return g;
}

function stage0(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

const PAIR_SEPARATOR = '_';

function formatNumber(n: number): string {
  return Number(n.toFixed(4)).toString();
}

function encodePairs(values: Record<string, number>): string {
  return Object.keys(values)
    .sort()
    .map((code) => `${code}.${formatNumber(values[code] ?? 0)}`)
    .join(PAIR_SEPARATOR);
}

/**
 * Sparse, versioned, human-skimmable query string (methodology and plan):
 *   v=1&f=obr2603&r=ch2602&i=2027&L=itbr.2_vat.1&M=rate.0.5&o=dif0,nb1
 * Only non-default lever values are encoded. `L` holds policy levers, `M` macro sliders.
 * `g` carries the playthrough, absent until there is one, so a link without it is exactly what it
 * was before Phase 8.
 */
export function encodePermalink(state: PermalinkState, levers: readonly Lever[]): string {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const policy: Record<string, number> = {};
  const macro: Record<string, number> = {};
  for (const [code, value] of Object.entries(state.leverValues)) {
    const lever = byCode.get(code);
    if (!lever) continue;
    if (value === lever.control.default) continue;
    (lever.category === 'macro' ? macro : policy)[code] = value;
  }
  const params = new URLSearchParams();
  params.set('v', String(PERMALINK_VERSION));
  params.set('f', state.vintageCode);
  params.set('r', state.rulesCode);
  params.set('i', state.implementationYear.slice(0, 4));
  if (Object.keys(policy).length > 0) params.set('L', encodePairs(policy));
  if (Object.keys(macro).length > 0) params.set('M', encodePairs(macro));
  const options: string[] = [];
  if (!state.debtInterestFeedback) options.push('dif0');
  if (state.assessAsOf === 'nextBudget') options.push('nb1');
  if (options.length > 0) params.set('o', options.join(','));
  if (state.game) params.set('g', encodeGame(state.game));
  return params.toString();
}

function decodePairs(
  raw: string,
  levers: Map<string, Lever>,
  warnings: string[],
  out: Record<string, number>,
): void {
  if (!raw) return;
  for (const pair of raw.split(PAIR_SEPARATOR)) {
    const dot = pair.indexOf('.');
    if (dot <= 0) {
      warnings.push(`Ignored malformed lever setting "${pair}".`);
      continue;
    }
    const code = pair.slice(0, dot);
    const value = Number(pair.slice(dot + 1));
    const lever = levers.get(code);
    if (!lever) {
      warnings.push(`Ignored unknown lever code "${code}".`);
      continue;
    }
    if (!Number.isFinite(value)) {
      warnings.push(`Ignored non-numeric value for "${code}".`);
      continue;
    }
    if (lever.deprecated)
      warnings.push(`Lever "${lever.shortTitle}" is deprecated; its setting was kept.`);
    const { min, max } = lever.control;
    if (value < min || value > max) {
      warnings.push(`Value ${value} for "${code}" is outside ${min} to ${max} and was clamped.`);
      out[code] = Math.min(max, Math.max(min, value));
    } else {
      out[code] = value;
    }
  }
}

/** Decode a query string (with or without a leading "?"). Never throws; problems become warnings. */
export function decodePermalink(query: string, levers: readonly Lever[]): DecodedPermalink {
  const warnings: string[] = [];
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const leverValues: Record<string, number> = {};
  const version = params.get('v');
  if (version !== null && version !== String(PERMALINK_VERSION)) {
    warnings.push(
      `Permalink version ${version} is not ${PERMALINK_VERSION}; decoding on a best-effort basis.`,
    );
  }
  decodePairs(params.get('L') ?? '', byCode, warnings, leverValues);
  decodePairs(params.get('M') ?? '', byCode, warnings, leverValues);
  const state: DecodedPermalink['state'] = { leverValues };
  const f = params.get('f');
  if (f) state.vintageCode = f;
  const r = params.get('r');
  if (r) state.rulesCode = r;
  const i = params.get('i');
  if (i) {
    if (/^\d{4}$/.test(i)) {
      const start = Number(i);
      state.implementationYear = `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
    } else {
      warnings.push(`Ignored malformed implementation year "${i}".`);
    }
  }
  const options = new Set((params.get('o') ?? '').split(',').filter(Boolean));
  state.debtInterestFeedback = !options.has('dif0');
  state.assessAsOf = options.has('nb1') ? 'nextBudget' : 'vintage';
  const g = params.get('g');
  if (g) {
    const game = decodeGame(g, warnings);
    if (game) state.game = game;
  }
  return { state, warnings };
}
