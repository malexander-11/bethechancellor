import type { Lever } from '../types/data.js';
import { freshGame, type AssessAsOf, type GamePermalink } from '../types/engine.js';
import { LEGACY_THEME_PRIORITY } from '../game/options.js';
import { FINAL_STAGE } from '../game/stages.js';

export const PERMALINK_VERSION = 1;

export interface PermalinkState {
  vintageCode: string;
  rulesCode: string;
  implementationYear: string;
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  /** The playthrough, once the player has left the briefing (`g=`). */
  game?: GamePermalink;
}

export interface DecodedPermalink {
  state: Partial<PermalinkState> & { leverValues: Record<string, number> };
  warnings: string[];
}

const ITEM_SEPARATOR = '_';
const LIST_SEPARATOR = '+';
const LIST_SPLIT = /[+ ]/;
const slugOk = (s: string) => /^[a-z0-9][a-z0-9:-]*$/.test(s);

/**
 * How a stage from before Phase 24 reads now, by its old index: the outlook, the PM and the
 * flagships stay where they were; the forecast (3) opens fine-tuning; the compromises (4) and the
 * final choices (5) open the review, short of Budget day; a finished Budget (6) stays finished.
 */
export const LEGACY_STAGE: readonly number[] = [0, 1, 2, 3, 4, 4, 5];

/**
 * `g=` holds the story of a playthrough as `key.value` items: `g=st.3_pr.defence+nhs`. The stage
 * is always written, so a `g=` always marks a game (`st.0` is a game at the briefing).
 *
 * Retired keys, never to be reused, ignored without a warning when an old link carries them:
 * `s` (the seed of the in-game OBR draw), `pl` (the forecast planned on), `hr` (the headroom
 * target), `dl` (delayed measures), `rv` (the forecast opened), `rb` (the add-ons) and `br` (a
 * rule breach accepted) went with the forecast, the compromises and the add-ons in Phase 24
 * (ADR-0025); `pp`, `cn`, `cp` and `dp` carried the Phase 8 negotiation with the PM. A link that
 * carries a seed is from before Phase 24, so its stage is read through `LEGACY_STAGE`. `th` (the
 * Phase 9 themes) still reads as the priority that took each one's place (Phase 18). The `S=`
 * snapshot of the package before the forecast is no longer read or written.
 */
export function encodeGame(g: GamePermalink): string {
  const items = [`st.${g.reached}`];
  if (g.priorities.length > 0) items.push(`pr.${g.priorities.join(LIST_SEPARATOR)}`);
  return items.join(ITEM_SEPARATOR);
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
  const stage = Number.isInteger(st) ? st : 0;
  // A link from before Phase 24 carried a seed and seven stages.
  const legacy = items.has('s');
  const reached = legacy ? (LEGACY_STAGE[Math.min(Math.max(stage, 0), 6)] ?? 0) : stage;
  g.reached = Math.min(Math.max(reached, 0), FINAL_STAGE);
  // A `+` typed into a browser's address bar arrives here as a space, so both separate items.
  const list = (key: string) =>
    (items.get(key) ?? '').split(LIST_SPLIT).filter((s) => s.length > 0 && slugOk(s));
  // A Phase 9 link ranked themes; each reads as the priority that took its place, ahead of any
  // priorities the link also names. An id the data no longer knows is kept here and dropped by
  // rankedPriorities, so the codec needs no data.
  const themes = list('th')
    .map((t) => LEGACY_THEME_PRIORITY[t])
    .filter((p): p is string => p !== undefined);
  g.priorities = [...new Set([...themes, ...list('pr')])];
  return g;
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
