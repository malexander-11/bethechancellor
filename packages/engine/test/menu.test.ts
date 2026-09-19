import { describe, expect, it } from 'vitest';
import {
  checkRawSourceConsistency,
  computeOutcome,
  headSeries,
  promiseBreaks,
} from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing lever ${code}`);
  return found;
};
const run = (
  leverValues: Record<string, number>,
  extra: { implementationYear?: string; debtInterestFeedback?: boolean } = {},
) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, ...extra },
  });
const effectOf = (values: Record<string, number>, code: string, year: string) => {
  const e = run(values).leverEffects.find((x) => x.code === code);
  if (!e) throw new Error(`no effect for ${code}`);
  return {
    receipts: e.receipts[year] ?? 0,
    current: e.currentSpending[year] ?? 0,
    capital: e.capitalSpending[year] ?? 0,
    financial: e.financialTransactions[year] ?? 0,
  };
};
const gdp = (year: string) => ds.vintage.economy.nominalGdpFy.values[year] ?? Number.NaN;

/** The ways the Budget 2026 reporting says are on the table, each built from a published row. */
const MENU = {
  direct: ['nic4', 'rvapr', 'rvplan2'],
  assumption: ['bank5', 'cgtdth', 'def3', 'epl2', 'hmrc2', 'hvcts15', 'vatgas'],
  mechanical: ['brates'],
};
const ALL = [...MENU.direct, ...MENU.assumption, ...MENU.mechanical];

describe('the Budget 2026 menu', () => {
  it('is all present, reviewed, and badged for what it is', () => {
    for (const code of ALL) {
      const l = lever(code);
      expect(l.status, code).toBe('reviewed');
      expect(l.deprecated, code).toBeFalsy();
      expect(l.headline && l.description.length > l.headline.length, code).toBe(true);
      expect(l.considerations.length, code).toBeGreaterThan(0);
      expect(
        l.considerations.every((c) => c.sources.length > 0),
        code,
      ).toBe(true);
    }
    for (const code of MENU.direct) expect(lever(code).badge, code).toBe('direct');
    for (const code of MENU.mechanical) expect(lever(code).badge, code).toBe('mechanical');
    for (const code of MENU.assumption) {
      const l = lever(code);
      expect(l.badge, code).toBe('assumption');
      // Our own arithmetic names its assumption on the card.
      if (l.costing.kind === 'schedule' || l.costing.kind === 'linearPerUnit') {
        expect(l.costing.caveats.length, code).toBeGreaterThan(0);
      } else {
        throw new Error(`${code}: unexpected costing ${l.costing.kind}`);
      }
    }
  });

  it.each(ALL.map((code) => [code, lever(code)] as const))(
    '%s reproduces from its published rows',
    (_code, l) => {
      expect(checkRawSourceConsistency(l, extracted, ds.vintage)).toEqual([]);
    },
  );

  it('ending the CGT write-off at death carries the Resolution Foundation figure with CGT receipts', () => {
    const cgt = headSeries(ds.vintage, 'receiptsByTax.capitalGainsTax');
    expect(effectOf({ cgtdth: 1 }, 'cgtdth', '2029-30').receipts).toBe(4000);
    const y2027 = (4000 * (cgt['2027-28'] ?? 0)) / (cgt['2029-30'] ?? 1);
    // Authored to the nearest £ million; the validator allows the same half a million.
    expect(
      Math.abs(effectOf({ cgtdth: 1 }, 'cgtdth', '2027-28').receipts - y2027),
    ).toBeLessThanOrEqual(0.5);
    expect(effectOf({ cgtdth: 1 }, 'cgtdth', '2030-31').receipts).toBeGreaterThan(4000);
    expect(lever('cgtdth').headline).toMatch(/upper bound/);
    expect(lever('cgtdth').considerations.some((c) => c.id === 'death-uplift-forestalling')).toBe(
      true,
    );
  });

  it('a £1.5m surcharge band repeats the £2m band, set-up costs included', () => {
    expect(effectOf({ hvcts15: 1 }, 'hvcts15', '2027-28').receipts).toBe(-155);
    expect(effectOf({ hvcts15: 1 }, 'hvcts15', '2028-29').receipts).toBe(400);
    expect(effectOf({ hvcts15: 1 }, 'hvcts15', '2029-30').receipts).toBe(430);
    expect(effectOf({ hvcts15: 1 }, 'hvcts15', '2026-27').receipts).toBe(0);
  });

  it('reversing the farm and business relief reform costs the Treasury line, grown with IHT', () => {
    const iht = headSeries(ds.vintage, 'receiptsByTax.inheritanceTax');
    expect(effectOf({ rvapr: 1 }, 'rvapr', '2027-28').receipts).toBeCloseTo(-495, 6);
    expect(effectOf({ rvapr: 1 }, 'rvapr', '2029-30').receipts).toBeCloseTo(-520, 6);
    expect(effectOf({ rvapr: 1 }, 'rvapr', '2030-31').receipts).toBeCloseTo(
      (-520 * (iht['2030-31'] ?? 0)) / (iht['2029-30'] ?? 1),
      6,
    );
  });

  it('two points on the bank surcharge is two thirds of HMRC’s receipts, grown with corporation tax', () => {
    const ct = headSeries(ds.vintage, 'onshoreCorporationTax');
    const base = 1000 * (2 / 3);
    const want = (base * (ct['2029-30'] ?? 0)) / (ct['2024-25'] ?? 1);
    expect(effectOf({ bank5: 1 }, 'bank5', '2029-30').receipts).toBeCloseTo(want, -1);
    expect(effectOf({ bank5: 1 }, 'bank5', '2029-30').receipts).toBeGreaterThan(800);
    expect(effectOf({ bank5: 1 }, 'bank5', '2029-30').receipts).toBeLessThan(950);
  });

  it('repeating the energy profits levy package is plus the 2024 lines, then flat in cash', () => {
    expect(effectOf({ epl2: 1 }, 'epl2', '2027-28').receipts).toBeCloseTo(50, 6);
    expect(effectOf({ epl2: 1 }, 'epl2', '2028-29').receipts).toBeCloseTo(410, 6);
    expect(effectOf({ epl2: 1 }, 'epl2', '2029-30').receipts).toBeCloseTo(955, 6);
    expect(effectOf({ epl2: 1 }, 'epl2', '2030-31').receipts).toBeCloseTo(955, 6);
  });

  it('a point on Class 4 reproduces HMRC’s row and breaks the tax lock', () => {
    const early = run({ nic4: 1 }, { implementationYear: '2026-27' }).leverEffects.find(
      (e) => e.code === 'nic4',
    );
    expect(early?.receipts['2026-27']).toBeCloseTo(440, 6);
    expect(early?.receipts['2027-28']).toBeCloseTo(525, 6);
    expect(early?.receipts['2028-29']).toBeCloseTo(445, 6);
    const half = effectOf({ nic4: 0.5 }, 'nic4', '2029-30').receipts;
    const whole = effectOf({ nic4: 1 }, 'nic4', '2029-30').receipts;
    expect(half).toBeCloseTo(whole / 2, 6);
    const lock = promiseBreaks({ nic4: 0.5 }, ds.pm.promises, ds.levers).find(
      (p) => p.promise.id === 'tax-lock',
    );
    expect(lock?.kept).toBe(false);
    expect(lever('nic4').control.min).toBe(0);
    expect(lever('nic4').control.level?.baseline).toBe(6);
  });

  it('VAT off gas is a third of HMRC’s relief less the electricity already cut, grown with VAT', () => {
    const vat = headSeries(ds.vintage, 'vat');
    const base = -7000 / 3 + 2 * 850;
    const want = (base * (vat['2029-30'] ?? 0)) / (vat['2025-26'] ?? 1);
    const got = effectOf({ vatgas: 1 }, 'vatgas', '2029-30').receipts;
    expect(got).toBeLessThan(0);
    expect(got).toBeCloseTo(want, -1);
    expect(effectOf({ vatgas: 1 }, 'vatgas', '2026-27').receipts).toBe(0);
  });

  it('unfreezing the Plan 2 threshold is spending from 2027-28, and the 2026-27 revaluation is not applied', () => {
    expect(effectOf({ rvplan2: 1 }, 'rvplan2', '2026-27').current).toBe(0);
    expect(effectOf({ rvplan2: 1 }, 'rvplan2', '2027-28').current).toBe(255);
    expect(effectOf({ rvplan2: 1 }, 'rvplan2', '2029-30').current).toBe(355);
    expect(effectOf({ rvplan2: 1 }, 'rvplan2', '2029-30').receipts).toBe(0);
    expect(ds.ministers.ministers.some((m) => m.code === 'rvplan2')).toBe(true);
  });

  it('another compliance package repeats Budget 2025’s line', () => {
    expect(effectOf({ hmrc2: 1 }, 'hmrc2', '2027-28').receipts).toBe(695);
    expect(effectOf({ hmrc2: 1 }, 'hmrc2', '2029-30').receipts).toBe(2415);
    expect(ds.incidence.levers['hmrc2']).toBe('tax-gap');
  });

  it('defence at 3% from 2027 costs the gap to the OBR path, and nothing once the path arrives', () => {
    const e29 = effectOf({ def3: 1 }, 'def3', '2029-30');
    expect(e29.current + e29.capital).toBeCloseTo(((3 - 2.88) / 100) * gdp('2029-30'), 0);
    expect(e29.capital / (e29.current + e29.capital)).toBeCloseTo(0.43, 6);
    const e27 = effectOf({ def3: 1 }, 'def3', '2027-28');
    expect(e27.current + e27.capital).toBeCloseTo(((3 - 2.64) / 100) * gdp('2027-28'), 0);
    const e30 = effectOf({ def3: 1 }, 'def3', '2030-31');
    expect(e30.current + e30.capital).toBe(0);
    expect(ds.ministers.ministers.some((m) => m.code === 'def3')).toBe(true);
  });

  it('the employer threshold now reaches the £6,000 being floated', () => {
    expect(lever('nicst').control.max).toBe(1040);
    expect(lever('nicst').control.min).toBe(-1040);
  });

  it('a tampered figure fails the consistency check, whichever method backs it', () => {
    const fails = (l: ReturnType<typeof lever>) =>
      expect(checkRawSourceConsistency(l, extracted, ds.vintage).length).toBeGreaterThan(0);
    const cgt = structuredClone(lever('cgtdth'));
    if (cgt.costing.kind === 'schedule') cgt.costing.effect['2029-30'] = 4500;
    fails(cgt);
    const gas = structuredClone(lever('vatgas'));
    if (gas.costing.kind === 'schedule' && gas.costing.rawSource?.kind === 'derivedFromPublished') {
      const m = gas.costing.rawSource.method;
      if (m.name === 'weightedSum' && m.terms[0]) m.terms[0].factor = -0.5;
    }
    fails(gas);
    const bank = structuredClone(lever('bank5'));
    if (
      bank.costing.kind === 'schedule' &&
      bank.costing.rawSource?.kind === 'derivedFromPublished'
    ) {
      const m = bank.costing.rawSource.method;
      if (m.name === 'statedProduct' && m.terms[0]) m.terms[0].value = 1500;
    }
    fails(bank);
    const epl = structuredClone(lever('epl2'));
    if (epl.costing.kind === 'linearPerUnit' && epl.costing.rawSource?.kind === 'hmtScorecard') {
      epl.costing.rawSource.direction = 'reverse';
    }
    fails(epl);
    const nic = structuredClone(lever('nic4'));
    if (nic.costing.kind === 'linearPerUnit') nic.costing.perUnit['2027-28'] = 600;
    fails(nic);
    const surcharge = structuredClone(lever('hvcts15'));
    if (surcharge.costing.kind === 'schedule') surcharge.costing.effect['2028-29'] = -400;
    fails(surcharge);
    const plan = structuredClone(lever('rvplan2'));
    if (plan.costing.kind === 'schedule') plan.costing.effect['2029-30'] = -355;
    fails(plan);
    const def = structuredClone(lever('def3'));
    if (def.costing.kind === 'schedule') def.costing.effect['2029-30'] = 5000;
    fails(def);
  });
});

/**
 * The policies that came in the post (ADR-0008). The letters' screen has gone: the eleven a
 * Chancellor might weigh sit on the two screens by side, and five are kept for the record on no
 * screen at all. Codes and costings are unchanged, so old links still open (ADR-0017).
 */
describe('the policies that came in the post', () => {
  const POST = [
    'it50',
    'cpilock',
    'def5',
    'dip47',
    'aid07',
    'airet',
    'ufsm',
    'bus2',
    'freeuni',
    'water',
    'socrent',
    'wealth',
    'nonuk',
    'pens30',
    'iinc2',
    'gam2',
  ];
  const SHELVED = ['def5', 'aid07', 'freeuni', 'water', 'nonuk'];
  const REHOMED = POST.filter((c) => !SHELVED.includes(c));
  const byCode = new Map(POST.map((c) => [c, lever(c)] as const));

  it('are all still in the data, all toggles, and none in a folder of their own', () => {
    for (const code of POST) {
      const l = lever(code);
      expect(l.control.kind, code).toBe('toggle');
      expect(['tax', 'spend', 'welfare'], code).toContain(l.category);
      expect(l.group, code).not.toBe('Recommendations from Parliament');
      expect(l.headline && l.description.length > l.headline.length, code).toBe(true);
      expect(l.status, code).toBe('reviewed');
    }
    for (const code of SHELVED) {
      const l = lever(code);
      expect(l.deprecated, code).toBe(true);
      expect(l.group, code).toBe('Shelved');
      expect(l.headline, code).toMatch(/Kept for the record/);
    }
    for (const code of REHOMED) {
      const l = lever(code);
      expect(l.deprecated, code).toBeFalsy();
      expect(l.group, code).not.toBe('Shelved');
    }
    // Only the 50% rate reuses an official costing; everything else is our own arithmetic.
    expect(POST.filter((c) => lever(c).badge === 'direct')).toEqual(['it50']);
    // Every re-homed spending policy has a minister to speak for it.
    const spoken = new Set(ds.ministers.ministers.map((m) => m.code));
    for (const code of REHOMED) {
      const l = lever(code);
      if (l.category !== 'tax') expect(spoken.has(code), code).toBe(true);
    }
  });

  it.each(POST.map((code) => [code, lever(code)] as const))(
    '%s still reproduces from its sources',
    (_code, l) => {
      expect(checkRawSourceConsistency(l, extracted, ds.vintage)).toEqual([]);
    },
  );

  it('every one states its assumptions and cites a source for each', () => {
    for (const code of POST) {
      const l = lever(code);
      expect(l.costing.kind === 'schedule' || l.costing.kind === 'linearPerUnit').toBe(true);
      if (l.costing.kind === 'schedule' || l.costing.kind === 'linearPerUnit') {
        expect(l.costing.caveats.length).toBeGreaterThan(0);
      }
      expect(l.considerations.length).toBeGreaterThan(0);
      expect(l.considerations.every((c) => c.sources.length > 0)).toBe(true);
    }
  });

  it('defence at 5% of GDP is the gap to the forecast share times nominal GDP', () => {
    const expected = ((5 - 2.88) / 100) * gdp('2029-30');
    const e = effectOf({ def5: 1 }, 'def5', '2029-30');
    expect(e.current + e.capital).toBeCloseTo(expected, 0);
    expect(e.capital / (e.current + e.capital)).toBeCloseTo(0.43, 6);
  });

  it('aid at 0.7% of national income is 0.4% of GDP, and starts when the 0.3% plan bites', () => {
    expect(effectOf({ aid07: 1 }, 'aid07', '2029-30').current).toBeCloseTo(
      (0.4 / 100) * gdp('2029-30'),
      0,
    );
    expect(effectOf({ aid07: 1 }, 'aid07', '2026-27').current).toBe(0);
  });

  it('the 50% rate equals the additional-rate slider at +5p', () => {
    const viaToggle = run({ it50: 1 }).leverEffects.find((e) => e.code === 'it50');
    const viaSlider = run({ itar: 5 }).leverEffects.find((e) => e.code === 'itar');
    expect(viaToggle?.receipts['2029-30']).toBeCloseTo(viaSlider?.receipts['2029-30'] ?? 0, 6);
  });

  it('replacing the triple lock with CPI saves more every year as the gap compounds', () => {
    const years = ['2027-28', '2028-29', '2029-30', '2030-31'];
    const saving = years.map((y) => -effectOf({ cpilock: 1 }, 'cpilock', y).current);
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
    const e = effectOf({ water: 1 }, 'water', '2027-28');
    expect(e.financial).toBe(100000);
    expect(e.current + e.capital).toBe(0);
    // A one-off: nothing in the years after the purchase.
    expect(effectOf({ water: 1 }, 'water', '2028-29').financial).toBe(0);
    const year = '2029-30';
    const borrowing =
      (outcome.paths.policy.psnb[year] ?? 0) - (outcome.paths.baseline.psnb[year] ?? 0);
    expect(outcome.paths.deltas.financialTransactions['2027-28'] ?? 0).toBe(100000);
    // Only the interest on the money borrowed reaches the deficit: a few billion, not a hundred.
    expect(borrowing).toBeGreaterThan(3000);
    expect(borrowing).toBeLessThan(8000);
  });

  it('free tuition moves the current budget much more than it moves investment', () => {
    const e = effectOf({ freeuni: 1 }, 'freeuni', '2029-30');
    expect(e.current).toBeCloseTo(8405, 0);
    expect(e.capital).toBe(0);
    // A third of the fee-loan outlay already scores as spending, so the change is not the headline.
    expect(e.current).toBeLessThan(12360);
  });

  it('social rent is capital, so it leaves the stability rule alone', () => {
    const e = effectOf({ socrent: 1 }, 'socrent', '2029-30');
    expect(e.capital).toBeCloseTo(3900, 6);
    expect(e.current).toBe(0);
    const base = run({});
    const withIt = run({ socrent: 1 });
    const cb = (o: typeof base) =>
      o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
    // Capital spending only reaches the current budget through the interest it accrues.
    expect(cb(base) - cb(withIt)).toBeLessThan(1500);
  });

  it('the two contested policies say so before they show a number', () => {
    const wealth = byCode.get('wealth');
    expect(wealth?.headline?.toLowerCase()).toContain('contested');
    expect(wealth?.considerations.some((c) => c.kind === 'legal' || c.kind === 'behavioural')).toBe(
      true,
    );
    expect(wealth?.costing.kind === 'schedule').toBe(true);
    expect(effectOf({ wealth: 1 }, 'wealth', '2029-30').receipts).toBeCloseTo(7768, 0);
    // Shelved, but the arithmetic is kept so the record can be checked.
    expect(effectOf({ nonuk: 1 }, 'nonuk', '2029-30').current).toBeCloseTo(-14285, 0);
  });

  it('adopting everything expensive misses the stability rule', () => {
    const outcome = run({ def5: 1, freeuni: 1, ufsm: 1, socrent: 1, airet: 1 });
    expect(outcome.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('notMet');
  });

  it('detects a tampered figure in the policies that came in the post', () => {
    const def = structuredClone(byCode.get('def5'));
    if (!def || def.costing.kind !== 'schedule') throw new Error('missing def5');
    def.costing.effect['2029-30'] = 74000;
    expect(checkRawSourceConsistency(def, extracted, ds.vintage).length).toBeGreaterThan(0);
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
