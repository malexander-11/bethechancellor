import type { HmrcExtract, Lever, ScorecardExtract, YearValues } from '../types/data.js';

export interface ExtractedSources {
  hmrc?: HmrcExtract;
  scorecard?: ScorecardExtract;
}

const TOLERANCE = 0.5;

function signOf(hmrcSign: 'yield' | 'cost'): number {
  return hmrcSign === 'yield' ? 1 : -1;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

/**
 * Every direct costing must reproduce from the extracted published tables: cited rows exist with the
 * same values, and the engine-sign tables equal the signed sums of those rows.
 */
export function checkRawSourceConsistency(lever: Lever, extracted: ExtractedSources): string[] {
  const problems: string[] = [];
  const costing = lever.costing;
  if (
    costing.kind !== 'linearPerUnit' &&
    costing.kind !== 'lookupTable' &&
    costing.kind !== 'schedule'
  ) {
    return problems;
  }
  const raw = costing.rawSource;
  if (!raw)
    return lever.badge === 'direct' ? [`${lever.id}: direct costing without rawSource`] : problems;

  if (raw.kind === 'hmrcReadyReckoner') {
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
        signed[y] = signOf(row.hmrcSign) * published;
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

  // HMT scorecard: reversal levers. effect[y] must equal −Σ lines[y] (reduces-borrowing → receipts sign).
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
    for (const [y, v] of Object.entries(costing.effect)) {
      if (!extract.years.includes(y)) {
        problems.push(`${lever.id}: schedule year ${y} is outside the scorecard years`);
        continue;
      }
      if (!close(v, -(sum[y] ?? 0)))
        problems.push(
          `${lever.id}: schedule ${y} = ${v} but minus the cited lines gives ${-(sum[y] ?? 0)}`,
        );
    }
  }
  return problems;
}
