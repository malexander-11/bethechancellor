import type {
  HmrcExtract,
  Lever,
  RawSource,
  ScorecardExtract,
  Sr25Extract,
  YearValues,
} from '../types/data.js';

export interface ExtractedSources {
  hmrc?: HmrcExtract;
  scorecard?: ScorecardExtract;
  sr25?: Sr25Extract;
}

type Side = 'receipts' | 'spending';

const TOLERANCE = 0.5;

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

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

/**
 * Every direct costing and every published baseline must reproduce from the extracted tables:
 * cited rows exist with the same values, and the engine-sign tables equal the signed sums of
 * those rows.
 */
export function checkRawSourceConsistency(lever: Lever, extracted: ExtractedSources): string[] {
  const costing = lever.costing;
  const side: Side = lever.classification?.side ?? 'receipts';
  if (costing.kind === 'pctOfBaseline') {
    if (costing.baseline.from !== 'published') return [];
    return checkSr25Rows(
      lever,
      costing.baseline.rawSource,
      costing.baseline.years,
      costing.baseline.values,
      extracted,
    );
  }
  if (
    costing.kind !== 'linearPerUnit' &&
    costing.kind !== 'lookupTable' &&
    costing.kind !== 'schedule'
  ) {
    return [];
  }
  const raw = costing.rawSource;
  if (!raw)
    return lever.badge === 'direct' ? [`${lever.id}: direct costing without rawSource`] : [];
  if (raw.kind === 'hmrcReadyReckoner') return checkHmrcRows(lever, raw, side, extracted);
  if (raw.kind === 'hmtScorecard') return checkScorecardLines(lever, raw, side, extracted);
  return [`${lever.id}: Spending Review rows can only back a percentage-of-baseline costing`];
}

function checkHmrcRows(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'hmrcReadyReckoner' }>,
  side: Side,
  extracted: ExtractedSources,
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
        problems.push(`${lever.id}: lookup point ${point.input} does not cite rows (from)`);
        continue;
      }
      const expected = sumRows(point.from.rowIds);
      for (const y of extract.years) {
        const want = (expected[y] ?? 0) * point.from.multiplier;
        if (!close(point.effect[y] ?? 0, want)) {
          problems.push(
            `${lever.id}: lookup point ${point.input} ${y} = ${point.effect[y]} but cited rows × ${point.from.multiplier} give ${want}`,
          );
        }
      }
    }
  }
  return problems;
}

function checkScorecardLines(
  lever: Lever,
  raw: Extract<RawSource, { kind: 'hmtScorecard' }>,
  side: Side,
  extracted: ExtractedSources,
): string[] {
  const problems: string[] = [];
  const costing = lever.costing;
  const extract = extracted.scorecard;
  if (!extract) return [`${lever.id}: no scorecard extract available to check against`];
  if (extract.sourceId !== raw.sourceId)
    problems.push(`${lever.id}: rawSource cites ${raw.sourceId}, extract is ${extract.sourceId}`);
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
  if (costing.kind === 'schedule') {
    const sign = reversalSign(side);
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
