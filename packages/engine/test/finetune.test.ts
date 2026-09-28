import { describe, expect, it } from 'vitest';
import {
  FINETUNE_SIDES,
  WHO_PAYS,
  finetuneFileSchema,
  finetuneItems,
  finetuneNames,
  finetuneSideOf,
  leadPolicy,
  setByFlagship,
  sizeIndex,
  sizeLabels,
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

/**
 * The twenty-eight taxes, in the order the tax screen shows them (Phase 24, ADR-0025). Phase 25
 * added the two cuts a Chancellor actually faces this autumn: keeping VAT off electricity (third in
 * "Everyone", the main VAT rate folded) and freezing fuel duty (first for drivers, last year's
 * cancelled rise folded).
 */
const TAX_CODES = [
  ['everyone', ['hscl', 'itbr', 'vatelec', 'vats', 'sugsalt', 'ipt', 'hmrc2']],
  ['best-off', ['cgtalign', 'nicuel', 'pens30', 'it50', 'wealth2']],
  ['business', ['nicpen', 'nicer', 'qelevy', 'ct', 'banklevy']],
  ['savers-owners', ['ctgh', 'cgtdth', 'rnrb', 'nicrent', 'iinc2']],
  ['duties', ['fuelfrz', 'gam2', 'tob', 'ved', 'apd', 'rvfuel']],
] as const;

const SPENDING_CODES = [
  ['services', ['dhsc', 'dfe', 'mod', 'home', 'moj', 'mhclg', 'dft', 'fcdo', 'otherd']],
  // Phase 25: the defence plan's gap, already on the desk, joins investment.
  ['investment', ['cdel', 'dip47']],
  ['benefits', ['wpens', 'wuc', 'wdis', 'woth']],
  ['decisions', ['rvpip', 'rveff', 'rv2ch', 'rvwfp', 'rvplan2']],
] as const;

describe('the fine-tuning screens (Phase 24, ADR-0025)', () => {
  it('offers twenty-eight taxes in five who-pays groups, and twenty spending levers in four', () => {
    expect(file.tax.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(TAX_CODES);
    expect(file.spending.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(
      SPENDING_CODES,
    );
    expect(finetuneItems(file, 'tax')).toHaveLength(28);
    expect(finetuneItems(file, 'spending')).toHaveLength(20);
    // The spending screen says how long the settlements run, the squeeze already after them, and
    // whose budgets most of these are (Phase 25).
    expect(file.spending.notes.map((n) => n.badge)).toEqual(['simulated', 'direct', 'commentary']);
    expect(finetuneItems(file)).toHaveLength(48);
    expect(FINETUNE_SIDES).toEqual(['tax', 'spending']);
  });

  it('is clean, and names every lever plainly', () => {
    expect(validateDataset(ds)).toEqual([]);
    const names = finetuneNames(file);
    expect(names.get('itbr')).toBe('The basic rate of income tax');
    expect(names.get('hscl')).toBe('Bring back the health and social care levy');
    expect(names.get('dhsc')).toBe('Health and social care');
    expect(names.get('rvwfp')).toBe('Limit winter fuel payments to pensioners on pension credit');
  });

  it('puts each lever on its own side of the Budget, and each tax with the people who pay it', () => {
    for (const item of finetuneItems(file)) {
      expect(finetuneSideOf(lever(item.code)), item.code).toBe(item.side);
      if (item.side === 'tax') {
        expect(WHO_PAYS[item.group.id], item.code).toContain(ds.incidence.levers[item.code]);
      }
    }
  });

  it('offers policies whose sizes each lever can reach, one way each (Phase 26)', () => {
    for (const item of finetuneItems(file)) {
      const { min, max, default: rest, kind } = lever(item.code).control;
      // A toggle is one policy, switched on; a lever that moves both ways offers one policy each way.
      if (kind === 'toggle') {
        expect(
          item.policies.map((p) => p.sizes),
          item.code,
        ).toEqual([[1]]);
        expect(item.name, item.code).toBeUndefined();
      } else {
        expect(item.name, item.code).toBeTruthy();
      }
      const ways = item.policies.map((policy) => {
        const moves = policy.sizes.map((size) => size - rest);
        for (const size of policy.sizes) {
          expect(size, policy.title).toBeGreaterThanOrEqual(min);
          expect(size, policy.title).toBeLessThanOrEqual(max);
        }
        // All one way, and growing away from where the lever rests.
        expect(new Set(moves.map(Math.sign)).size, policy.title).toBe(1);
        const reach = moves.map(Math.abs);
        expect(reach, policy.title).toEqual([...reach].sort((a, b) => a - b));
        expect(new Set(reach).size, policy.title).toBe(reach.length);
        expect(policy.advice.badge).toBe('simulated');
        expect(policy.advice.sources.length, policy.title).toBeGreaterThan(0);
        return Math.sign(moves[0] ?? 0);
      });
      if (ways.length === 2) expect(ways[0], item.code).toBe(-(ways[1] ?? 0));
      // The spending screen leads with a cut, where the sums are made to add up.
      if (item.side === 'spending' && kind !== 'toggle') expect(ways[0], item.code).toBe(-1);
    }
  });

  it('sizes a policy at its usual step, twice it and five times it, capped at the lever’s range', () => {
    // Where HMRC publishes points the sizes sit on them, and the additional rate stops short of
    // the 50% rate, which is its own policy (ADR-0027).
    const ON_POINTS = new Set(['itpa', 'itbrl', 'cgth', 'cgtl', 'badr', 'iht', 'itar']);
    for (const item of finetuneItems(file)) {
      const { min, max, default: rest, kind } = lever(item.code).control;
      if (kind === 'toggle' || ON_POINTS.has(item.code)) continue;
      for (const policy of item.policies) {
        const way = Math.sign((policy.sizes[0] ?? rest) - rest);
        const edge = way > 0 ? max - rest : rest - min;
        const step = Math.abs((policy.sizes[0] ?? rest) - rest);
        const rule = [...new Set([step, 2 * step, 5 * step].map((m) => Math.min(m, edge)))];
        expect(
          policy.sizes.map((size) => Math.abs(size - rest)),
          policy.title,
        ).toEqual(rule);
      }
    }
    // The user's own example: VAT at 21%, 22% and 25%.
    const vat = finetuneItems(file).find((i) => i.code === 'vats');
    expect(vat?.policies[0]?.sizes).toEqual([1, 2, 5]);
    expect(sizeLabels(3)).toEqual(['Small', 'Medium', 'Large']);
    expect(sizeLabels(2)).toEqual(['Small', 'Large']);
    expect(sizeLabels(1)).toEqual([]);
  });

  it('reads which policy, and which size, a lever’s setting is', () => {
    const vat = finetuneItems(file).find((i) => i.code === 'vats');
    if (!vat) throw new Error('no VAT');
    const vats = lever('vats');
    expect(leadPolicy(vat, vats, 0).title).toBe('Put up VAT');
    expect(leadPolicy(vat, vats, 2).title).toBe('Put up VAT');
    expect(leadPolicy(vat, vats, -1).title).toBe('Cut VAT');
    expect(sizeIndex(vat.policies[0]!, 2)).toBe(1);
    expect(sizeIndex(vat.policies[0]!, 3)).toBeUndefined();
    expect(sizeIndex(vat.policies[1]!, -5)).toBe(2);
  });

  it('holds a lever for a flagship only at the flagship’s own value', () => {
    const prisons = ds.options.deliver.find((o) => o.id === 'prisons');
    if (!prisons) throw new Error('no prisons option');
    const status = { priorities: [{ rank: 1, options: [{ option: prisons }] }] } as Parameters<
      typeof setByFlagship
    >[0];
    expect(setByFlagship(status, { moj: 10 }, ds.levers).get('moj')?.rank).toBe(1);
    // Past it or short of it is a step-4 choice, shown as one.
    expect(setByFlagship(status, { moj: 5 }, ds.levers).has('moj')).toBe(false);
    expect(setByFlagship(status, {}, ds.levers).size).toBe(0);
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
    const up = (f: FinetuneFile) => first(f).policies[0]!;
    expect(tamper((f) => (up(f).sizes = [9]))).toMatch(/offers 9, outside the lever's range/);
    expect(tamper((f) => (up(f).sizes = [0]))).toMatch(/offers 0, where the lever rests/);
    expect(tamper((f) => (up(f).sizes = [0.5]))).toMatch(/offers 0.5, off the control's steps/);
    expect(tamper((f) => (up(f).sizes = [2, 1]))).toMatch(/sizes that do not grow/);
    expect(tamper((f) => (up(f).sizes = [1, -2]))).toMatch(/goes both ways/);
    expect(tamper((f) => (first(f).policies[1]!.sizes = [1]))).toMatch(
      /lever itbr has two policies the same way/,
    );
    expect(tamper((f) => delete first(f).name)).toMatch(/lever itbr needs a plain name/);
    expect(tamper((f) => (f.tax.groups[0]!.items[0]!.policies[0]!.sizes = [1, 1]))).toMatch(
      /is a toggle: it is switched on, in one size/,
    );
    // A lever not on the table comes after the rest of its group, as the desk sorted them.
    expect(
      tamper((f) =>
        f.tax.groups[0]!.items.unshift({
          code: 'vatfood',
          policies: [{ ...f.tax.groups[0]!.items[0]!.policies[0]!, title: 'Charge VAT on food' }],
        }),
      ),
    ).toMatch(/hscl comes after vatfood, which is not on the table/);
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
