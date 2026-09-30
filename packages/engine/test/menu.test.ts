import { describe, expect, it } from 'vitest';
import {
  checkRawSourceConsistency,
  computeOutcome,
  excludesPartners,
  promiseBreaks,
} from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

/**
 * The Budget 2026 menu (ADR-0017, ADR-0019, ADR-0020): the ways the reporting says are on the
 * table, each built from a published row. Each lever's figures are held to their sources lever by
 * lever, and the arithmetic of each kind of costing is tested on made-up levers; what is left here
 * are the menu's own rules: which promise each way breaks, which designs count the same money,
 * which must agree with another, and what a card must say about its own arithmetic.
 */
const ds = loadDataset();
const extracted = loadExtracts();
const lever = (code: string) => {
  const found = ds.levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing lever ${code}`);
  return found;
};
const run = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const effectOf = (values: Record<string, number>, code: string, year: string) => {
  const e = run(values).leverEffects.find((x) => x.code === code);
  if (!e) throw new Error(`no effect for ${code}`);
  return { receipts: e.receipts[year] ?? 0, current: e.currentSpending[year] ?? 0 };
};
const promise = (values: Record<string, number>, id: string) =>
  promiseBreaks(values, ds.pm.promises, ds.levers).find((p) => p.promise.id === id);
const breaksNothing = (values: Record<string, number>) =>
  promiseBreaks(values, ds.pm.promises, ds.levers).every((p) => p.kept);
const partners = (code: string) =>
  excludesPartners(lever(code), ds.levers).map((p) => p.lever.code);

/** Every lever on offer: its badge, assumptions and considerations are held to rules elsewhere. */
const LIVE = ds.levers.filter((l) => !l.deprecated && l.category !== 'macro');

describe('the Budget 2026 menu', () => {
  it.each(LIVE.map((l) => [l.code, l] as const))(
    '%s reproduces from its published rows',
    (_code, l) => {
      expect(checkRawSourceConsistency(l, extracted, ds.vintage)).toEqual([]);
    },
  );

  it('breaks the tax lock where the manifesto’s words reach, and on a rise, not a cut', () => {
    // Class 4 up breaks it; down, to as little as the lever allows, breaks nothing (ADR-0035).
    expect(promise({ nic4: 0.5 }, 'tax-lock')?.kept).toBe(false);
    expect(breaksNothing({ nic4: lever('nic4').control.min })).toBe(true);
    for (const code of ['nicspa', 'nicuel', 'vat1z']) {
      expect(promise({ [code]: 1 }, 'tax-lock')?.kept, code).toBe(false);
    }
    for (const code of ['qelevy', 'carried', 'wealth2', 'ctgh', 'pslump', 'cta']) {
      expect(promise({ [code]: 1 }, 'tax-lock')?.kept, code).toBe(true);
    }
    // Neither the levy nor National Insurance on partnerships is a red line.
    for (const code of ['hscl', 'nicllp']) expect(breaksNothing({ [code]: 1 }), code).toBe(true);
    // A smoothed earnings link breaks the triple lock.
    expect(promise({ pensmth: 1 }, 'triple-lock')?.kept).toBe(false);
  });

  it('pairs the designs that count the same money, read from either side', () => {
    const pairs: [string, string][] = [
      // A charge on leavers cannot sit beside the death card.
      ['cgtexit', 'cgtdth'],
      // Two designs for one relief, and two for one tax on the same wealth: one or the other.
      ['pens20', 'pens30'],
      ['wealth', 'wealth2'],
      // The full rate above £50,270 and today's 2% there, a cut as much as a rise (Phase 26).
      ['nica', 'nicuel'],
      // A smoothed earnings link and prices-only uprating set the same pensions.
      ['pensmth', 'cpilock'],
    ];
    for (const [a, b] of pairs) {
      expect(partners(a), `${a} × ${b}`).toContain(b);
      expect(partners(b), `${b} × ${a}`).toContain(a);
    }
    // The overlapping designs warn each other.
    const warns = (code: string) =>
      (lever(code).interactions ?? []).filter((i) => i.severity === 'warn').map((i) => i.withLever);
    expect(warns('ctgh')).toContain(lever('hvcts15').id);
    expect(warns('sdltabol')).toContain(lever('sdlt5').id);
  });

  it('keeps designs that share HMRC’s rows in step with each other', () => {
    // The levy is 1.25 times the game's own National Insurance figures, point for point: the same
    // rows as the employer, employee main and employee additional sliders (Phase 25).
    for (const year of ['2027-28', '2028-29', '2029-30', '2030-31']) {
      const perPoint = ['nicer', 'nicm', 'nica'].reduce(
        (acc, code) => acc + effectOf({ [code]: 1 }, code, year).receipts,
        0,
      );
      expect(effectOf({ hscl: 1 }, 'hscl', year).receipts).toBeCloseTo(1.25 * perPoint, 6);
    }
    // The 50% rate is the additional-rate slider at +5p.
    expect(effectOf({ it50: 1 }, 'it50', '2029-30').receipts).toBeCloseTo(
      effectOf({ itar: 5 }, 'itar', '2029-30').receipts,
      6,
    );
  });

  it('keeps the state pension outside the welfare cap, and lets the gap from the triple lock compound', () => {
    const years = ['2027-28', '2028-29', '2029-30', '2030-31'];
    const saving = years.map((y) => -effectOf({ cpilock: 1 }, 'cpilock', y).current);
    for (let i = 1; i < saving.length; i += 1) {
      expect(saving[i] ?? 0).toBeGreaterThan(saving[i - 1] ?? 0);
    }
    const cap = (values: Record<string, number>) =>
      run(values).verdicts.find((v) => v.kind === 'welfareCap')?.status;
    expect(cap({ cpilock: 1 })).toBe(cap({}));
    expect(lever('pensmth').classification?.insideWelfareCap).toBe(false);
  });

  it('says on the card what its own arithmetic cannot vouch for (ADR-0017)', () => {
    // Ending the write-off at death is an upper bound by construction.
    expect(lever('cgtdth').headline).toMatch(/upper bound/);
    // The contested policies say so before they show a number.
    for (const code of ['wealth', 'wealth2']) {
      expect(lever(code).headline?.toLowerCase(), code).toContain('contested');
      expect(
        lever(code).considerations.some((c) => c.kind === 'legal' || c.kind === 'behavioural'),
        code,
      ).toBe(true);
    }
  });

  it('lets the employer threshold reach the £6,000 being floated (ADR-0017)', () => {
    expect(lever('nicst').control.max).toBe(1040);
    expect(lever('nicst').control.min).toBe(-1040);
  });

  it('a tampered figure in the alignment package fails the consistency check', () => {
    const align = structuredClone(lever('cgtalign'));
    if (
      align.costing.kind !== 'schedule' ||
      align.costing.rawSource?.kind !== 'derivedFromPublished'
    )
      throw new Error('alignment is derived');
    const method = align.costing.rawSource.method;
    if (method.name !== 'statedProduct') throw new Error('alignment is a stated product');
    const term = method.terms[0];
    if (!term) throw new Error('one term');
    term.value = 14300;
    expect(checkRawSourceConsistency(align, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('a tampered think-tank figure fails the consistency check', () => {
    const levy = structuredClone(lever('qelevy'));
    if (levy.costing.kind !== 'schedule' || levy.costing.rawSource?.kind !== 'derivedFromPublished')
      throw new Error('levy is derived');
    const method = levy.costing.rawSource.method;
    if (method.name !== 'statedProduct') throw new Error('levy is a stated product');
    const term = method.terms[0];
    if (!term) throw new Error('one term');
    term.value = 7000;
    expect(checkRawSourceConsistency(levy, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('a tampered Motability term fails the consistency check', () => {
    const mot = structuredClone(lever('vatmot'));
    if (mot.costing.kind !== 'schedule' || mot.costing.rawSource?.kind !== 'derivedFromPublished')
      throw new Error('Motability is derived');
    const method = mot.costing.rawSource.method;
    if (method.name !== 'weightedSum') throw new Error('Motability is a weighted sum');
    const term = method.terms[1];
    if (!term) throw new Error('two terms');
    term.factor = 1;
    expect(checkRawSourceConsistency(mot, extracted, ds.vintage).length).toBeGreaterThan(0);
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
  const byCode = new Map(POST.map((c) => [c, lever(c)] as const));

  it.each(POST.map((code) => [code, lever(code)] as const))(
    '%s still reproduces from its sources',
    (_code, l) => {
      expect(checkRawSourceConsistency(l, extracted, ds.vintage)).toEqual([]);
    },
  );

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
