/**
 * Extract HM Treasury's Public Expenditure Statistical Analyses (PESA) chapter 4 tables: public
 * sector expenditure on services by function in real terms (Table 4.3, £ billion in the latest
 * year's prices) and as a share of GDP (Table 4.4). These are accredited official statistics and
 * cover the whole public sector, so they are context for departmental budgets, not the same
 * measure. Row ids are slugs of the function name with its numbering removed.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from './extract-hmrc-trr.js';
import { readSheetRows, type CellValue } from './lib/xlsx.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface PesaRow {
  rowId: string;
  label: string;
  /** "of which" lines and memo lines: context only, never part of a total. */
  memo: boolean;
  values: Record<string, number | null>;
}

export interface PesaTable {
  sheet: string;
  title: string;
  unit: 'GBPbn' | 'pctGDP';
  years: string[];
  rows: PesaRow[];
}

export interface PesaExtract {
  schemaVersion: 1;
  sourceId: string;
  tables: PesaTable[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

const FY = /^\d{4}-\d{2}$/;

/** "2. Defence(1)" → "Defence"; "7. Health" → "Health". */
export function cleanPesaLabel(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/(?<=[a-z)])\d{1,2}$/, '')
    .trim();
}

function text(cell: CellValue): string {
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number') return String(cell);
  return '';
}

function asNumber(cell: CellValue): number | null {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const t = cell.trim();
    if (t === '' || t === '-' || t === '..') return null;
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function extractTable(
  file: string,
  sheet: string,
  unit: PesaTable['unit'],
): Promise<PesaTable> {
  const rows = await readSheetRows(file, sheet);
  const headerIndex = rows.findIndex((r) => r.filter((c) => FY.test(text(c))).length >= 10);
  if (headerIndex < 0) throw new Error(`${sheet}: header row with fiscal years not found`);
  const header = rows[headerIndex] ?? [];
  const yearColumns: Array<{ index: number; year: string }> = [];
  header.forEach((c, i) => {
    const t = text(c);
    if (FY.test(t)) yearColumns.push({ index: i, year: t });
  });
  const firstYear = Math.min(...yearColumns.map((c) => c.index));
  const title =
    rows
      .slice(0, headerIndex)
      .flatMap((r) => r.map(text))
      .find((t) => /^Table 4\./.test(t)) ?? sheet;

  const out: PesaRow[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerIndex + 1)) {
    const labelCell = row
      .slice(0, firstYear)
      .map(text)
      .find((t) => t !== '');
    if (!labelCell) continue;
    const label = cleanPesaLabel(labelCell);
    if (!label) continue;
    const values: Record<string, number | null> = {};
    let hasValues = false;
    for (const { index, year } of yearColumns) {
      values[year] = asNumber(row[index] ?? null);
      if (text(row[index] ?? null) !== '') hasValues = true;
    }
    if (!hasValues) continue;
    let rowId = slugify(label);
    const count = (seen.get(rowId) ?? 0) + 1;
    seen.set(rowId, count);
    if (count > 1) rowId = `${rowId}-${count}`;
    out.push({ rowId, label, memo: /^(of which|memo)\b/i.test(label), values });
  }
  if (out.length === 0) throw new Error(`${sheet}: no rows found`);
  return { sheet, title: title.trim(), unit, years: yearColumns.map((c) => c.year), rows: out };
}

export async function extractPesaFunctions(
  localPath = 'data/raw/hmt-pesa-2025/PESA_2025_CP_Chapter_4_tables.xlsx',
  sourceId = 'hmt-pesa-2025',
): Promise<PesaExtract> {
  const file = path.join(REPO_ROOT, localPath);
  const tables = [
    await extractTable(file, '4_3', 'GBPbn'),
    await extractTable(file, '4_4', 'pctGDP'),
  ];
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
