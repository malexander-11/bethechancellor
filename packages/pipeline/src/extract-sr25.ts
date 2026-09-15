/**
 * Extract HM Treasury's Spending Review 2025 departmental DEL tables (xlsx) into JSON: Table 5.3
 * (resource DEL excluding depreciation, plans to 2028-29) and Table 5.4 (capital DEL, plans to
 * 2029-30). One entry per published row with £ million values by fiscal year, the published
 * average annual real growth figures, and a memo flag for "of which" and "Memo:" rows. Row ids
 * are label slugs and are what spending lever files cite.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from './extract-hmrc-trr.js';
import { readSheetRows, type CellValue } from './lib/xlsx.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface Sr25Row {
  rowId: string;
  label: string;
  /** "of which" and "Memo:" rows: shown for context, never part of a total. */
  memo: boolean;
  /** £ million by fiscal year (the table is in £ billion); null where the table prints "-". */
  values: Record<string, number | null>;
  /** Published average annual real growth by period, as a fraction (0.0279 = 2.8% a year). */
  averageAnnualRealGrowth: Record<string, number | null>;
}

export interface Sr25Table {
  sheet: string;
  title: string;
  unit: 'GBPm';
  publishedUnit: string;
  years: string[];
  realGrowthPeriods: string[];
  rows: Sr25Row[];
}

export interface Sr25Extract {
  schemaVersion: 1;
  sourceId: string;
  tables: Sr25Table[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

const FY = /^\d{4}-\d{2}$/;
const REAL_GROWTH_PERIOD = /^\d{4}-\d{2} to \d{4}-\d{2}$/;
export const SR25_SHEETS = ['Table 5.3 RDELex', 'Table 5.4 CDEL'] as const;

function text(cell: CellValue): string {
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number') return String(cell);
  return '';
}

/**
 * Remove a footnote marker glued to the end of a label ("Cabinet Office10", "(FT)12",
 * "Sizewell C7"). A number after a space ("High Speed 2") is part of the name and is kept, as is
 * a digit inside an acronym ("IFRS9").
 */
export function cleanSr25Label(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?<=[a-z)]|\s[A-Z])\d{1,2}$/, '')
    .trim();
}

/** £ billion cell → £ million to three decimal places; "-" → null. */
function toGbpm(cell: CellValue): number | null {
  const n = asNumber(cell);
  return n === null ? null : Math.round(n * 1_000_000) / 1000;
}

function toFraction(cell: CellValue): number | null {
  const n = asNumber(cell);
  return n === null ? null : Math.round(n * 1_000_000) / 1_000_000;
}

function asNumber(cell: CellValue): number | null {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const t = cell.trim();
    if (t === '' || t === '-') return null;
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function extractTable(file: string, sheet: string): Promise<Sr25Table> {
  const rows = await readSheetRows(file, sheet);
  const headerIndex = rows.findIndex(
    (r) => r.filter((c) => typeof c === 'string' && FY.test(c.trim())).length >= 3,
  );
  if (headerIndex < 0) throw new Error(`${sheet}: header row with fiscal years not found`);
  const header = rows[headerIndex] ?? [];
  const yearColumns: Array<{ index: number; year: string }> = [];
  const growthColumns: Array<{ index: number; period: string }> = [];
  header.forEach((c, i) => {
    const t = text(c);
    if (FY.test(t)) yearColumns.push({ index: i, year: t });
    else if (REAL_GROWTH_PERIOD.test(t)) growthColumns.push({ index: i, period: t });
  });
  const firstYearColumn = Math.min(...yearColumns.map((c) => c.index));
  const publishedUnit =
    header
      .slice(0, firstYearColumn)
      .map(text)
      .find((t) => t.includes('£')) ?? '';
  const title =
    rows
      .slice(0, headerIndex)
      .flatMap((r) => r.map(text))
      .find((t) => /Departmental Expenditure Limits/i.test(t)) ?? sheet;

  const out: Sr25Row[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerIndex + 1)) {
    // Table 5.3 prints a clean label and a footnoted copy side by side; Table 5.4 prints one
    // label with the footnote glued on. Take the first non-empty label cell and clean it.
    const labelCell = row
      .slice(0, firstYearColumn)
      .map(text)
      .find((t) => t !== '');
    if (!labelCell) continue;
    const label = cleanSr25Label(labelCell);
    const values: Record<string, number | null> = {};
    let hasValues = false;
    for (const { index, year } of yearColumns) {
      const cell = row[index] ?? null;
      values[year] = toGbpm(cell);
      if (text(cell) !== '') hasValues = true;
    }
    if (!hasValues) continue;
    const averageAnnualRealGrowth: Record<string, number | null> = {};
    for (const { index, period } of growthColumns) {
      averageAnnualRealGrowth[period] = toFraction(row[index] ?? null);
    }
    let rowId = slugify(label);
    const count = (seen.get(rowId) ?? 0) + 1;
    seen.set(rowId, count);
    if (count > 1) rowId = `${rowId}-${count}`;
    out.push({
      rowId,
      label,
      memo: /^(of which|memo)\b/i.test(label),
      values,
      averageAnnualRealGrowth,
    });
  }
  if (out.length === 0) throw new Error(`${sheet}: no rows found`);
  return {
    sheet,
    title: title.trim(),
    unit: 'GBPm',
    publishedUnit,
    years: yearColumns.map((c) => c.year),
    realGrowthPeriods: growthColumns.map((c) => c.period),
    rows: out,
  };
}

export async function extractSr25DelTables(
  localPath = 'data/raw/hmt-sr25/SR25_Department_DEL_tables.xlsx',
  sourceId = 'hmt-sr25-del-tables',
): Promise<Sr25Extract> {
  const file = path.join(REPO_ROOT, localPath);
  const tables: Sr25Table[] = [];
  for (const sheet of SR25_SHEETS) tables.push(await extractTable(file, sheet));
  return {
    schemaVersion: 1,
    sourceId,
    tables,
    source: {
      sourceId,
      localPath,
      sha256: existsSync(file) ? sha256(new Uint8Array(readFileSync(file))) : null,
    },
  };
}
