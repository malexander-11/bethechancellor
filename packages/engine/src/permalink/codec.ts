import type { Lever } from '../types/data.js';
import type { AssessAsOf } from '../types/engine.js';

export const PERMALINK_VERSION = 1;

export interface PermalinkState {
  vintageCode: string;
  rulesCode: string;
  implementationYear: string;
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
}

export interface DecodedPermalink {
  state: Partial<PermalinkState> & { leverValues: Record<string, number> };
  warnings: string[];
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
  return { state, warnings };
}
