/**
 * Extract HMRC's "Direct effects of illustrative tax changes" ready reckoner (ODS) into JSON:
 * one row per illustrative change with £ million values by fiscal year, section headings and
 * negligible flags. Row ids are `<section slug>--<label slug>` and are what lever files cite.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseReadyReckonerNumber, readOdsTable } from './lib/ods.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

export interface HmrcExtractRow {
  rowId: string;
  section: string;
  label: string;
  values: Record<string, number | null>;
  negligible: Record<string, boolean>;
}

export interface HmrcExtract {
  schemaVersion: 1;
  sourceId: string;
  sheet: string;
  years: string[];
  rows: HmrcExtractRow[];
  notes: string[];
  source: { sourceId: string; localPath: string; sha256: string | null };
}

const FOOTER_PATTERNS = [/^neg stands for/i, /^for detailed methodology/i, /^end of worksheet/i];

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/%/g, ' pct ')
    .replace(/£/g, ' gbp ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yearFromHeader(cell: string): string | null {
  const match = /financial year (\d{4}) to (\d{4})/i.exec(cell);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).slice(2)}`;
}

export function extractHmrcReadyReckoner(
  localPath = 'data/raw/hmrc-trr-2025-06/June_2025_TRR.ods',
  sourceId = 'hmrc-trr-2025-06',
): HmrcExtract {
  const file = path.join(REPO_ROOT, localPath);
  const { name: sheet, rows } = readOdsTable(file, 'Publication_Format');
  const headerIndex = rows.findIndex((r) => (r[0] ?? '').trim() === 'Column1');
  if (headerIndex < 0) throw new Error('ready reckoner header row (Column1) not found');
  const header = rows[headerIndex] ?? [];
  const years = header
    .slice(1)
    .map(yearFromHeader)
    .filter((y): y is string => y !== null);
  if (years.length !== 3) throw new Error(`expected three year columns, found ${years.length}`);

  const out: HmrcExtractRow[] = [];
  const notes: string[] = [];
  const seen = new Map<string, number>();
  let section = '';
  for (const row of rows.slice(headerIndex + 1)) {
    const label = (row[0] ?? '').trim();
    if (!label) continue;
    const cells = row.slice(1, 1 + years.length).map((c) => (c ?? '').trim());
    const hasValues = cells.some((c) => c !== '');
    if (!hasValues) {
      if (FOOTER_PATTERNS.some((p) => p.test(label))) notes.push(label);
      else section = label;
      continue;
    }
    let rowId = section ? `${slugify(section)}--${slugify(label)}` : slugify(label);
    const count = (seen.get(rowId) ?? 0) + 1;
    seen.set(rowId, count);
    if (count > 1) rowId = `${rowId}-${count}`;
    const values: Record<string, number | null> = {};
    const negligible: Record<string, boolean> = {};
    years.forEach((year, i) => {
      const text = cells[i] ?? '';
      values[year] = parseReadyReckonerNumber(text);
      negligible[year] = /^neg/i.test(text.trim());
    });
    out.push({ rowId, section, label, values, negligible });
  }
  // Rows before the header (title, note) are also notes.
  for (const row of rows.slice(0, headerIndex)) {
    const label = (row[0] ?? '').trim();
    if (label && FOOTER_PATTERNS.some((p) => p.test(label))) notes.unshift(label);
  }
  return {
    schemaVersion: 1,
    sourceId,
    sheet,
    years,
    rows: out,
    notes,
    source: {
      sourceId,
      localPath,
      sha256: existsSync(file) ? sha256(new Uint8Array(readFileSync(file))) : null,
    },
  };
}
