import type { Vintage, YearValues } from '../types/data.js';
import type { AggregatePaths, Deltas, FiscalPaths } from '../types/engine.js';
import { applyDebtInterestFeedback } from './debtInterest.js';
import { growthFactors, ratioSeries } from './ratios.js';
import { mapYears, requireValue, valueOrZero, zeros } from './series.js';

export interface ArithmeticInput {
  vintage: Vintage;
  deltas: Deltas;
  /** Percentage points a year added to nominal GDP growth from the first forecast year. */
  growthAdjPp: number;
  /** Percentage points added to the marginal interest rate on new borrowing. */
  marginalRateAdjPp: number;
  debtInterestFeedback: boolean;
}

export function policyYearsOf(vintage: Vintage): string[] {
  return [vintage.years.inYear, ...vintage.years.forecast];
}

export function allYearsOf(vintage: Vintage): string[] {
  return [...vintage.years.outturn, ...policyYearsOf(vintage)];
}

function baselinePaths(vintage: Vintage, years: readonly string[]): AggregatePaths {
  const f = vintage.fiscal;
  const e = vintage.economy;
  const psnb = mapYears(years, (y) => requireValue(f.psnb.values, y, 'psnb'));
  const psnfl = mapYears(years, (y) => requireValue(f.psnfl.values, y, 'psnfl'));
  const gdpFy = mapYears(years, (y) => requireValue(e.nominalGdpFy.values, y, 'nominalGdpFy'));
  const gdpCentred = mapYears(years, (y) =>
    requireValue(e.nominalGdpCentred.values, y, 'nominalGdpCentred'),
  );
  // Outturn years may lack the current/capital split; they are displayed, never assessed.
  const cbd = mapYears(years, (y) => valueOrZero(f.currentBudgetDeficit.values, y));
  const psni = mapYears(years, (y) => valueOrZero(f.psni.values, y));
  return {
    psnb,
    currentBudgetDeficit: cbd,
    psni,
    psnfl,
    receipts: mapYears(years, (y) => valueOrZero(f.receipts.values, y)),
    tme: mapYears(years, (y) => valueOrZero(f.tme.values, y)),
    welfareInCap: mapYears(years, (y) => valueOrZero(f.welfareInCap.values, y)),
    nominalGdpFy: gdpFy,
    nominalGdpCentred: gdpCentred,
    psnbPctGdp: ratioSeries(psnb, gdpFy, years),
    currentBudgetPctGdp: ratioSeries(cbd, gdpFy, years),
    psnflPctGdp: ratioSeries(psnfl, gdpCentred, years),
  };
}

/**
 * The calculation spine (methodology §5).
 *
 * Policy deltas → primary borrowing → debt-interest feedback → plus macro sensitivity effects
 * (which the OBR already states as total effects on borrowing, so they attract no further
 * interest here) → PSNB, PSNI, current budget → PSNFL by delta chaining → ratios using the two
 * GDP denominators.
 */
export function runFiscalArithmetic(input: ArithmeticInput): FiscalPaths {
  const { vintage, deltas } = input;
  const years = allYearsOf(vintage);
  const policyYears = policyYearsOf(vintage);
  const baseline = baselinePaths(vintage, years);
  const firstForecastIndex = years.indexOf(vintage.years.forecast[0] ?? '');
  const gdpFactor = growthFactors(years, firstForecastIndex, input.growthAdjPp);

  const marginalRatePct = mapYears(
    years,
    (y) =>
      valueOrZero(vintage.assumptions.marginalInterestRateOnNewBorrowingPct.values, y) +
      input.marginalRateAdjPp,
  );

  const primary = mapYears(
    policyYears,
    (y) =>
      valueOrZero(deltas.currentSpending, y) +
      valueOrZero(deltas.capitalSpending, y) -
      valueOrZero(deltas.receipts, y),
  );

  const feedback = applyDebtInterestFeedback(
    policyYears.map((y) => primary[y] ?? 0),
    policyYears.map((y) => (marginalRatePct[y] ?? 0) / 100),
    input.debtInterestFeedback,
  );

  const borrowingDelta = zeros(years);
  const interestDelta = zeros(years);
  const extraDebt = zeros(years);
  let cumulative = 0;
  policyYears.forEach((y, i) => {
    const b = (feedback.borrowing[i] ?? 0) + valueOrZero(deltas.macroPsnb, y);
    borrowingDelta[y] = b;
    interestDelta[y] = feedback.interest[i] ?? 0;
    cumulative += b;
    extraDebt[y] = cumulative;
  });

  const capitalDelta = mapYears(
    years,
    (y) =>
      valueOrZero(deltas.capitalSpending, y) +
      (valueOrZero(deltas.macroPsnb, y) - valueOrZero(deltas.macroCurrent, y)),
  );
  const currentBudgetDelta = mapYears(
    years,
    (y) => (borrowingDelta[y] ?? 0) - (capitalDelta[y] ?? 0),
  );

  const psnb = mapYears(years, (y) => (baseline.psnb[y] ?? 0) + (borrowingDelta[y] ?? 0));
  const psni = mapYears(years, (y) => (baseline.psni[y] ?? 0) + (capitalDelta[y] ?? 0));
  const currentBudgetDeficit = mapYears(
    years,
    (y) => (baseline.currentBudgetDeficit[y] ?? 0) + (currentBudgetDelta[y] ?? 0),
  );
  const psnfl = mapYears(years, (y) => (baseline.psnfl[y] ?? 0) + (extraDebt[y] ?? 0));
  const gdpFy = mapYears(years, (y) => (baseline.nominalGdpFy[y] ?? 0) * (gdpFactor[y] ?? 1));
  const gdpCentred = mapYears(
    years,
    (y) => (baseline.nominalGdpCentred[y] ?? 0) * (gdpFactor[y] ?? 1),
  );

  const policy: AggregatePaths = {
    psnb,
    currentBudgetDeficit,
    psni,
    psnfl,
    receipts: mapYears(years, (y) => (baseline.receipts[y] ?? 0) + valueOrZero(deltas.receipts, y)),
    tme: mapYears(
      years,
      (y) =>
        (baseline.tme[y] ?? 0) +
        valueOrZero(deltas.currentSpending, y) +
        valueOrZero(deltas.capitalSpending, y) +
        (interestDelta[y] ?? 0),
    ),
    welfareInCap: mapYears(
      years,
      (y) => (baseline.welfareInCap[y] ?? 0) + valueOrZero(deltas.welfareInCap, y),
    ),
    nominalGdpFy: gdpFy,
    nominalGdpCentred: gdpCentred,
    psnbPctGdp: ratioSeries(psnb, gdpFy, years),
    currentBudgetPctGdp: ratioSeries(currentBudgetDeficit, gdpFy, years),
    psnflPctGdp: ratioSeries(psnfl, gdpCentred, years),
  };

  const fill = (v: YearValues): YearValues => mapYears(years, (y) => valueOrZero(v, y));

  return {
    years,
    policyYears,
    baseline,
    policy,
    deltas: {
      receipts: fill(deltas.receipts),
      currentSpending: fill(deltas.currentSpending),
      capitalSpending: fill(deltas.capitalSpending),
      welfareInCap: fill(deltas.welfareInCap),
      macroPsnb: fill(deltas.macroPsnb),
      macroCurrent: fill(deltas.macroCurrent),
      primaryBorrowing: fill(primary),
      debtInterest: interestDelta,
      borrowing: borrowingDelta,
      currentBudget: currentBudgetDelta,
      extraDebt,
      gdpFactor,
      marginalRatePct,
    },
  };
}
