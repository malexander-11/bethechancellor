import { describe, expect, it } from 'vitest';
import { finetuneItems, householdReactions } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const react = (values: Record<string, number>, themed = false) =>
  householdReactions(ds.electorate, values, ds.levers, () => 1, null, themed, ds.incidence);
const of = (values: Record<string, number>, id: string) =>
  react(values).find((r) => r.household.id === id);

/** The review's walk (Phase 25): two flagships, employer National Insurance, a penny, a health trim. */
const WALK = { dip47: 1, moj: 10, nicer: 2, itbr: 1, dhsc: -0.5 };
const NICS_WALK = { dip47: 1, moj: 10, nicer: 2, dhsc: -0.5 };

describe('the electorate as five households', () => {
  it('leaves everyone untouched by an empty Budget, and puzzled without a theme', () => {
    const out = react({});
    expect(out).toHaveLength(5);
    expect(out.every((r) => r.net === 'untouched' && !r.understood)).toBe(true);
    expect(out.every((r) => r.quiet?.text === r.household.untouched.text)).toBe(true);
    expect(out.every((r) => r.line.text === r.household.puzzled.text)).toBe(true);
  });

  it('fires the lines of the levers that touch a household, in the direction moved', () => {
    const family = of({ rv2ch: 1, ufsm: 1 }, 'uc-family');
    expect(family?.net).toBe('mixed');
    expect(family?.quiet).toBeNull();
    expect(family?.said.map((s) => s.lever.code).sort()).toEqual(['rv2ch', 'ufsm']);
    // A lower personal allowance reaches every taxpayer below the top rate, and the pensioner on
    // a full state pension it makes a taxpayer; a lower Class 4 rate, the tradesperson (ADR-0035).
    for (const id of ['mortgage-couple', 'pensioner', 'tradesperson']) {
      expect(of({ itpa: -100 }, id)?.net, id).toBe('pays');
    }
    // The professional pays the additional rate, where the allowance is already gone: in the
    // broad base, but named by nothing.
    expect(of({ itpa: -100 }, 'professional')?.net).toBe('unnamed');
    expect(of({ nic4: -1 }, 'tradesperson')?.net).toBe('gains');
    expect(of({ nic4: -1 }, 'tradesperson')?.said[0]?.touch.line.text).toMatch(/keep more/);
    const couple = of({ itbr: -1 }, 'mortgage-couple');
    expect(couple?.net).toBe('gains');
    expect(couple?.said[0]?.touch.line.text).toMatch(/penny off/);
    expect(of({ itbr: 1 }, 'mortgage-couple')?.net).toBe('pays');
  });

  it('says nothing aimed at it by name when its groups moved and none of its touches did', () => {
    // A wealth tax above £10 million reaches none of the five by name; the professional is among
    // the best-off it is aimed at as a group, so says the unnamed line, never "untouched".
    const professional = of({ wealth2: 1 }, 'professional');
    expect(professional?.net).toBe('unnamed');
    expect(professional?.quiet?.text).toBe(ds.electorate.unnamed.text);
    expect(professional?.quiet?.text).toBe('Nothing aimed at us by name that we could see.');
    // Nothing in the pensioner's groups moved, so the pensioner is untouched.
    expect(of({ wealth2: 1 }, 'pensioner')?.net).toBe('untouched');
  });

  it('touches a household with every curated and flagship lever, or lists it as reaching none', () => {
    const touched = new Set(ds.electorate.households.flatMap((h) => h.touches.map((t) => t.code)));
    const none = new Set(ds.electorate.reachesNone);
    const codes = new Set([
      ...finetuneItems(ds.finetune).map((i) => i.code),
      ...ds.options.deliver.flatMap((o) => Object.keys(o.values)),
    ]);
    const missing = [...codes].filter((code) => !touched.has(code) && !none.has(code));
    expect(missing, 'levers no household hears of').toEqual([]);
    for (const code of none) expect(touched.has(code), code).toBe(false);
  });

  it('never calls a household hit by the walk untouched', () => {
    for (const values of [WALK, NICS_WALK]) {
      const moved = new Set(Object.keys(values).map((code) => ds.incidence.levers[code]));
      for (const r of react(values)) {
        if (r.household.exposure.some((g) => moved.has(g)))
          expect(r.net, r.household.id).not.toBe('untouched');
      }
    }
    // The penny reaches the couple, the tradesperson and the professional by name, and employer
    // National Insurance the couple too; the health trim reaches the pensioner; the family is in
    // the groups and hears nothing by name.
    const nets = Object.fromEntries(react(WALK).map((r) => [r.household.id, r.net]));
    expect(nets).toEqual({
      'uc-family': 'unnamed',
      'mortgage-couple': 'pays',
      pensioner: 'pays',
      tradesperson: 'pays',
      professional: 'pays',
    });
    // Employer National Insurance reaches the couple through pay, and says so.
    expect(of({ nicer: 1 }, 'mortgage-couple')?.said[0]?.touch.line.text).toMatch(
      /comes out of pay rises/,
    );
  });

  it('never quotes a number that is not a sourced fact', () => {
    const lines = [
      ds.electorate.unnamed,
      ...ds.electorate.households.flatMap((h) => [
        h.fact,
        h.untouched,
        h.understood,
        h.puzzled,
        ...h.touches.map((t) => t.line),
      ]),
    ];
    for (const line of lines) {
      expect(line.badge).toBe('simulated');
      if (/£\d|\d{3},\d{3}|\d+%/.test(line.text)) {
        expect(
          line.sources.length,
          `"${line.text}" quotes a figure without a source`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
