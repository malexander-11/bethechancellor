export interface DebtInterestResult {
  /** Total extra borrowing each year, including interest on earlier extra borrowing. */
  borrowing: number[];
  /** The interest component of `borrowing`. */
  interest: number[];
  /** Cumulative extra debt at the end of each year. */
  extraDebt: number[];
}

/**
 * Debt interest on extra borrowing with a half-year convention (ADR-0005):
 * interest in year t accrues on last year's extra debt plus half of this year's extra borrowing.
 *
 *   ΔB_t = (ΔB^prim_t + r_t · ΔD_{t−1}) / (1 − r_t / 2)
 *   ΔD_t = ΔD_{t−1} + ΔB_t
 *
 * `marginalRates` are fractions (0.045 for 4.5%). With `enabled` false the primary path is returned.
 */
export function applyDebtInterestFeedback(
  primary: readonly number[],
  marginalRates: readonly number[],
  enabled: boolean,
): DebtInterestResult {
  const n = primary.length;
  const borrowing: number[] = new Array<number>(n);
  const interest: number[] = new Array<number>(n);
  const extraDebt: number[] = new Array<number>(n);
  let debt = 0;
  for (let t = 0; t < n; t += 1) {
    const p = primary[t] ?? 0;
    const r = enabled ? (marginalRates[t] ?? 0) : 0;
    const b = (p + r * debt) / (1 - r / 2);
    borrowing[t] = b;
    interest[t] = b - p;
    debt += b;
    extraDebt[t] = debt;
  }
  return { borrowing, interest, extraDebt };
}
