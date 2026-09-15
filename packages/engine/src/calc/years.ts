import { EngineError } from '../errors.js';

const FISCAL_YEAR = /^(\d{4})-(\d{2})$/;

/** True for strings like "2029-30" where the second part follows the first. */
export function isFiscalYear(value: string): boolean {
  const match = FISCAL_YEAR.exec(value);
  if (!match) return false;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return (start + 1) % 100 === end;
}

export function fyStart(fy: string): number {
  const match = FISCAL_YEAR.exec(fy);
  if (!match) throw new EngineError(`invalid fiscal year "${fy}"`);
  return Number(match[1]);
}

export function fyFromStart(start: number): string {
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function nextFy(fy: string): string {
  return fyFromStart(fyStart(fy) + 1);
}

export function prevFy(fy: string): string {
  return fyFromStart(fyStart(fy) - 1);
}

export function compareFy(a: string, b: string): number {
  return fyStart(a) - fyStart(b);
}

/** Inclusive range of fiscal years. */
export function fyRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let y = fyStart(from); y <= fyStart(to); y += 1) out.push(fyFromStart(y));
  return out;
}

/** Calendar year label ("2029") in which a fiscal year starts. */
export function fyStartYearLabel(fy: string): string {
  return String(fyStart(fy));
}
