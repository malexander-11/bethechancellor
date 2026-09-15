import { EngineError } from '../errors.js';
import { taxHeadSchema } from '../schema/lever.schema.js';
import type {
  GrowthHead,
  Series,
  SpendingHead,
  TaxHead,
  Vintage,
  YearValues,
} from '../types/data.js';

export function isTaxHead(head: GrowthHead): head is TaxHead {
  return (taxHeadSchema.options as readonly string[]).includes(head);
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

/** True when the vintage can supply the series a lever follows. */
export function hasHead(vintage: Vintage, head: GrowthHead): boolean {
  if (isTaxHead(head)) {
    return head === 'nominalGdp' || vintage.fiscal.receiptsByHeadPctGdp[head] !== undefined;
  }
  return spendingSeries(vintage, head) !== undefined;
}

/** £ million by fiscal year for any growth head: receipts heads are derived, spending lines are read. */
export function headSeries(vintage: Vintage, head: GrowthHead): YearValues {
  if (isTaxHead(head)) return taxHeadSeries(vintage, head);
  const series = spendingSeries(vintage, head);
  if (!series) throw new EngineError(`vintage ${vintage.id} has no spending series "${head}"`);
  return { ...series.values };
}

/** Where the head series comes from, for derivation steps. */
export function headSourceTable(head: GrowthHead): string {
  return isTaxHead(head)
    ? 'Table 3.1 (receipts by head, % of GDP) and derived nominal GDP'
    : 'Table 4.1 (departmental limits) or Table 4.6 (welfare spending)';
}

export function describeHead(head: GrowthHead): string {
  return isTaxHead(head) ? `${head} receipts` : `${head} spending`;
}
