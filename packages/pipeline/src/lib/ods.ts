import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { unzipSync } from 'fflate';

export type OdsCell = string;

/** Guard against a pathological repeat count; real sheets never carry this many columns. */
const MAX_REPEAT = 1024;

interface XmlNode {
  [key: string]: unknown;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (typeof node === 'object') {
    const obj = node as XmlNode;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@_')) continue;
      parts.push(textOf(value));
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/**
 * Read one table of an OpenDocument spreadsheet as rows of trimmed cell text.
 * Repeated empty cells are expanded (capped) so column positions are preserved.
 */
export function readOdsTable(
  file: string,
  tableName?: string,
): { name: string; rows: OdsCell[][] } {
  const zip = unzipSync(new Uint8Array(readFileSync(file)));
  const content = zip['content.xml'];
  if (!content) throw new Error(`${file} has no content.xml`);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: false,
  });
  const doc = parser.parse(new TextDecoder().decode(content)) as XmlNode;
  const body = (doc['office:document-content'] as XmlNode)['office:body'] as XmlNode;
  const spreadsheet = body['office:spreadsheet'] as XmlNode;
  const tables = asArray(spreadsheet['table:table'] as XmlNode | XmlNode[]);
  const table = tableName ? tables.find((t) => t['@_table:name'] === tableName) : tables[0];
  if (!table) {
    throw new Error(
      `table "${tableName}" not found in ${file}; available: ${tables.map((t) => t['@_table:name']).join(', ')}`,
    );
  }
  const rows: OdsCell[][] = [];
  for (const row of asArray(table['table:table-row'] as XmlNode | XmlNode[])) {
    const repeatRow = Number(row['@_table:number-rows-repeated'] ?? 1);
    const cells: OdsCell[] = [];
    // A run of blank cells is only materialised once a later cell has content, so the
    // "repeat to the end of the sheet" marker at a row's end costs nothing while runs of
    // repeated values in the middle of a row keep every column in its published position.
    let pendingBlanks = 0;
    for (const cell of asArray(row['table:table-cell'] as XmlNode | XmlNode[])) {
      const repeat = Math.min(Number(cell['@_table:number-columns-repeated'] ?? 1), MAX_REPEAT);
      const text = textOf(cell['text:p']);
      if (text === '') {
        pendingBlanks += repeat;
        continue;
      }
      for (let i = 0; i < Math.min(pendingBlanks, MAX_REPEAT); i += 1) cells.push('');
      pendingBlanks = 0;
      for (let i = 0; i < repeat; i += 1) cells.push(text);
    }
    if (cells.length === 0) continue;
    for (let i = 0; i < Math.min(repeatRow, 1); i += 1) rows.push([...cells]);
  }
  return { name: String(table['@_table:name']), rows };
}

/** Parse an HMRC-style number: "8,200" → 8200, "-540" → -540, "Neg"/"neg"/"" → null. */
export function parseReadyReckonerNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned === '' || /^neg/i.test(cleaned) || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
