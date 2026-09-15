import { EngineError } from '../errors.js';
import { spendingHeadSchema, taxHeadSchema } from '../schema/lever.schema.js';
import type {
  GrowthHead,
  Series,
  SpendingHead,
  TaxHead,
  Vintage,
  YearValues,
} from '../types/data.js';

const RECEIPTS_BY_TAX = /^receiptsByTax\.([A-Za-z]+)$/;

export function isTaxHead(head: GrowthHead): head is TaxHead {
  return (taxHeadSchema.options as readonly string[]).includes(head);
}

export function isSpendingHead(head: GrowthHead): head is SpendingHead {
  return (spendingHeadSchema.options as readonly string[]).includes(head);
}

/** The receiptsByTax key named by a "receiptsByTax.<key>" head, or null for other heads. */
export function receiptsByTaxKey(head: GrowthHead): string | null {
  const match = RECEIPTS_BY_TAX.exec(head);
  return match?.[1] ?? null;
}

/** £ million receipts for a head by fiscal year: share of GDP × financial-year nominal GDP. */
export function taxHeadSeries(vintage: Vintage, head: TaxHead): YearValues {
  const gdp = vintage.economy.nominalGdpFy.values;
  if (head === 'nominalGdp') return { ...gdp };
  const share = vintage.fiscal.receiptsByHeadPctGdp[head];
  if (!share) throw new EngineError(`vintage ${vintage.id} has no receipts head "${head}"`);
  const out: YearValues = {};
  for (const [year, pct] of Object.entries(share.values)) {
    const g = gdp[year];
    if (g !== undefined) out[year] = (pct / 100) * g;
  }
  return out;
}

/** The vintage's £ million series for a spending line, if it has one. */
export function spendingSeries(vintage: Vintage, head: SpendingHead): Series | undefined {
  switch (head) {
    case 'rdel':
      return vintage.fiscal.rdel;
    case 'cdel':
      return vintage.fiscal.cdel;
    case 'welfareTotal':
      return vintage.fiscal.welfareTotal;
    case 'welfareInCap':
      return vintage.fiscal.welfareInCap;
    default:
      return vintage.fiscal.welfareComponents?.[head];
  }
}

/** The vintage's £ million series for one tax (EFO Table A.5), if it has one. */
export function receiptsByTaxSeries(vintage: Vintage, head: GrowthHead): Series | undefined {
  const key = receiptsByTaxKey(head);
  return key ? vintage.fiscal.receiptsByTax?.[key] : undefined;
}

/** True when the vintage can supply the series a lever follows. */
export function hasHead(vintage: Vintage, head: GrowthHead): boolean {
  if (isTaxHead(head)) {
    return head === 'nominalGdp' || vintage.fiscal.receiptsByHeadPctGdp[head] !== undefined;
  }
  if (isSpendingHead(head)) return spendingSeries(vintage, head) !== undefined;
  return receiptsByTaxSeries(vintage, head) !== undefined;
}

/** £ million by fiscal year for any growth head: receipts heads are derived, other lines are read. */
export function headSeries(vintage: Vintage, head: GrowthHead): YearValues {
  if (isTaxHead(head)) return taxHeadSeries(vintage, head);
  const series = isSpendingHead(head)
    ? spendingSeries(vintage, head)
    : receiptsByTaxSeries(vintage, head);
  if (!series) throw new EngineError(`vintage ${vintage.id} has no series "${head}"`);
  return { ...series.values };
}

/** Where the head series comes from, for derivation steps. */
export function headSourceTable(head: GrowthHead): string {
  if (isTaxHead(head)) return 'Table 3.1 (receipts by head, % of GDP) and derived nominal GDP';
  if (isSpendingHead(head))
    return 'Table 4.1 (departmental limits) or Table 4.6 (welfare spending)';
  return 'Table A.5 (current receipts by tax)';
}

export function describeHead(head: GrowthHead): string {
  if (isTaxHead(head)) return `${head} receipts`;
  if (isSpendingHead(head)) return `${head} spending`;
  return `${receiptsByTaxKey(head) ?? head} receipts`;
}
