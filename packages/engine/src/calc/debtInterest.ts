export interface DebtInterestResult {
  /** Total extra borrowing each year, including interest on earlier extra borrowing. */
  borrowing: number[];
  /** The interest component of `borrowing`. */
  interest: number[];
  /** Cumulative extra cash borrowed at the end of each year, financial transactions included. */
  extraDebt: number[];
}

/**
 * Debt interest on extra borrowing with a half-year convention (ADR-0005):
 * interest in year t accrues on last year's extra debt plus half of this year's extra borrowing.
 *
 *   ΔB_t = (ΔB^prim_t + r_t · (ΔD_{t−1} + ΔF_t / 2)) / (1 − r_t / 2)
 *   ΔD_t = ΔD_{t−1} + ΔB_t + ΔF_t
 *
 * ΔF is cash paid for financial assets. It is borrowed, so it carries interest on the same
 * half-year convention, but it is not expenditure and never enters ΔB.
 *
 * `marginalRates` are fractions (0.045 for 4.5%). With `enabled` false the primary path is returned.
 */
export function applyDebtInterestFeedback(
  primary: readonly number[],
  marginalRates: readonly number[],
  enabled: boolean,
  financialTransactions: readonly number[] = [],
): DebtInterestResult {
  const n = primary.length;
  const borrowing: number[] = new Array<number>(n);
  const interest: number[] = new Array<number>(n);
  const extraDebt: number[] = new Array<number>(n);
  let debt = 0;
  for (let t = 0; t < n; t += 1) {
    const p = primary[t] ?? 0;
    const f = financialTransactions[t] ?? 0;
    const r = enabled ? (marginalRates[t] ?? 0) : 0;
    const b = (p + r * (debt + f / 2)) / (1 - r / 2);
    borrowing[t] = b;
    interest[t] = b - p;
    debt += b + f;
    extraDebt[t] = debt;
  }
  return { borrowing, interest, extraDebt };
}
