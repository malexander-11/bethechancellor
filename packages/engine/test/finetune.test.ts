import { describe, expect, it } from 'vitest';
import {
  FINETUNE_SIDES,
  WHO_PAYS,
  finetuneFileSchema,
  finetuneItems,
  finetuneSideOf,
  finetuneTitles,
  validateDataset,
  type FinetuneFile,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const file = ds.finetune;
const lever = (code: string) => {
  const l = ds.levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};

/** The twenty-six ways to pay, in the order the tax screen shows them (Phase 24, ADR-0025). */
const TAX_CODES = [
  ['everyone', ['hscl', 'itbr', 'vats', 'sugsalt', 'ipt', 'hmrc2']],
  ['best-off', ['cgtalign', 'nicuel', 'pens30', 'it50', 'wealth2']],
  ['business', ['nicpen', 'nicer', 'qelevy', 'ct', 'banklevy']],
  ['savers-owners', ['ctgh', 'cgtdth', 'rnrb', 'nicrent', 'iinc2']],
  ['duties', ['gam2', 'rvfuel', 'tob', 'ved', 'apd']],
] as const;

const SPENDING_CODES = [
  ['services', ['dhsc', 'dfe', 'mod', 'home', 'moj', 'mhclg', 'dft', 'fcdo', 'otherd']],
  ['investment', ['cdel']],
  ['benefits', ['wpens', 'wuc', 'wdis', 'woth']],
  ['decisions', ['rvpip', 'rveff', 'rv2ch', 'rvwfp', 'rvplan2']],
] as const;

describe('the fine-tuning screens (Phase 24, ADR-0025)', () => {
  it('offers twenty-six ways to pay in five who-pays groups, and nineteen spending levers in four', () => {
    expect(file.tax.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(TAX_CODES);
    expect(file.spending.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(
      SPENDING_CODES,
    );
    expect(finetuneItems(file, 'tax')).toHaveLength(26);
    expect(finetuneItems(file, 'spending')).toHaveLength(19);
    expect(finetuneItems(file)).toHaveLength(45);
    expect(FINETUNE_SIDES).toEqual(['tax', 'spending']);
  });

  it('is clean, and names every lever by its plain title', () => {
    expect(validateDataset(ds)).toEqual([]);
    const titles = finetuneTitles(file);
    expect(titles.get('itbr')).toBe('The basic rate of income tax');
    expect(titles.get('hscl')).toBe('Bring back the health and social care levy');
    expect(titles.get('dhsc')).toBe('Health and social care');
    expect(titles.get('rvwfp')).toBe('Limit winter fuel payments to pensioners on pension credit');
  });

  it('puts each lever on its own side of the Budget, and each tax with the people who pay it', () => {
    for (const item of finetuneItems(file)) {
      expect(finetuneSideOf(lever(item.code)), item.code).toBe(item.side);
      if (item.side === 'tax') {
        expect(WHO_PAYS[item.group.id], item.code).toContain(ds.incidence.levers[item.code]);
      }
    }
  });

  it('judges a move each control can reach, and never the setting the lever rests at', () => {
    for (const item of finetuneItems(file)) {
      const { min, max, default: rest, kind } = lever(item.code).control;
      expect(item.move, item.code).toBeGreaterThanOrEqual(min);
      expect(item.move, item.code).toBeLessThanOrEqual(max);
      expect(item.move, item.code).not.toBe(rest);
      // A toggle is judged switched on; the spending sliders are judged at a cut, where the sums
      // are made to add up.
      if (kind === 'toggle') expect(item.move, item.code).toBe(1);
      if (item.side === 'spending' && kind !== 'toggle')
        expect(item.move, item.code).toBeLessThan(0);
      expect(item.advice.badge).toBe('simulated');
      expect(item.advice.sources.length, item.code).toBeGreaterThan(0);
    }
  });

  it('refuses a lever offered twice and two groups under one name', () => {
    const twice: FinetuneFile = structuredClone(file);
    twice.spending.groups[0]!.items.push({ ...twice.tax.groups[0]!.items[1]! });
    expect(finetuneFileSchema.safeParse(twice).success).toBe(false);
    const named: FinetuneFile = structuredClone(file);
    named.tax.groups[1]!.id = named.tax.groups[0]!.id;
    expect(finetuneFileSchema.safeParse(named).success).toBe(false);
    expect(finetuneFileSchema.safeParse(file).success).toBe(true);
  });

  it('validate:data names each way a screen can be wrong', () => {
    const tamper = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      return validateDataset({ ...ds, finetune: copy }).join('\n');
    };
    const first = (f: FinetuneFile) => f.tax.groups[0]!.items[1]!;
    expect(tamper((f) => (first(f).code = 'nosuch'))).toMatch(/offers unknown lever "nosuch"/);
    expect(tamper((f) => f.spending.groups[0]!.items.push({ ...first(f), code: 'water' }))).toMatch(
      /offers shelved lever water/,
    );
    expect(tamper((f) => f.tax.groups[0]!.items.push({ ...first(f), code: 'dhsc' }))).toMatch(
      /the tax screen offers dhsc, a spend lever/,
    );
    expect(tamper((f) => (first(f).move = 9))).toMatch(/judges 9, outside the lever's range/);
    expect(tamper((f) => (first(f).move = 0))).toMatch(/judges 0, where the lever rests/);
    expect(tamper((f) => (first(f).move = 0.5))).toMatch(/judges 0.5, off the control's steps/);
    expect(tamper((f) => f.tax.groups[1]!.items.push(first(f)))).toMatch(
      /tax lever itbr falls on broad-base, not on group best-off/,
    );
    expect(tamper((f) => (f.tax.groups[0]!.id = 'nobody'))).toMatch(
      /tax group nobody is not one of the who-pays groups/,
    );
    expect(tamper((f) => (f.spending.adviser = 'nobody'))).toMatch(
      /the spending screen names unknown adviser nobody/,
    );
    expect(tamper((f) => (f.tax.adviser = 'permanent-secretary'))).toMatch(
      /adviser permanent-secretary does not speak on finetune/,
    );
  });
});
