import { EngineError } from '../errors.js';
import type { TaxHead, Vintage, YearValues } from '../types/data.js';

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
