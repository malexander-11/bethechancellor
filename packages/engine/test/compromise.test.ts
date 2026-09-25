import { describe, expect, it } from 'vitest';
import {
  affordSuggestions,
  computeOutcome,
  delayOptions,
  narrowedBundle,
  narrowedValue,
  nextNotch,
  spendingMeasures,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const afford = ds.options?.afford ?? [];
const deliver = ds.options?.deliver ?? [];
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
    expect(afford.length).toBeGreaterThan(20);
    const out = affordSuggestions(afford, ds.levers, {}, ds.pm.promises, headroomOf, 5);
    expect(out).toHaveLength(5);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i - 1]!.yieldGbpm).toBeGreaterThanOrEqual(out[i]!.yieldGbpm);
    }
    for (const s of out) {
      expect(s.lever.category).toBe('tax');
      expect(s.yieldGbpm).toBeGreaterThan(0);
    }
    const all = affordSuggestions(afford, ds.levers, {}, ds.pm.promises, headroomOf, 100);
    // Our own arithmetic is in the list too, badged as such, beside the certified rows.
    expect(all.some((s) => s.lever.badge === 'assumption')).toBe(true);
    expect(all.some((s) => s.option.id === 'cgtdth')).toBe(true);
    expect(all.some((s) => s.option.id === 'pens30')).toBe(true);
    expect(all.find((s) => s.option.id === 'iinc2')?.yieldGbpm ?? 0).toBeGreaterThan(2000);
    // A tax that cannot start before the target year buys no headroom there (ADR-0021), so the
    // Director does not suggest it; it is on the ways to afford, priced honestly.
    expect(afford.some((o) => o.id === 'wealth2')).toBe(true);
    expect(all.some((s) => s.option.id === 'wealth2')).toBe(false);
    const basic = all.find((s) => s.option.id === 'itbr');
    expect(basic?.breaks.map((p) => p.id)).toEqual(['tax-lock']);
    const ct = all.find((s) => s.option.id === 'ct');
    expect(ct?.breaks.map((p) => p.id)).toEqual(['ct-cap']);
    // An option already chosen is not suggested again, and a promise already broken by choice is
    // not counted against another move.
    const again = affordSuggestions(
      afford,
      ds.levers,
      { itbr: 1 },
      ds.pm.promises,
      headroomOf,
      100,
    );
    expect(again.some((s) => s.option.id === 'itbr')).toBe(false);
    expect(again.find((s) => s.option.id === 'vats')?.breaks).toEqual([]);
    // Adjusted on the desk short of the option counts as chosen too: it is not offered again.
    const adjusted = affordSuggestions(
      afford,
      ds.levers,
      { alc: 2 },
      ds.pm.promises,
      headroomOf,
      100,
    );
    expect(adjusted.some((s) => s.option.id === 'alc')).toBe(false);
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

  it('narrows a chosen option when it is one slider, and not a toggle or a bundle', () => {
    const prisons = deliver.find((o) => o.id === 'prisons');
    const dip = deliver.find((o) => o.id === 'dip-gap');
    expect(prisons && narrowedBundle(prisons, ds.levers)).toEqual({ moj: 5 });
    expect(dip && narrowedBundle(dip, ds.levers)).toBeNull();
    expect(narrowedBundle({ values: { dhsc: 3, dfe: 5 } }, ds.levers)).toBeNull();
    expect(narrowedBundle({ values: { nosuch: 3 } }, ds.levers)).toBeNull();
  });
});
