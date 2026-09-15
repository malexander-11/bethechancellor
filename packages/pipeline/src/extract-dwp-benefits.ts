/**
 * Extract DWP's benefit expenditure and caseload tables (Table 1a, expenditure by benefit in
 * nominal terms). The forecast years are consistent with the OBR's, so the state pension line
 * here is the base for costing a change to how it is uprated.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from './extract-hmrc-trr.js';
import { readOdsTable } from './lib/ods.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface BenefitRow {
  rowId: string;
  label: string;
  /** DWP's classification marker, e.g. "(C)" contributory or "(IR)" income-related. */
  marker: string;
  /** £ million nominal by fiscal year; null where DWP prints "-". */
  values: Record<string, number | null>;
}

export interface DwpBenefitExtract {
  schemaVersion: 1;
  sourceId: string;
  sheet: string;
  title: string;
  years: string[];
  rows: BenefitRow[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

/** DWP writes years as "2029/30"; the rest of this repository uses "2029-30". */
function fiscalYear(cell: string): string | null {
  const m = /^(\d{4})\/(\d{2})$/.exec(cell.trim());
  return m ? `${m[1]}-${m[2]}` : null;
}

/** DWP's benefit-type markers, e.g. "(C)" contributory, "(NC / NIR)" non-contributory. */
const MARKER = /^\([A-Z/ ]+\)$/;

function asNumber(cell: string): number | null {
  const t = cell.trim();
  if (t === '' || t === '-' || t === '..') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function extractDwpBenefits(
  localPath = 'data/raw/dwp-benefit-expenditure-2026/outturn-and-forecast-tables-spring-forecast-2026.ods',
  sourceId = 'dwp-benefit-expenditure-2026',
  sheet = 'Table_1a',
  /** Outturn back to 1948-49 is not needed here; keep the years the forecast covers. */
  fromYear = '2019-20',
): DwpBenefitExtract {
  const file = path.join(REPO_ROOT, localPath);
  const { rows } = readOdsTable(file, sheet);
  const headerIndex = rows.findIndex((r) => r.filter((c) => fiscalYear(c ?? '')).length >= 10);
  if (headerIndex < 0) throw new Error(`${sheet}: header row with fiscal years not found`);
  const header = rows[headerIndex] ?? [];
  const columns: Array<{ index: number; year: string }> = [];
  let firstYearIndex = header.length;
  header.forEach((c, i) => {
    const year = fiscalYear(c ?? '');
    if (!year) return;
    firstYearIndex = Math.min(firstYearIndex, i);
    if (year >= fromYear) columns.push({ index: i, year });
  });
  if (columns.length === 0) throw new Error(`${sheet}: no year columns from ${fromYear}`);
  const title = (header[1] ?? sheet).replace(/,$/, '').trim();

  const out: BenefitRow[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerIndex + 1)) {
    // DWP puts the benefit name and its type marker in the columns left of the first year.
    const lead = row.slice(0, firstYearIndex).map((c) => (c ?? '').trim());
    const label = lead.filter((c) => c !== '' && !MARKER.test(c)).pop() ?? '';
    if (!label) continue;
    const values: Record<string, number | null> = {};
    let hasValues = false;
    for (const { index, year } of columns) {
      values[year] = asNumber(row[index] ?? '');
      if (values[year] !== null) hasValues = true;
    }
    if (!hasValues) continue;
    let rowId = slugify(label);
    const count = (seen.get(rowId) ?? 0) + 1;
    seen.set(rowId, count);
    if (count > 1) rowId = `${rowId}-${count}`;
    out.push({ rowId, label, marker: lead.find((c) => MARKER.test(c)) ?? '', values });
  }
  if (out.length === 0) throw new Error(`${sheet}: no benefit rows found`);
  return {
    schemaVersion: 1,
    sourceId,
    sheet,
    title,
    years: columns.map((c) => c.year),
    rows: out,
    source: {
      sourceId,
      localPath,
      sha256: existsSync(file) ? sha256(new Uint8Array(readFileSync(file))) : null,
    },
  };
}
