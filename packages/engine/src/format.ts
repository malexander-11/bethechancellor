const MINUS = '−';

function withSign(n: number, positiveSign: boolean): string {
  if (n < 0) return MINUS;
  return positiveSign && n > 0 ? '+' : '';
}

/** £ million → "£23.6bn" (negative as "−£3.3bn"). */
export function formatGbpBn(gbpm: number, decimals = 1, signed = false): string {
  if (!Number.isFinite(gbpm)) return 'n/a';
  const bn = Math.abs(gbpm) / 1000;
  const rounded = bn.toFixed(decimals);
  const isZero = Number(rounded) === 0;
  return `${isZero ? '' : withSign(gbpm, signed)}£${rounded}bn`;
}

/** Percentage points or per cent with a fixed number of decimals. */
export function formatPct(value: number, decimals = 1, signed = false, suffix = '%'): string {
  if (!Number.isFinite(value)) return 'n/a';
  const rounded = Math.abs(value).toFixed(decimals);
  const isZero = Number(rounded) === 0;
  return `${isZero ? '' : withSign(value, signed)}${rounded}${suffix}`;
}

/** £ million spread over `households` → pounds per household, rounded to the nearest £10. */
export function perHousehold(gbpm: number, households: number): number {
  return Math.round((gbpm * 1_000_000) / households / 10) * 10;
}

export function formatGbp(amount: number, signed = false): string {
  if (!Number.isFinite(amount)) return 'n/a';
  const abs = Math.abs(Math.round(amount)).toLocaleString('en-GB');
  return `${withSign(amount, signed)}£${abs}`;
}
