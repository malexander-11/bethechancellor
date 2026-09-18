import { describe, expect, it } from 'vitest';
import { checkRawSourceConsistency, computeOutcome } from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();
const campaign = ds.levers.filter((l) => l.category === 'campaign');
const byCode = new Map(campaign.map((l) => [l.code, l] as const));
const run = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const effectOf = (code: string, year: string) => {
  const outcome = run({ [code]: 1 });
  const e = outcome.leverEffects.find((x) => x.code === code);
  if (!e) throw new Error(`no effect for ${code}`);
  return {
    receipts: e.receipts[year] ?? 0,
    current: e.currentSpending[year] ?? 0,
    capital: e.capitalSpending[year] ?? 0,
    financial: e.financialTransactions[year] ?? 0,
    borrowing:
      (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0) - (e.receipts[year] ?? 0),
  };
};

describe('the policies your colleagues and the PM put on the desk', () => {
  it('are all present, all toggles and all badged honestly', () => {
    expect(campaign.length).toBe(16);
    expect(campaign.every((l) => l.control.kind === 'toggle')).toBe(true);
    expect(campaign.every((l) => l.group === 'Recommendations from Parliament')).toBe(true);
    expect(campaign.every((l) => l.headline && l.description.length > l.headline.length)).toBe(
      true,
    );
    // Only the 50% rate reuses an official costing; everything else is our own arithmetic.
    expect(campaign.filter((l) => l.badge === 'direct').map((l) => l.code)).toEqual(['it50']);
  });

  it.each(campaign.map((l) => [l.id, l] as const))(
    '%s reproduces from its sources',
    (_id, lever) => {
      expect(checkRawSourceConsistency(lever, extracted, ds.vintage)).toEqual([]);
    },
  );

  it('every one states its assumptions and cites a source for each', () => {
    for (const lever of campaign) {
      expect(lever.costing.kind === 'schedule' || lever.costing.kind === 'linearPerUnit').toBe(
        true,
      );
      if (lever.costing.kind === 'schedule' || lever.costing.kind === 'linearPerUnit') {
        expect(lever.costing.caveats.length).toBeGreaterThan(0);
      }
      expect(lever.considerations.length).toBeGreaterThan(0);
      expect(lever.considerations.every((c) => c.sources.length > 0)).toBe(true);
    }
  });

  it('defence at 5% of GDP is the gap to the forecast share times nominal GDP', () => {
    const gdp = ds.vintage.economy.nominalGdpFy.values['2029-30'] ?? 0;
    const expected = ((5 - 2.88) / 100) * gdp;
    const e = effectOf('def5', '2029-30');
    expect(e.current + e.capital).toBeCloseTo(expected, 0);
    // The Spending Review's own settlement is 43% capital, and capital escapes the stability rule.
    expect(e.capital / (e.current + e.capital)).toBeCloseTo(0.43, 6);
  });

  it('aid at 0.7% of national income is 0.4% of GDP, and starts when the 0.3% plan bites', () => {
    const gdp = ds.vintage.economy.nominalGdpFy.values['2029-30'] ?? 0;
    expect(effectOf('aid07', '2029-30').current).toBeCloseTo((0.4 / 100) * gdp, 0);
    expect(effectOf('aid07', '2026-27').current).toBe(0);
  });

  it('the 50% rate equals the additional-rate slider at +5p', () => {
    const viaCampaign = run({ it50: 1 }).leverEffects.find((e) => e.code === 'it50');
    const viaSlider = run({ itar: 5 }).leverEffects.find((e) => e.code === 'itar');
    expect(viaCampaign?.receipts['2029-30']).toBeCloseTo(viaSlider?.receipts['2029-30'] ?? 0, 6);
  });

  it('replacing the triple lock with CPI saves more every year as the gap compounds', () => {
    const years = ['2027-28', '2028-29', '2029-30', '2030-31'];
    const saving = years.map((y) => -effectOf('cpilock', y).current);
    expect(saving[0]).toBeCloseTo(930, 0);
    expect(saving[2]).toBeCloseTo(2674, 0);
    for (let i = 1; i < saving.length; i += 1)
      expect(saving[i] ?? 0).toBeGreaterThan(saving[i - 1] ?? 0);
    // The state pension is outside the welfare cap, so the cap verdict must not move.
    const base = run({});
    const withIt = run({ cpilock: 1 });
    expect(withIt.verdicts.find((v) => v.kind === 'welfareCap')?.status).toBe(
      base.verdicts.find((v) => v.kind === 'welfareCap')?.status,
    );
  });

  it('buying the water companies moves debt far more than it moves borrowing', () => {
    const outcome = run({ water: 1 });
    const e = effectOf('water', '2027-28');
    expect(e.financial).toBe(100000);
    expect(e.current + e.capital).toBe(0);
    // A one-off: nothing in the years after the purchase.
    expect(effectOf('water', '2028-29').financial).toBe(0);
    const year = '2029-30';
    const borrowing =
      (outcome.paths.policy.psnb[year] ?? 0) - (outcome.paths.baseline.psnb[year] ?? 0);
    const cash = outcome.paths.deltas.financialTransactions['2027-28'] ?? 0;
    expect(cash).toBe(100000);
    // Only the interest on the money borrowed reaches the deficit: a few billion, not a hundred.
    expect(borrowing).toBeGreaterThan(3000);
    expect(borrowing).toBeLessThan(8000);
  });

  it('free tuition moves the current budget much more than it moves investment', () => {
    const e = effectOf('freeuni', '2029-30');
    expect(e.current).toBeCloseTo(8405, 0);
    expect(e.capital).toBe(0);
    // A third of the fee-loan outlay already scores as spending, so the change is not the headline.
    expect(e.current).toBeLessThan(12360);
  });

  it('social rent is capital, so it leaves the stability rule alone', () => {
    const e = effectOf('socrent', '2029-30');
    expect(e.capital).toBeCloseTo(3900, 6);
    expect(e.current).toBe(0);
    const base = run({});
    const withIt = run({ socrent: 1, ...{} });
    const cb = (o: typeof base) =>
      o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
    // Capital spending only reaches the current budget through the interest it accrues.
    expect(cb(base) - cb(withIt)).toBeLessThan(1500);
  });

  it('the two contested policies say so before they show a number', () => {
    for (const code of ['wealth', 'nonuk']) {
      const lever = byCode.get(code);
      expect(lever?.headline?.toLowerCase()).toContain('contested');
      expect(
        lever?.considerations.some((c) => c.kind === 'legal' || c.kind === 'behavioural'),
      ).toBe(true);
    }
    expect(byCode.get('wealth')?.costing.kind === 'schedule').toBe(true);
    expect(effectOf('wealth', '2029-30').receipts).toBeCloseTo(7768, 0);
    expect(effectOf('nonuk', '2029-30').current).toBeCloseTo(-14285, 0);
  });

  it('adopting everything expensive misses the stability rule', () => {
    const outcome = run({ def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 });
    expect(outcome.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('notMet');
  });

  it('detects a tampered campaign figure', () => {
    const lever = structuredClone(byCode.get('def5'));
    if (!lever || lever.costing.kind !== 'schedule') throw new Error('missing def5');
    lever.costing.effect['2029-30'] = 74000;
    expect(checkRawSourceConsistency(lever, extracted, ds.vintage).length).toBeGreaterThan(0);
    const pension = structuredClone(byCode.get('cpilock'));
    if (!pension || pension.costing.kind !== 'schedule') throw new Error('missing cpilock');
    pension.costing.effect['2029-30'] = -5000;
    expect(checkRawSourceConsistency(pension, extracted, ds.vintage).length).toBeGreaterThan(0);
    const tuition = structuredClone(byCode.get('freeuni'));
    if (
      !tuition ||
      tuition.costing.kind !== 'schedule' ||
      tuition.costing.rawSource?.kind !== 'derivedFromPublished' ||
      tuition.costing.rawSource.method.name !== 'seriesProduct'
    )
      throw new Error('missing freeuni');
    const term = tuition.costing.rawSource.method.terms[0];
    if (term) term.values['2029-30'] = 20000;
    expect(checkRawSourceConsistency(tuition, extracted, ds.vintage).length).toBeGreaterThan(0);
  });
});
