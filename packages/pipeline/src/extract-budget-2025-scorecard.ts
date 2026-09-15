/**
 * Extract HM Treasury's Budget 2025 Table 4.1 policy decisions (xlsx) into JSON: one entry per
 * numbered measure with its title, Tax/Spend type and £ million values by fiscal year.
 * HMT's sign convention is kept as published: positive values reduce borrowing.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readSheetRows, type CellValue } from './lib/xlsx.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface ScorecardMeasure {
  number: number;
  title: string;
  type: 'Tax' | 'Spend';
  values: Record<string, number>;
}

export interface ScorecardExtract {
  schemaVersion: 1;
  sourceId: string;
  sheet: string;
  years: string[];
  signConvention: 'positiveReducesBorrowing';
  measures: ScorecardMeasure[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

const FY = /^\d{4}-\d{2}$/;

function asNumber(cell: CellValue): number | null {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const n = Number(cell.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function extractBudget2025Scorecard(
  localPath = 'data/raw/hmt-budget-2025/Table_4.1_-_Budget_2025_Policy_Decisions.xlsx',
  sourceId = 'hmt-budget-2025-table-4-1',
): Promise<ScorecardExtract> {
  const file = path.join(REPO_ROOT, localPath);
  const sheet = 'PresentationalScorecardRounded';
  const rows = await readSheetRows(file, sheet);
  const headerIndex = rows.findIndex((r) =>
    r.some((c) => typeof c === 'string' && FY.test(c.trim())),
  );
  if (headerIndex < 0) throw new Error('scorecard header row with fiscal years not found');
  const header = rows[headerIndex] ?? [];
  const yearColumns: Array<{ index: number; year: string }> = [];
  header.forEach((c, i) => {
    if (typeof c === 'string' && FY.test(c.trim())) yearColumns.push({ index: i, year: c.trim() });
  });
  const measures: ScorecardMeasure[] = [];
  const firstYearColumn = Math.min(...yearColumns.map((c) => c.index));
  for (const row of rows.slice(headerIndex + 1)) {
    // Columns before the first year column hold the measure number, title and Tax/Spend type,
    // possibly with empty cells between them; locate each by content rather than position.
    const lead = row.slice(0, firstYearColumn);
    const numberCell = lead.find((c) => asNumber(c) !== null && Number.isInteger(asNumber(c)));
    const number = numberCell === undefined ? null : asNumber(numberCell);
    const type = lead.find((c) => typeof c === 'string' && /^(Tax|Spend)$/.test(c.trim()));
    const title = lead.find(
      (c) =>
        typeof c === 'string' &&
        c.trim() !== '' &&
        !/^(Tax|Spend)$/.test(c.trim()) &&
        asNumber(c) === null,
    );
    if (number === null || typeof title !== 'string' || typeof type !== 'string') continue;
    const values: Record<string, number> = {};
    for (const { index, year } of yearColumns) {
      const v = asNumber(row[index] ?? null);
      if (v !== null) values[year] = v;
    }
    measures.push({ number, title: title.trim(), type: type.trim() as 'Tax' | 'Spend', values });
  }
  if (measures.length === 0) throw new Error('no measures found in scorecard');
  return {
    schemaVersion: 1,
    sourceId,
    sheet,
    years: yearColumns.map((c) => c.year),
    signConvention: 'positiveReducesBorrowing',
    measures,
    source: {
      sourceId,
      localPath,
      sha256: existsSync(file) ? sha256(new Uint8Array(readFileSync(file))) : null,
    },
  };
}
