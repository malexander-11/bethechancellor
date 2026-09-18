/**
 * Extract HMRC's "Private pension statistics" Table 6, the estimated cost of pension income tax
 * and National Insurance contribution relief (£ million by tax year), into the same JSON shape as
 * the tax relief extract, so a lever can cite a row of it the same way. Two published files feed
 * it: Table 6 itself (every year, totals and breakdowns) and the tidy-format Tables 6.1 and 6.2
 * (the latest year only, split by the taxpayer's marginal rate). The three by-rate totals are sums
 * of HMRC's five contribution-type rows at that rate, and say so in their description. HMRC's
 * figures are the static cost of the relief; they are not the yield from removing it.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReliefExtract, ReliefRow } from './extract-tax-reliefs.js';
import { parseCsv } from './lib/csv.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

const YEAR = /^(\d{4}) to (\d{4})$/;

function fiscalYear(cell: string): string {
  const match = YEAR.exec(cell.trim());
  if (!match) throw new Error(`private pensions: unrecognised tax year "${cell}"`);
  return `${match[1]}-${String(match[2]).slice(2)}`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Table 6 rows, keyed by what HMRC calls them, with the id and wording a lever cites. */
const TABLE_6_ROWS: ReadonlyArray<{
  rowId: string;
  name: string;
  taxType: string;
  match: { tax: string; charge: string; breakdown: string; nicsClass: string };
  description: string;
}> = [
  {
    rowId: 'it-gross-relief-total',
    name: 'Income tax relief on pension contributions and pension fund investment income (gross)',
    taxType: 'Income Tax',
    match: {
      tax: 'Income Tax',
      charge: 'Gross relief',
      breakdown: 'Total',
      nicsClass: 'Not applicable',
    },
    description:
      'Gross income tax relief: on contributions by individuals and employers, and on the investment income of pension funds, before the tax charged on pensions in payment.',
  },
  {
    rowId: 'nics-gross-relief-total',
    name: 'National Insurance relief on employer pension contributions (gross)',
    taxType: 'NICs',
    match: { tax: 'NICs', charge: 'Gross relief', breakdown: 'Total', nicsClass: 'Total' },
    description:
      'Employer contributions to registered pension schemes, including salary-sacrificed contributions, are disregarded for both employer and employee National Insurance.',
  },
  {
    rowId: 'nics-employer-contributions-employer-relief',
    name: 'Employer NICs (Class 1 secondary) relief on employer pension contributions',
    taxType: 'NICs',
    match: {
      tax: 'NICs',
      charge: 'Gross relief',
      breakdown: 'Employer contributions',
      nicsClass: 'Class 1 Secondary (employer)',
    },
    description:
      'Employer National Insurance not paid on employer contributions to registered pension schemes, excluding salary-sacrificed contributions.',
  },
  {
    rowId: 'nics-employer-contributions-employee-relief',
    name: 'Employee NICs (Class 1 primary) relief on employer pension contributions',
    taxType: 'NICs',
    match: {
      tax: 'NICs',
      charge: 'Gross relief',
      breakdown: 'Employer contributions',
      nicsClass: 'Class 1 Primary (employee)',
    },
    description:
      'Employee National Insurance not paid on employer contributions to registered pension schemes, excluding salary-sacrificed contributions.',
  },
  {
    rowId: 'nics-salary-sacrifice-employer-relief',
    name: 'Employer NICs (Class 1 secondary) relief on salary-sacrificed pension contributions',
    taxType: 'NICs',
    match: {
      tax: 'NICs',
      charge: 'Gross relief',
      breakdown: 'Salary sacrificed contributions',
      nicsClass: 'Class 1 Secondary (employer)',
    },
    description:
      'Employer National Insurance not paid on pension contributions made by salary sacrifice.',
  },
  {
    rowId: 'nics-salary-sacrifice-employee-relief',
    name: 'Employee NICs (Class 1 primary) relief on salary-sacrificed pension contributions',
    taxType: 'NICs',
    match: {
      tax: 'NICs',
      charge: 'Gross relief',
      breakdown: 'Salary sacrificed contributions',
      nicsClass: 'Class 1 Primary (employee)',
    },
    description:
      'Employee National Insurance not paid on pension contributions made by salary sacrifice.',
  },
  {
    rowId: 'it-charge-total',
    name: 'Income tax charged on pension payments and allowance charges',
    taxType: 'Income Tax',
    match: { tax: 'Income Tax', charge: 'Charge', breakdown: 'Total', nicsClass: 'Not applicable' },
    description:
      'Income tax liable on payments from pension schemes plus annual and lifetime allowance charges; HMRC nets this off gross relief.',
  },
  {
    rowId: 'total-net-relief',
    name: 'Net cost of pension tax and National Insurance relief',
    taxType: 'Income Tax and NICs',
    match: { tax: 'Total', charge: 'Net relief', breakdown: 'Total', nicsClass: 'Total' },
    description:
      'Gross income tax and National Insurance relief less the income tax charged on pensions in payment and allowance charges.',
  },
];

const RATES = ['Basic Rate', 'Higher Rate', 'Additional Rate'] as const;

export function extractPrivatePensions(
  table6Path = 'data/raw/hmrc-private-pensions-2026-07/Table_6.csv',
  tidyPath = 'data/raw/hmrc-private-pensions-2026-07/Tables_6_1_and_6_2.csv',
  sourceId = 'hmrc-private-pensions-2026-07',
): ReliefExtract {
  const table6File = path.join(REPO_ROOT, table6Path);
  const tidyFile = path.join(REPO_ROOT, tidyPath);
  const table6 = parseCsv(readFileSync(table6File, 'utf8'));
  const tidy = parseCsv(readFileSync(tidyFile, 'utf8'));

  const header = table6[0] ?? [];
  const col = (name: string, columns: string[]): number => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error(`private pensions: column "${name}" not found`);
    return i;
  };
  const iYear = col('tax_year', header);
  const iTax = col('income_tax_nics', header);
  const iCharge = col('relief_charge', header);
  const iBreakdown = col('breakdown', header);
  const iClass = col('nics_relief_class', header);
  const iValue = col('value', header);

  const years = new Set<string>();
  const rows: ReliefRow[] = [];
  for (const spec of TABLE_6_ROWS) {
    const values: Record<string, number | null> = {};
    for (const row of table6.slice(1)) {
      if (
        row[iTax] !== spec.match.tax ||
        row[iCharge] !== spec.match.charge ||
        row[iBreakdown] !== spec.match.breakdown ||
        row[iClass] !== spec.match.nicsClass
      )
        continue;
      const year = fiscalYear(row[iYear] ?? '');
      years.add(year);
      const n = Number(row[iValue]);
      if (!Number.isFinite(n))
        throw new Error(`private pensions: bad value for ${spec.rowId} ${year}`);
      values[year] = n;
    }
    if (Object.keys(values).length === 0)
      throw new Error(`private pensions: no Table 6 rows matched ${spec.rowId}`);
    rows.push({
      rowId: spec.rowId,
      code: 'Table 6',
      name: spec.name,
      taxType: spec.taxType,
      reliefType: 'Non-structural',
      firstForecastYear: '',
      values,
      negligible: Object.fromEntries(Object.keys(values).map((y) => [y, false])),
      markers: {},
      description: spec.description,
    });
  }

  // Tables 6.1 and 6.2 (tidy): income tax relief on contributions by the taxpayer's marginal rate,
  // latest year only; sector and scheme totals.
  const tHeader = tidy[0] ?? [];
  const tYear = col('tax_year', tHeader);
  const tTax = col('income_tax_nics', tHeader);
  const tType = col('contribution_type', tHeader);
  const tSector = col('sector_scheme', tHeader);
  const tScheme = col('scheme_type', tHeader);
  const tRate = col('tax_rate', tHeader);
  const tValue = col('value_of_relief', tHeader);
  const byRate = new Map<string, Array<{ type: string; value: number }>>();
  let tidyYear: string | null = null;
  for (const row of tidy.slice(1)) {
    if (row[tTax] !== 'Income Tax' || row[tSector] !== 'Total' || row[tScheme] !== 'Total')
      continue;
    const rate = row[tRate] ?? '';
    if (!(RATES as readonly string[]).includes(rate)) continue;
    const year = fiscalYear(row[tYear] ?? '');
    if (tidyYear && tidyYear !== year) throw new Error('private pensions: tidy table spans years');
    tidyYear = year;
    const n = Number(row[tValue]);
    if (!Number.isFinite(n)) throw new Error(`private pensions: bad tidy value for ${rate}`);
    const list = byRate.get(rate) ?? [];
    list.push({ type: row[tType] ?? '', value: n });
    byRate.set(rate, list);
  }
  if (!tidyYear) throw new Error('private pensions: no by-rate rows found in the tidy table');
  years.add(tidyYear);
  for (const rate of RATES) {
    const parts = byRate.get(rate) ?? [];
    if (parts.length !== 5)
      throw new Error(
        `private pensions: expected five contribution types at ${rate}, got ${parts.length}`,
      );
    for (const part of parts) {
      rows.push({
        rowId: `it-relief-${slug(part.type)}-${slug(rate)}`,
        code: 'Table 6.1',
        name: `Income tax relief on ${part.type.toLowerCase()} at the ${rate.toLowerCase()}`,
        taxType: 'Income Tax',
        reliefType: 'Non-structural',
        firstForecastYear: '',
        values: { [tidyYear]: part.value },
        negligible: { [tidyYear]: false },
        markers: {},
        description: `Income tax relief on ${part.type.toLowerCase()} given at the ${rate.toLowerCase()}, all sectors and scheme types (Tables 6.1 and 6.2, tidy format).`,
      });
    }
    const total = parts.reduce((acc, p) => acc + p.value, 0);
    rows.push({
      rowId: `it-relief-by-rate-${slug(rate)}`,
      code: 'Table 6.1',
      name: `Income tax relief on pension contributions given at the ${rate.toLowerCase()}`,
      taxType: 'Income Tax',
      reliefType: 'Non-structural',
      firstForecastYear: '',
      values: { [tidyYear]: total },
      negligible: { [tidyYear]: false },
      markers: {},
      description: `Sum of HMRC's five contribution-type rows (individual net pay, individual relief at source, salary sacrificed, employer net pay plus deficit reduction, employer relief at source) given at the ${rate.toLowerCase()}, all sectors and scheme types. A sum of published rows, not a published row.`,
    });
  }

  const sortedYears = [...years].sort();
  return {
    schemaVersion: 1,
    sourceId,
    sheet: 'Table 6',
    title:
      'Table 6: Estimated cost of pension income tax and National Insurance contribution relief (£ million), with Tables 6.1 and 6.2 by marginal rate',
    years: sortedYears,
    rows,
    source: {
      sourceId,
      localPath: table6Path,
      sha256: existsSync(table6File)
        ? sha256(new Uint8Array([...readFileSync(table6File), ...readFileSync(tidyFile)]))
        : null,
    },
  };
}
