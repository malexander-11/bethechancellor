import ExcelJS from 'exceljs';

export type CellValue = string | number | null;

/** Rows of a worksheet as plain values (formulas resolved to their cached results). */
export async function readSheetRows(file: string, sheetName: string): Promise<CellValue[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    const names = workbook.worksheets.map((w) => w.name).join(', ');
    throw new Error(`sheet "${sheetName}" not found in ${file}; available: ${names}`);
  }
  const rows: CellValue[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values: CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(normalise(cell.value));
    });
    rows.push(values);
  });
  return rows;
}

export async function listSheetNames(file: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  return workbook.worksheets.map((w) => w.name);
}

function normalise(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined)
      return normalise(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('error' in value) return null;
  }
  return String(value);
}
