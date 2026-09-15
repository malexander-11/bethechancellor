import { headSeries, receiptsByTaxSeries } from '../costing/taxHead.js';
import type {
  DwpBenefitExtract,
  HmrcExtract,
  Lever,
  PesaExtract,
  RawSource,
  ReliefExtract,
  ScorecardExtract,
  Sr25Extract,
  Vintage,
  YearValues,
} from '../types/data.js';

export interface ExtractedSources {
  hmrc?: HmrcExtract;
  /** The Budget 2025 scorecard (kept for callers that pass one scorecard). */
  scorecard?: ScorecardExtract;
  /** Scorecards keyed by source id (Budget 2025, Autumn Budget 2024, …). */
  scorecards?: Record<string, ScorecardExtract>;
  sr25?: Sr25Extract;
  reliefs?: ReliefExtract;
  pesa?: PesaExtract;
  dwp?: DwpBenefitExtract;
}

type Side = 'receipts' | 'spending';

const TOLERANCE = 0.5;
/** Arithmetic this repository does itself is authored rounded to whole £ million. */
const DERIVED_TOLERANCE = 1;

function scorecardFor(extracted: ExtractedSources, sourceId: string): ScorecardExtract | undefined {
  const keyed = extracted.scorecards?.[sourceId];
  if (keyed) return keyed;
  return extracted.scorecard?.sourceId === sourceId ? extracted.scorecard : undefined;
}

/**
 * Engine sign of a published HMRC row. On the receipts side a "yield" raises revenue (+) and a
 * "cost" lowers it (−). On the spending side a "cost" is more spending (+) and a "yield" less (−).
 */
function signOf(hmrcSign: 'yield' | 'cost', side: Side): number {
  const yieldSign = side === 'receipts' ? 1 : -1;
  return hmrcSign === 'yield' ? yieldSign : -yieldSign;
}

/**
 * Engine sign of a reversed scorecard line. Reversing a measure that reduced borrowing by X
 * raises borrowing by X: receipts fall by X on the tax side, spending rises by X on the spending side.
 */
function reversalSign(side: Side): number {
  return side === 'receipts' ? -1 : 1;
}

/** Removing a relief collects the tax it forgoes: more receipts (+), or less spending if ever used that way. */
function reliefSign(side: Side): number {
  return side === 'receipts' ? 1 : -1;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

/**
 * A milestone that cites a PESA row must reproduce from the extracted table: a growth rate is
 * recomputed from its two years, a level or share is read straight off.
 */
export function checkMilestones(lever: Lever, extracted: ExtractedSources): string[] {
  const problems: string[] = [];
  for (const milestone of lever.milestones ?? []) {
    const from = milestone.from;
    if (!from) continue;
    const extract = extracted.pesa;
    if (!extract) return [`${lever.id}: no PESA extract to check milestones against`];
    const table = extract.tables.find((t) => t.sheet === from.pesaSheet);
    if (!table) {
      problems.push(`${lever.id}: PESA sheet ${from.pesaSheet} not in the extract`);
      continue;
    }
    const row = table.rows.find((r) => r.rowId === from.rowId);
    if (!row) {
      problems.push(`${lever.id}: PESA row "${from.rowId}" not in ${table.sheet}`);
      continue;
    }
    const to = row.values[from.toYear];
    if (to === null || to === undefined) {
      problems.push(`${lever.id}: PESA row ${row.rowId} has no value for ${from.toYear}`);
      continue;
    }
    if (milestone.unit === 'pctRealPerYear') {
      const startYear = from.fromYear;
      if (!startYear) {
        problems.push(`${lever.id}: milestone "${milestone.label}" needs fromYear`);
        continue;
      }
      const start = row.values[startYear];
      if (start === null || start === undefined || start <= 0) {
        problems.push(`${lever.id}: PESA row ${row.rowId} has no value for ${startYear}`);
        continue;
      }
      const years = Number(from.toYear.slice(0, 4)) - Number(startYear.slice(0, 4));
      const expected = ((to / start) ** (1 / years) - 1) * 100;
      if (Math.abs(milestone.value - expected) > 0.05) {
        problems.push(
          `${lever.id}: milestone "${milestone.label}" = ${milestone.value} but ${row.rowId} gives ${expected.toFixed(2)}`,
        );
      }
      continue;
    }
    if (Math.abs(milestone.value - to) > 0.05) {
      problems.push(
        `${lever.id}: milestone "${milestone.label}" = ${milestone.value} but ${row.rowId} ${from.toYear} is ${to}`,
      );
    }
  }
  return problems;
}

/**
 * Every direct costing and every published baseline must reproduce from the extracted tables (or,
 * for a lookup point that cites a vintage series, from the vintage): cited rows exist with the
 * same values, and the engine-sign tables equal the signed sums of those rows.
 */
export function checkRawSourceConsistency(
  lever: Lever,
  extracted: ExtractedSources,
  vintage?: Vintage,
): string[] {
  const costing = lever.costing;
  const side: Side = lever.classification?.side ?? 'receipts';
  const found = checkMilestones(lever, extracted);
  const and = (more: string[]): string[] => [...found, ...more];
  if (costing.kind === 'pctOfBaseline') {
    if (costing.baseline.from !== 'published') return found;
    return and(
      checkSr25Rows(
        lever,
        costing.baseline.rawSource,
        costing.baseline.years,
        costing.baseline.values,
        extracted,
      ),
    );
  }
  if (
    costing.kind !== 'linearPerUnit' &&
    costing.kind !== 'lookupTable' &&
    costing.kind !== 'schedule'
  ) {
    return found;
  }
  const raw = costing.rawSource;
  if (!raw)
    return lever.badge === 'direct'
      ? and([`${lever.id}: direct costing without rawSource`])
      : found;
  if (raw.kind === 'hmrcReadyReckoner')
    return and(checkHmrcRows(lever, raw, side, extracted, vintage));
  if (raw.kind === 'hmtScorecard') return and(checkScorecardLines(lever, raw, side, extracted));
  if (raw.kind === 'hmrcReliefCost') return and(checkReliefRows(lever, raw, side, extracted));
  if (raw.kind === 'derivedFromPublished')
    return and(checkDerivedArithmetic(lever, raw, extracted, vintage));
  return and([`${lever.id}: Spending Review rows can only back a percentage-of-baseline costing`]);
}

/** Expected engine-sign effect of a lookup point that cites a vintage series (the whole tax line). */
function vintageSeriesEffect(
  lever: Lever,
  series: string,
  multiplier: number,
  years: string[],
  vintage: Vintage | undefined,
  problems: string[],
): YearValues | null {
  if (!vintage) {
    problems.push(`${lever.id}: lookup point cites ${series} but no vintage was given to check`);
    return null;
  }
  const found = receiptsByTaxSeries(vintage, series);
  if (!found) {
    problems.push(`${lever.id}: series ${series} is not in vintage ${vintage.id}`);
    return null;
  }
  const out: YearValues = {};
  for (const y of years) {
    const v = found.values[y];
    if (v === undefined) {
      problems.push(`${lever.id}: series ${series} has no value for ${y}`);
      continue;
    }
    out[y] = multiplier * v;
  }
  return out;
}

function checkHmrcRows(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'hmrcReadyReckoner' }>,
  side: Side,
  extracted: ExtractedSources,
  vintage: Vintage | undefined,
): string[] {
  const problems: string[] = [];
  const costing = lever.costing;
  const extract = extracted.hmrc;
  if (!extract) return [`${lever.id}: no HMRC extract available to check against`];
  if (extract.sourceId !== raw.sourceId)
    problems.push(`${lever.id}: rawSource cites ${raw.sourceId}, extract is ${extract.sourceId}`);
  if (raw.years.join() !== extract.years.join())
    problems.push(`${lever.id}: rawSource years ${raw.years.join(', ')} differ from the extract`);
  const byId = new Map(extract.rows.map((r) => [r.rowId, r] as const));
  const signedRow = new Map<string, YearValues>();
  for (const row of raw.rows) {
    const found = byId.get(row.rowId);
    if (!found) {
      problems.push(`${lever.id}: row "${row.rowId}" not in the HMRC extract`);
      continue;
    }
    if (found.label !== row.label)
      problems.push(
        `${lever.id}: row ${row.rowId} label "${row.label}" differs from published "${found.label}"`,
      );
    const signed: YearValues = {};
    for (const y of extract.years) {
      const published = found.values[y];
      const cited = row.values[y];
      if (published === null || published === undefined) {
        if (cited !== undefined && cited !== 0)
          problems.push(
            `${lever.id}: row ${row.rowId} ${y} is negligible in HMRC's table but cited as ${cited}`,
          );
        signed[y] = 0;
        continue;
      }
      if (cited === undefined || !close(cited, published)) {
        problems.push(
          `${lever.id}: row ${row.rowId} ${y} cited ${cited ?? 'missing'} but published ${published}`,
        );
      }
      signed[y] = signOf(row.hmrcSign, side) * published;
    }
    signedRow.set(row.rowId, signed);
  }
  const sumRows = (rowIds: string[]): YearValues => {
    const out: YearValues = {};
    for (const id of rowIds) {
      for (const [y, v] of Object.entries(signedRow.get(id) ?? {})) out[y] = (out[y] ?? 0) + v;
    }
    return out;
  };
  if (costing.kind === 'linearPerUnit') {
    const inc = raw.rows.filter((r) => r.role === 'increase').map((r) => r.rowId);
    const dec = raw.rows.filter((r) => r.role === 'decrease').map((r) => r.rowId);
    const expectedInc = sumRows(inc);
    for (const y of extract.years) {
      if (!close(costing.perUnit[y] ?? 0, expectedInc[y] ?? 0)) {
        problems.push(
          `${lever.id}: perUnit ${y} = ${costing.perUnit[y]} but the cited rows give ${expectedInc[y]}`,
        );
      }
    }
    if (dec.length > 0) {
      const expectedDec = sumRows(dec);
      for (const y of extract.years) {
        if (!close(costing.decreasePerUnit?.[y] ?? 0, expectedDec[y] ?? 0)) {
          problems.push(
            `${lever.id}: decreasePerUnit ${y} = ${costing.decreasePerUnit?.[y]} but the cited rows give ${expectedDec[y]}`,
          );
        }
      }
    } else if (costing.decreasePerUnit) {
      problems.push(`${lever.id}: decreasePerUnit given but no row has role "decrease"`);
    }
  }
  if (costing.kind === 'lookupTable') {
    for (const point of costing.points) {
      if (point.input === 0) {
        if (Object.values(point.effect).some((v) => v !== 0))
          problems.push(`${lever.id}: the point at 0 must have zero effect`);
        continue;
      }
      if (!point.from) {
        problems.push(`${lever.id}: lookup point ${point.input} does not cite its source (from)`);
        continue;
      }
      const years = Object.keys(point.effect);
      const expected = point.from.vintageSeries
        ? vintageSeriesEffect(
            lever,
            point.from.vintageSeries,
            point.from.multiplier,
            years,
            vintage,
            problems,
          )
        : scale(sumRows(point.from.rowIds ?? []), point.from.multiplier);
      if (!expected) continue;
      for (const y of years) {
        const want = expected[y] ?? 0;
        if (!close(point.effect[y] ?? 0, want)) {
          problems.push(
            `${lever.id}: lookup point ${point.input} ${y} = ${point.effect[y]} but its source gives ${want}`,
          );
        }
      }
    }
  }
  return problems;
}

function scale(values: YearValues, multiplier: number): YearValues {
  const out: YearValues = {};
  for (const [y, v] of Object.entries(values)) out[y] = v * multiplier;
  return out;
}

function checkScorecardLines(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'hmtScorecard' }>,
  side: Side,
  extracted: ExtractedSources,
): string[] {
  const problems: string[] = [];
  const costing = lever.costing;
  const extract = scorecardFor(extracted, raw.sourceId);
  if (!extract) return [`${lever.id}: no scorecard extract for ${raw.sourceId} to check against`];
  const byNumber = new Map(extract.measures.map((m) => [m.number, m] as const));
  const sum: YearValues = {};
  for (const line of raw.lines) {
    const found = byNumber.get(line.number);
    if (!found) {
      problems.push(`${lever.id}: scorecard line ${line.number} not found`);
      continue;
    }
    if (found.title.trim() !== line.title.trim())
      problems.push(`${lever.id}: line ${line.number} title differs from the published title`);
    for (const y of extract.years) {
      const published = found.values[y] ?? 0;
      if (!close(line.values[y] ?? 0, published))
        problems.push(
          `${lever.id}: line ${line.number} ${y} cited ${line.values[y]} but published ${published}`,
        );
      sum[y] = (sum[y] ?? 0) + published;
    }
  }
  const sign = reversalSign(side);
  if (costing.kind === 'schedule') {
    for (const [y, v] of Object.entries(costing.effect)) {
      if (!extract.years.includes(y)) {
        problems.push(`${lever.id}: schedule year ${y} is outside the scorecard years`);
        continue;
      }
      const want = sign * (sum[y] ?? 0);
      if (!close(v, want))
        problems.push(
          `${lever.id}: schedule ${y} = ${v} but the cited lines (${side} side) give ${want}`,
        );
    }
  }
  if (costing.kind === 'linearPerUnit') {
    // A scorecard-backed toggle: one unit reverses the lines for the years it cites.
    if (costing.decreasePerUnit)
      problems.push(`${lever.id}: a scorecard-backed toggle cannot have a decrease table`);
    for (const [y, v] of Object.entries(costing.perUnit)) {
      if (!extract.years.includes(y)) {
        problems.push(`${lever.id}: perUnit year ${y} is outside the scorecard years`);
        continue;
      }
      const want = sign * (sum[y] ?? 0);
      if (!close(v, want))
        problems.push(
          `${lever.id}: perUnit ${y} = ${v} but the cited lines (${side} side) give ${want}`,
        );
    }
  }
  return problems;
}

function checkReliefRows(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'hmrcReliefCost' }>,
  side: Side,
  extracted: ExtractedSources,
): string[] {
  const problems: string[] = [];
  const costing = lever.costing;
  const extract = extracted.reliefs;
  if (!extract) return [`${lever.id}: no tax relief extract available to check against`];
  if (extract.sourceId !== raw.sourceId)
    problems.push(`${lever.id}: rawSource cites ${raw.sourceId}, extract is ${extract.sourceId}`);
  const byId = new Map(extract.rows.map((r) => [r.rowId, r] as const));
  const sum: YearValues = {};
  for (const row of raw.rows) {
    const found = byId.get(row.rowId);
    if (!found) {
      problems.push(`${lever.id}: relief row "${row.rowId}" not in the extract`);
      continue;
    }
    if (found.name !== row.name)
      problems.push(
        `${lever.id}: relief ${row.rowId} name "${row.name}" differs from published "${found.name}"`,
      );
    for (const [y, cited] of Object.entries(row.values)) {
      const published = found.values[y];
      if (published === null || published === undefined) {
        problems.push(
          `${lever.id}: relief ${row.rowId} ${y} is not published (${found.markers[y] ?? 'missing'})`,
        );
        continue;
      }
      if (!close(cited, published))
        problems.push(
          `${lever.id}: relief ${row.rowId} ${y} cited ${cited} but published ${published}`,
        );
      sum[y] = (sum[y] ?? 0) + published;
    }
  }
  if (costing.kind !== 'linearPerUnit') {
    return [...problems, `${lever.id}: relief costs back a linear (toggle) costing only`];
  }
  if (costing.decreasePerUnit)
    problems.push(`${lever.id}: a relief-cost toggle cannot have a decrease table`);
  const sign = reliefSign(side);
  for (const [y, v] of Object.entries(costing.perUnit)) {
    const want = sign * (sum[y] ?? 0);
    if (!close(v, want))
      problems.push(`${lever.id}: perUnit ${y} = ${v} but the cited relief rows give ${want}`);
  }
  return problems;
}

function checkSr25Rows(
  lever: Lever,
  raw: RawSource,
  years: readonly string[],
  values: YearValues,
  extracted: ExtractedSources,
): string[] {
  const problems: string[] = [];
  if (raw.kind !== 'hmtSr25')
    return [`${lever.id}: a published baseline must cite Spending Review rows (hmtSr25)`];
  const extract = extracted.sr25;
  if (!extract) return [`${lever.id}: no Spending Review extract available to check against`];
  if (extract.sourceId !== raw.sourceId)
    problems.push(`${lever.id}: rawSource cites ${raw.sourceId}, extract is ${extract.sourceId}`);
  const table = extract.tables.find((t) => t.sheet === raw.sheet);
  if (!table) return [...problems, `${lever.id}: sheet "${raw.sheet}" not in the SR25 extract`];
  const byId = new Map(table.rows.map((r) => [r.rowId, r] as const));
  const expected: YearValues = {};
  for (const row of raw.rows) {
    const found = byId.get(row.rowId);
    if (!found) {
      problems.push(`${lever.id}: row "${row.rowId}" not in ${raw.sheet}`);
      continue;
    }
    if (found.label !== row.label)
      problems.push(
        `${lever.id}: row ${row.rowId} label "${row.label}" differs from published "${found.label}"`,
      );
    if (found.memo)
      problems.push(
        `${lever.id}: row ${row.rowId} is a memo line and cannot be part of a baseline`,
      );
    const sign = row.role === 'subtract' ? -1 : 1;
    for (const [y, cited] of Object.entries(row.values)) {
      const published = found.values[y];
      if (published === null || published === undefined) {
        problems.push(`${lever.id}: row ${row.rowId} has no published value for ${y}`);
        continue;
      }
      if (!close(cited, published))
        problems.push(
          `${lever.id}: row ${row.rowId} ${y} cited ${cited} but published ${published}`,
        );
      expected[y] = (expected[y] ?? 0) + sign * published;
    }
  }
  for (const y of years) {
    if (!table.years.includes(y)) {
      problems.push(`${lever.id}: baseline year ${y} is outside ${raw.sheet}`);
      continue;
    }
    if (!close(values[y] ?? 0, expected[y] ?? 0))
      problems.push(
        `${lever.id}: baseline ${y} = ${values[y]} but the cited rows give ${expected[y]}`,
      );
  }
  return problems;
}

/**
 * Arithmetic this repository does itself on published series. The lever states the method and its
 * inputs; this reproduces the schedule from them, so an edited figure fails the same way a tampered
 * HMRC row does. Signs are the engine's: the method returns the change as the lever's side records it.
 */
function checkDerivedArithmetic(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'derivedFromPublished' }>,
  extracted: ExtractedSources,
  vintage: Vintage | undefined,
): string[] {
  const costing = lever.costing;
  if (costing.kind !== 'schedule')
    return [`${lever.id}: derived arithmetic can only back a schedule costing`];
  if (!vintage) return [`${lever.id}: derived arithmetic needs a vintage to check against`];
  const problems: string[] = [];
  const method = raw.method;
  const expected: YearValues = {};

  if (method.name === 'gdpShareGap') {
    const gdp = vintage.economy.nominalGdpFy.values;
    for (const [year, share] of Object.entries(method.baselinePctGdp)) {
      const denominator = gdp[year];
      if (denominator === undefined) {
        problems.push(`${lever.id}: vintage ${vintage.id} has no nominal GDP for ${year}`);
        continue;
      }
      expected[year] = ((method.targetPctGdp - share) / 100) * denominator;
    }
  } else if (method.name === 'upratingGap') {
    const extract = extracted.dwp;
    if (!extract) return [`${lever.id}: no DWP benefit extract to check the uprating against`];
    if (extract.sourceId !== raw.sourceId)
      problems.push(`${lever.id}: cites ${raw.sourceId} but the extract is ${extract.sourceId}`);
    const row = extract.rows.find((r) => r.rowId === method.rowId);
    if (!row) return [`${lever.id}: row "${method.rowId}" is not in ${extract.sheet}`];
    const current = vintage.economy[method.currentSeries]?.values;
    const replacement = vintage.economy[method.replacementSeries]?.values;
    if (!current || !replacement)
      return [`${lever.id}: vintage ${vintage.id} is missing an uprating series`];
    let factor = 1;
    for (const year of Object.keys(row.values).sort()) {
      if (year <= method.baseYear) continue;
      const now = current[year];
      const instead = replacement[year];
      if (now === undefined || instead === undefined) {
        problems.push(`${lever.id}: no uprating for ${year} in vintage ${vintage.id}`);
        continue;
      }
      factor *= (1 + instead / 100) / (1 + now / 100);
      const level = row.values[year];
      if (level === null || level === undefined) continue;
      expected[year] = level * (factor - 1);
    }
  } else {
    const product = method.terms.reduce((acc, t) => acc * t.value, 1);
    const slack = Math.max(1, Math.abs(method.resultGbpm) * 0.01);
    if (Math.abs(product - method.resultGbpm) > slack)
      problems.push(
        `${lever.id}: the stated terms multiply to ${Math.round(product)} but the result is ${method.resultGbpm}`,
      );
    if (!method.growWith) {
      for (const year of Object.keys(costing.effect)) expected[year] = method.resultGbpm;
    } else {
      const head = headSeries(vintage, method.growWith);
      const base = head[method.baseYear];
      if (base === undefined || base === 0)
        return [`${lever.id}: no ${method.growWith} value for ${method.baseYear}`];
      for (const year of Object.keys(costing.effect)) {
        const level = head[year];
        if (level === undefined) {
          problems.push(`${lever.id}: no ${method.growWith} value for ${year}`);
          continue;
        }
        expected[year] = (method.resultGbpm * level) / base;
      }
    }
  }

  for (const [year, value] of Object.entries(expected)) {
    const authored = costing.effect[year];
    if (authored === undefined) {
      problems.push(`${lever.id}: no scheduled effect for ${year} (the method gives one)`);
      continue;
    }
    if (Math.abs(authored - value) > DERIVED_TOLERANCE)
      problems.push(
        `${lever.id}: ${year} is authored as ${authored} but the method gives ${Math.round(value)}`,
      );
  }
  for (const year of Object.keys(costing.effect))
    if (expected[year] === undefined)
      problems.push(`${lever.id}: ${year} has a scheduled effect the method cannot reproduce`);
  return problems;
}
