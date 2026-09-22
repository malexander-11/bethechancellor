import { describe, expect, it } from 'vitest';
import {
  computeOutcome,
  delayOptions,
  narrowedValue,
  nextNotch,
  revenueSuggestions,
  spendingMeasures,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const lever = (code: string) => {
  const l = ds.levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};
const run = (values: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values, implementationYear: '2027-28' },
  });
const headroomOf = (values: Record<string, number>) =>
  run(values).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;

describe('the routes out of a gap', () => {
  it('moves a lever one notch on its own grid, and stops at the end of it', () => {
    expect(nextNotch(lever('itbr'), 0)).toBe(1);
    expect(nextNotch(lever('nicm'), 0)).toBe(0.5);
    expect(nextNotch(lever('itbr'), lever('itbr').control.max)).toBeNull();
    expect(nextNotch(lever('ufsm'), 0)).toBe(1);
    expect(nextNotch(lever('ufsm'), 1)).toBeNull();
    // A select moves to the next option above, not by its step.
    const iht = lever('iht');
    const options = Object.keys(iht.control.labels ?? {})
      .map(Number)
      .sort((a, b) => a - b);
    expect(nextNotch(iht, 0)).toBe(options.find((v) => v > 0));
  });

  it('ranks the Director of Tax’s suggestions by yield and names the promise each breaks', () => {
    const out = revenueSuggestions(ds.levers, {}, ds.pm.promises, headroomOf, 5);
    expect(out).toHaveLength(5);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i - 1]!.yieldGbpm).toBeGreaterThanOrEqual(out[i]!.yieldGbpm);
    }
    for (const s of out) {
      expect(s.lever.category).toBe('tax');
      expect(s.yieldGbpm).toBeGreaterThan(0);
    }
    const all = revenueSuggestions(ds.levers, {}, ds.pm.promises, headroomOf, 100);
    // Our own arithmetic is in the list too, badged as such, beside the certified rows.
    expect(all.some((s) => s.lever.badge === 'assumption')).toBe(true);
    expect(all.some((s) => s.lever.code === 'cgtdth')).toBe(true);
    expect(all.some((s) => s.lever.code === 'pens30')).toBe(true);
    expect(all.find((s) => s.lever.code === 'iinc2')?.yieldGbpm ?? 0).toBeGreaterThan(2000);
    // What costs money never appears, whichever folder it is in; nor does a spending saving,
    // which is a cut for the spending route, not revenue.
    expect(all.some((s) => s.lever.code === 'ufsm' || s.lever.code === 'rvinv')).toBe(false);
    expect(all.some((s) => s.lever.code === 'rv2ch' || s.lever.code === 'cpilock')).toBe(false);
    // Nor an option nobody proposes: the relief toggles are on the desk to teach, not to advise.
    expect(all.some((s) => s.lever.notOnTheTable !== undefined)).toBe(false);
    expect(all.some((s) => s.lever.code === 'vatfood' || s.lever.code === 'cgtprr')).toBe(false);
    const basic = all.find((s) => s.lever.code === 'itbr');
    expect(basic?.breaks.map((p) => p.id)).toEqual(['tax-lock']);
    const ct = all.find((s) => s.lever.code === 'ct');
    expect(ct?.breaks.map((p) => p.id)).toEqual(['ct-cap']);
    // A promise already broken by choice is not counted against the next notch.
    const again = revenueSuggestions(ds.levers, { itbr: 1 }, ds.pm.promises, headroomOf, 100);
    expect(again.find((s) => s.lever.code === 'itbr')?.breaks).toEqual([]);
  });

  it('lists the package’s spending measures biggest first, and only what costs money', () => {
    const outcome = run({ dhsc: 3, ufsm: 1, itbr: 1, rv2ch: 1 });
    const rows = spendingMeasures(ds.levers, outcome, '2029-30');
    expect(rows.map((r) => r.lever.code)).toEqual(['dhsc', 'ufsm']);
    expect(rows[0]!.costGbpm).toBeGreaterThan(rows[1]!.costGbpm);
  });

  it('offers only later start years inside the forecast', () => {
    const years = ['2027-28', '2028-29', '2029-30', '2030-31'];
    expect(delayOptions(years, '2027-28')).toEqual(['2028-29', '2029-30', '2030-31']);
    expect(delayOptions(years, '2029-30')).toEqual(['2030-31']);
    expect(delayOptions(years, '2030-31')).toEqual([]);
  });

  it('narrows a flagship to half the distance on the lever’s grid, or says it cannot', () => {
    expect(narrowedValue(lever('dhsc'), 3)).toBe(1.5);
    expect(narrowedValue(lever('moj'), 10)).toBe(5);
    expect(narrowedValue(lever('fuel'), -10)).toBe(-5);
    expect(narrowedValue(lever('ufsm'), 1)).toBeNull();
    expect(narrowedValue(lever('dfe'), 0.5)).toBeNull();
  });
});
