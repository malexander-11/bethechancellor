import { EngineError } from '../errors.js';
import { fyStart } from '../calc/years.js';
import type {
  DerivationStep,
  SourceRef,
  UpratingRule,
  Vintage,
  YearValues,
} from '../types/data.js';
import { taxHeadSeries } from './taxHead.js';

export interface PublishedSeries {
  /** Published years in order, e.g. the three ready-reckoner years. */
  years: string[];
  /** Engine-sign effect keyed by published year. */
  values: YearValues;
}

export interface UpratedSeries {
  values: YearValues;
  factors: YearValues;
  sourceYearFor: Record<string, string>;
  steps: DerivationStep[];
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/**
 * Carry a published profile to the game's years (ADR-0004, methodology §6).
 *
 * Published year k maps to implementationYear + (k − 1). With `growWithSeries` each value is
 * scaled by head[target] / head[source]; beyond the last published year the last value is
 * extended with the same head. Years before the implementation year are zero.
 */
export function uprateToForecast(
  published: PublishedSeries,
  rule: UpratingRule,
  vintage: Vintage,
  implementationYear: string,
  policyYears: readonly string[],
  headSource: SourceRef,
): UpratedSeries {
  const n = published.years.length;
  if (n === 0) throw new EngineError('published series has no years');
  const start = fyStart(implementationYear);
  const head = rule.method === 'growWithSeries' ? taxHeadSeries(vintage, rule.head) : undefined;
  const values: YearValues = {};
  const factors: YearValues = {};
  const sourceYearFor: Record<string, string> = {};
  const steps: DerivationStep[] = [];

  steps.push({
    op: 'shiftYears',
    formula: `Published year 1 (${published.years[0]}) applies from ${implementationYear}; later published years follow in order.`,
    from: published.years[0],
    to: implementationYear,
  });

  for (const target of policyYears) {
    const offset = fyStart(target) - start;
    if (offset < 0) {
      values[target] = 0;
      factors[target] = 1;
      continue;
    }
    const beyond = offset >= n;
    const k = Math.min(offset, n - 1);
    const sourceYear = published.years[k];
    if (!sourceYear) throw new EngineError('published year missing');
    const base = published.values[sourceYear] ?? 0;
    sourceYearFor[target] = sourceYear;

    if (rule.method === 'none') {
      values[target] = beyond ? 0 : base;
      factors[target] = beyond ? 0 : 1;
      continue;
    }
    if (rule.method === 'flatCash') {
      values[target] = base;
      factors[target] = 1;
      if (beyond) {
        steps.push({
          op: 'extend',
          formula: `${target}: held at the ${sourceYear} figure in cash terms (${fmt(base)})`,
          from: sourceYear,
          to: target,
          factor: 1,
        });
      }
      continue;
    }
    const headTarget = head?.[target];
    const headSourceValue = head?.[sourceYear];
    if (headTarget === undefined || headSourceValue === undefined || headSourceValue === 0) {
      throw new EngineError(
        `cannot uprate: head "${rule.head}" missing for ${sourceYear} or ${target} in vintage ${vintage.id}`,
      );
    }
    const factor = headTarget / headSourceValue;
    const value = base * factor;
    values[target] = value;
    factors[target] = factor;
    steps.push({
      op: beyond ? 'extend' : 'scale',
      formula: `${target}: ${fmt(base)} (published for ${sourceYear}) × ${fmt(headTarget)} ÷ ${fmt(headSourceValue)} (OBR ${rule.head} receipts, ${target} ÷ ${sourceYear}) = ${fmt(value)}`,
      factor,
      from: sourceYear,
      to: target,
      source: headSource,
    });
  }
  return { values, factors, sourceYearFor, steps };
}
