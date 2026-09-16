import { isFiscalYear, nextFy, prevFy } from '../calc/years.js';
import type { Series, Vintage } from '../types/data.js';

// PSNFL is published to the nearest £1bn and PSNB to £0.1bn, so a year-on-year identity can be
// out by up to about £1.1bn from rounding alone.
const CHAIN_TOLERANCE_GBPM = 1200;
const PSNI_TOLERANCE_GBPM = 50;

function coverage(
  series: Series,
  years: readonly string[],
  label: string,
  problems: string[],
): void {
  for (const y of years) {
    if (series.values[y] === undefined) problems.push(`${label} is missing ${y}`);
  }
}

/** Consistency checks beyond the schema: year structure, coverage, accounting identities. */
export function validateVintage(v: Vintage): string[] {
  const problems: string[] = [];
  const { outturn, inYear, forecast } = v.years;
  for (const y of [...outturn, inYear, ...forecast]) {
    if (!isFiscalYear(y)) problems.push(`"${y}" is not a valid fiscal year`);
  }
  if (problems.length > 0) return problems;

  if (nextFy(outturn[outturn.length - 1] ?? '') !== inYear) {
    problems.push(
      `last outturn year ${outturn[outturn.length - 1]} must precede in-year ${inYear}`,
    );
  }
  if (forecast[0] !== nextFy(inYear)) problems.push(`first forecast year must follow ${inYear}`);
  for (let i = 1; i < forecast.length; i += 1) {
    if (forecast[i] !== nextFy(forecast[i - 1] ?? ''))
      problems.push(`forecast years must be consecutive at ${forecast[i]}`);
  }

  const policyYears = [inYear, ...forecast];
  const allYears = [...outturn, ...policyYears];
  const f = v.fiscal;
  coverage(v.economy.nominalGdpFy, allYears, 'economy.nominalGdpFy', problems);
  coverage(v.economy.nominalGdpCentred, allYears, 'economy.nominalGdpCentred', problems);
  coverage(f.psnb, allYears, 'fiscal.psnb', problems);
  coverage(f.psnfl, allYears, 'fiscal.psnfl', problems);
  coverage(f.currentBudgetDeficit, policyYears, 'fiscal.currentBudgetDeficit', problems);
  coverage(f.psni, policyYears, 'fiscal.psni', problems);
  coverage(f.psnflOtherFlows, policyYears, 'fiscal.psnflOtherFlows', problems);
  coverage(f.receipts, policyYears, 'fiscal.receipts', problems);
  coverage(f.tme, policyYears, 'fiscal.tme', problems);
  coverage(f.rdel, policyYears, 'fiscal.rdel', problems);
  coverage(f.cdel, policyYears, 'fiscal.cdel', problems);
  coverage(f.welfareInCap, policyYears, 'fiscal.welfareInCap', problems);
  coverage(f.debtInterestNetApf, policyYears, 'fiscal.debtInterestNetApf', problems);
  coverage(
    v.assumptions.marginalInterestRateOnNewBorrowingPct,
    policyYears,
    'assumptions.marginalInterestRate',
    problems,
  );

  const money: Array<[string, Series]> = [
    ['nominalGdpFy', v.economy.nominalGdpFy],
    ['nominalGdpCentred', v.economy.nominalGdpCentred],
    ['psnb', f.psnb],
    ['psnfl', f.psnfl],
    ['receipts', f.receipts],
    ['tme', f.tme],
    ['rdel', f.rdel],
    ['cdel', f.cdel],
    ['welfareInCap', f.welfareInCap],
    ['welfareTotal', f.welfareTotal],
    ['debtInterestNetApf', f.debtInterestNetApf],
    ['currentBudgetDeficit', f.currentBudgetDeficit],
    ['psni', f.psni],
    ['psnflOtherFlows', f.psnflOtherFlows],
  ];
  for (const [label, s] of money) {
    if (s.unit !== 'GBPm') problems.push(`${label} must be in GBPm, got ${s.unit}`);
    if (s.periodicity !== 'FY') problems.push(`${label} must be a fiscal-year series`);
  }
  if (problems.length > 0) return problems;

  for (const y of policyYears) {
    const psnb = f.psnb.values[y] ?? 0;
    const cbd = f.currentBudgetDeficit.values[y] ?? 0;
    const psni = f.psni.values[y] ?? 0;
    if (Math.abs(psnb - cbd - psni) > PSNI_TOLERANCE_GBPM) {
      problems.push(
        `identity PSNI = PSNB − current budget deficit fails in ${y} by ${(psnb - cbd - psni).toFixed(0)}`,
      );
    }
    const prev = prevFy(y);
    const psnflPrev = f.psnfl.values[prev];
    const psnflNow = f.psnfl.values[y];
    if (psnflPrev !== undefined && psnflNow !== undefined) {
      const gap = psnflNow - psnflPrev - psnb - (f.psnflOtherFlows.values[y] ?? 0);
      if (Math.abs(gap) > CHAIN_TOLERANCE_GBPM) {
        problems.push(`PSNFL chain fails in ${y}: change − PSNB − other flows = ${gap.toFixed(0)}`);
      }
    }
    const receipts = f.receipts.values[y] ?? 0;
    const tme = f.tme.values[y] ?? 0;
    if (Math.abs(tme - receipts - psnb) > 1500) {
      problems.push(
        `identity TME − receipts = PSNB fails in ${y} by ${(tme - receipts - psnb).toFixed(0)}`,
      );
    }
    const gdpFy = v.economy.nominalGdpFy.values[y] ?? 0;
    const gdpCentred = v.economy.nominalGdpCentred.values[y] ?? 0;
    if (gdpCentred <= gdpFy) problems.push(`centred GDP should exceed financial-year GDP in ${y}`);
  }

  const sensIds = new Set<string>();
  for (const s of v.sensitivities) {
    if (sensIds.has(s.id)) problems.push(`duplicate sensitivity id ${s.id}`);
    sensIds.add(s.id);
    for (const y of Object.keys(s.effectOnPsnbGbpm)) {
      if (!allYears.includes(y))
        problems.push(`sensitivity ${s.id} has effect for ${y}, outside the vintage`);
    }
    // A slider has to move borrowing one way, or "which of these settings is the gloomier" has no
    // answer and the assumption scenarios cannot be derived.
    const signs = new Set(
      Object.values(s.effectOnPsnbGbpm)
        .filter((v) => v !== 0)
        .map((v) => Math.sign(v)),
    );
    if (signs.size > 1) {
      problems.push(`sensitivity ${s.id} changes sign across years, so it has no direction`);
    }
  }
  return problems;
}
