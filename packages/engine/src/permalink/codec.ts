import type { Lever } from '../types/data.js';
import { freshGame, type AssessAsOf, type GamePermalink } from '../types/engine.js';
import { SEED_MAX, SEED_MIN } from '../game/draw.js';

export const PERMALINK_VERSION = 1;

export interface PermalinkState {
  vintageCode: string;
  rulesCode: string;
  implementationYear: string;
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  /** The playthrough, once a seed exists (`g=`). */
  game?: GamePermalink;
  /** The policy levers as they stood when the in-game OBR update arrived (`S=`). */
  snapshot?: Record<string, number>;
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
 * `g=` holds the story of a playthrough as `key.value` items. Only what differs from a fresh game
 * is written, so a link stays readable: `g=s.417_st.6_pl.adviser_hr.20_th.cost_pr.ufsm+dip47`.
 */
export function encodeGame(g: GamePermalink): string {
  const fresh = freshGame(g.seed);
  const items = [`s.${g.seed}`];
  if (g.reached !== fresh.reached) items.push(`st.${g.reached}`);
  if (g.planning !== fresh.planning) items.push(`pl.${g.planning}`);
  if (g.headroomTargetBn !== fresh.headroomTargetBn) items.push(`hr.${g.headroomTargetBn}`);
  if (g.theme) items.push(`th.${g.theme}`);
  if (g.priorities.length > 0) items.push(`pr.${g.priorities.join(LIST_SEPARATOR)}`);
  if (g.protectedPromises.length > 0) items.push(`pp.${g.protectedPromises.join(LIST_SEPARATOR)}`);
  if (g.concessions.length > 0) items.push(`cn.${g.concessions.join(LIST_SEPARATOR)}`);
  if (g.capital !== fresh.capital) items.push(`cp.${g.capital}`);
  const delays = Object.entries(g.delays).sort(([a], [b]) => a.localeCompare(b));
  if (delays.length > 0) {
    items.push(
      `dl.${delays.map(([code, year]) => `${code}-${year.slice(0, 4)}`).join(LIST_SEPARATOR)}`,
    );
  }
  if (g.revealed) items.push('rv.1');
  if (g.rabbit) items.push(`rb.${g.rabbit}`);
  if (g.breachAccepted) items.push('br.1');
  return items.join(ITEM_SEPARATOR);
}

function toFiscalYear(start: string): string | null {
  if (!/^\d{4}$/.test(start)) return null;
  const n = Number(start);
  return `${n}-${String((n + 1) % 100).padStart(2, '0')}`;
}

/** Never throws. A game without a usable seed is no game; unknown items are ignored. */
export function decodeGame(raw: string, warnings: string[]): GamePermalink | undefined {
  const items = new Map<string, string>();
  for (const item of raw.split(ITEM_SEPARATOR)) {
    const dot = item.indexOf('.');
    if (dot <= 0) continue;
    items.set(item.slice(0, dot), item.slice(dot + 1));
  }
  const seed = Number(items.get('s'));
  if (!Number.isInteger(seed) || seed < SEED_MIN || seed > SEED_MAX) {
    warnings.push('Ignored the game in this link: it has no usable seed.');
    return undefined;
  }
  const g = freshGame(seed);
  const int = (key: string, fallback: number) => {
    const v = Number(items.get(key));
    return Number.isInteger(v) ? v : fallback;
  };
  // A `+` typed into a browser's address bar arrives here as a space, so both separate items.
  const list = (key: string) =>
    (items.get(key) ?? '').split(LIST_SPLIT).filter((s) => s.length > 0 && slugOk(s));
  g.reached = int('st', g.reached);
  const pl = items.get('pl');
  if (pl && slugOk(pl)) g.planning = pl;
  g.headroomTargetBn = int('hr', g.headroomTargetBn);
  const th = items.get('th');
  if (th && slugOk(th)) g.theme = th;
  g.priorities = list('pr');
  g.protectedPromises = list('pp');
  g.concessions = list('cn');
  g.capital = int('cp', g.capital);
  for (const d of list('dl')) {
    const dash = d.lastIndexOf('-');
    const year = toFiscalYear(d.slice(dash + 1));
    if (dash > 0 && year) g.delays[d.slice(0, dash)] = year;
  }
  g.revealed = items.get('rv') === '1';
  const rb = items.get('rb');
  if (rb && slugOk(rb)) g.rabbit = rb;
  g.breachAccepted = items.get('br') === '1';
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
 * `g` carries the playthrough and `S` the pre-forecast snapshot, both absent until they exist,
 * so a link with neither is exactly what it was before Phase 8.
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
  if (state.snapshot && Object.keys(state.snapshot).length > 0) {
    const snapshot: Record<string, number> = {};
    for (const [code, value] of Object.entries(state.snapshot)) {
      const lever = byCode.get(code);
      if (lever && value !== lever.control.default) snapshot[code] = value;
    }
    if (Object.keys(snapshot).length > 0) params.set('S', encodePairs(snapshot));
  }
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
  const snap = params.get('S');
  if (snap) {
    const snapshot: Record<string, number> = {};
    decodePairs(snap, byCode, warnings, snapshot);
    if (Object.keys(snapshot).length > 0) state.snapshot = snapshot;
  }
  return { state, warnings };
}
