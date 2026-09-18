/**
 * A small reader for the CSV files GOV.UK statistics publish: comma separated, fields optionally
 * double-quoted with doubled quotes inside, one record a line, no embedded newlines. Enough for
 * HMRC's tables; not a general parser.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const fields: string[] = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    rows.push(fields.map((f) => f.trim()));
  }
  return rows;
}
