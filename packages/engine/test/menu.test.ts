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
