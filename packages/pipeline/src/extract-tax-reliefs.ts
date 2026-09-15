/**
 * Extract HMRC's "Estimated cost of tax reliefs" statistics (ODS, Table 2: six-year cost
 * estimates) into JSON: one entry per relief with its code, tax type, relief type, £ million
 * cost by fiscal year and HMRC's description. HMRC's figures are the static cost of each relief;
 * they are not the yield from removing it. Row ids are slugs of HMRC's relief code (or of the
 * name where HMRC gives no code) and are what lever files cite.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from './extract-hmrc-trr.js';
import { readOdsTable } from './lib/ods.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface ReliefRow {
  rowId: string;
  code: string;
  name: string;
  taxType: string;
  reliefType: string;
  firstForecastYear: string;
  /** £ million as published; null where HMRC prints a marker such as "Negligible" or "Disclosive". */
  values: Record<string, number | null>;
  negligible: Record<string, boolean>;
  /** HMRC's text where no number is published ("Not available", "Disclosive", …). */
  markers: Record<string, string>;
  description: string;
}

export interface ReliefExtract {
  schemaVersion: 1;
  sourceId: string;
  sheet: string;
  title: string;
  years: string[];
  rows: ReliefRow[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

const YEAR_HEADER = /^(\d{4}) to (\d{4})$/;

function yearFromHeader(cell: string): string | null {
  const match = YEAR_HEADER.exec(cell.trim());
  if (!match) return null;
  return `${match[1]}-${String(match[2]).slice(2)}`;
}

export function parseReliefNumber(text: string): {
  value: number | null;
  negligible: boolean;
  marker: string | null;
} {
  const t = text.trim();
  if (/^negligible$/i.test(t)) return { value: null, negligible: true, marker: t };
  const n = t === '' || t === '-' ? Number.NaN : Number(t.replace(/,/g, ''));
  if (Number.isFinite(n)) return { value: n, negligible: false, marker: null };
  return { value: null, negligible: false, marker: t === '' ? 'blank' : t };
}

export function extractTaxReliefs(
  localPath = 'data/raw/hmrc-tax-reliefs-2026-01/tax_relief_statistics_january_2026.ods',
  sourceId = 'hmrc-tax-reliefs-2026-01',
  sheet = 'Table_2',
): ReliefExtract {
  const file = path.join(REPO_ROOT, localPath);
  const { rows } = readOdsTable(file, sheet);
  const headerIndex = rows.findIndex((r) => r[0]?.trim() === 'Name' && r[1]?.trim() === 'Code');
  if (headerIndex < 0) throw new Error(`${sheet}: header row (Name, Code) not found`);
  const header = rows[headerIndex] ?? [];
  const title = rows
    .slice(0, headerIndex)
    .flat()
    .map((c) => c.trim())
    .find((c) => c !== '');
  const columns = header.map((c) => c.trim());
  const col = (name: string): number => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error(`${sheet}: column "${name}" not found`);
    return i;
  };
  const yearColumns: Array<{ index: number; year: string }> = [];
  columns.forEach((c, i) => {
    const year = yearFromHeader(c);
    if (year) yearColumns.push({ index: i, year });
  });
  if (yearColumns.length === 0) throw new Error(`${sheet}: no year columns found`);
  const iName = col('Name');
  const iCode = col('Code');
  const iTax = col('Tax type');
  const iRelief = col('Relief type');
  const iFirst = col('First forecasted costing year');
  const iDesc = col('Description');

  const out: ReliefRow[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerIndex + 1)) {
    const name = (row[iName] ?? '').trim();
    if (!name) continue;
    const code = (row[iCode] ?? '').trim();
    const values: Record<string, number | null> = {};
    const negligible: Record<string, boolean> = {};
    const markers: Record<string, string> = {};
    for (const { index, year } of yearColumns) {
      const parsed = parseReliefNumber(row[index] ?? '');
      values[year] = parsed.value;
      negligible[year] = parsed.negligible;
      if (parsed.marker !== null) markers[year] = parsed.marker;
    }
    let rowId = slugify(code && !/^not available$/i.test(code) ? code : name);
    const count = (seen.get(rowId) ?? 0) + 1;
    seen.set(rowId, count);
    if (count > 1) rowId = `${rowId}-${count}`;
    out.push({
      rowId,
      code,
      name,
      taxType: (row[iTax] ?? '').trim(),
      reliefType: (row[iRelief] ?? '').trim(),
      firstForecastYear: (row[iFirst] ?? '').trim(),
      values,
      negligible,
      markers,
      description: (row[iDesc] ?? '').trim(),
    });
  }
  if (out.length === 0) throw new Error(`${sheet}: no relief rows found`);
  return {
    schemaVersion: 1,
    sourceId,
    sheet,
    title: title ?? sheet,
    years: yearColumns.map((c) => c.year),
    rows: out,
    source: {
      sourceId,
      localPath,
      sha256: existsSync(file) ? sha256(new Uint8Array(readFileSync(file))) : null,
    },
  };
}
