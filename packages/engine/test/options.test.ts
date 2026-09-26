import { describe, expect, it } from 'vitest';
import type { Settings } from '../src/index.js';
import {
  AFFORD_TABS,
  affordTabs,
  allOptions,
  blockedBy,
  computeOutcome,
  deliverOptionsFor,
  optionByLever,
  optionConflicts,
  optionEarliestStart,
  optionOff,
  optionOverlaps,
  optionRedLines,
  optionState,
  optionsFileSchema,
  policyYearsOf,
  validateDataset,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const options = ds.options;
const levers = ds.levers;
const codesOf = (values: Record<string, number>) => Object.keys(values);
const byCode = (code: string) => {
  const l = levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};
const deliverOption = (id: string) => {
  const o = options.deliver.find((x) => x.id === id);
  if (!o) throw new Error(`no deliver option ${id}`);
  return o;
};
const affordOption = (id: string) => {
  const o = options.afford.find((x) => x.id === id);
  if (!o) throw new Error(`no afford option ${id}`);
  return o;
};
const addOn = (id: string) => {
  const o = options.addOns.find((x) => x.id === id);
  if (!o) throw new Error(`no add-on ${id}`);
  return o;
};
const run = (values: Record<string, number>, settings: Partial<Settings> = {}) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers,
    settings: {
      leverValues: values,
      implementationYear: ds.vintage.years.forecast[1] ?? '',
      ...settings,
    },
  });

describe('the options (ADR-0022)', () => {
  it('validate:data accepts the file, and every option moves a real lever off its default', () => {
    expect(validateDataset(ds)).toEqual([]);
    const byCode = new Map(levers.map((l) => [l.code, l] as const));
    for (const o of [...options.deliver, ...options.afford, ...options.addOns]) {
      for (const [code, value] of Object.entries(o.values)) {
        const lever = byCode.get(code);
        expect(lever, `${o.id} names ${code}`).toBeDefined();
        expect(value, `${o.id} leaves ${code} alone`).not.toBe(lever?.control.default);
      }
    }
  });

  it('no lever appears in more than one option anywhere, so no screen can light or undo another', () => {
    const codes = [...options.deliver, ...options.afford, ...options.addOns].flatMap((o) =>
      codesOf(o.values),
    );
    expect(new Set(codes).size).toBe(codes.length);
    // Every option is found by its lever, and a way to afford wears its lever's titles.
    const byLever = optionByLever(options, levers);
    expect(byLever.size).toBe(codes.length);
    expect(byLever.get('itbr')?.title).toBe('Basic rate of income tax');
    expect(byLever.get('itbr')?.shortTitle).toBe('Basic rate');
    expect(byLever.get('moj')?.title).toBe('A Justice uplift for prison capacity');
    expect(allOptions(options, levers).map((o) => o.screen)).toContain('addOns');
  });

  it('every priority named has two to five ways to deliver it', () => {
    const priorities = new Set(options.deliver.map((o) => o.priority));
    expect(priorities.size).toBe(8);
    for (const id of priorities) {
      const n = deliverOptionsFor(id, options).length;
      expect(n, id).toBeGreaterThanOrEqual(2);
      expect(n, id).toBeLessThanOrEqual(5);
    }
  });

  it('every way to afford sits in exactly one who-pays tab, three to six a tab', () => {
    const tabs = affordTabs(options, ds.incidence);
    expect(tabs.map((t) => t.tab.id)).toEqual(AFFORD_TABS.map((t) => t.id));
    const placed = tabs.flatMap((t) => t.options.map((o) => o.id));
    expect([...placed].sort()).toEqual(options.afford.map((o) => o.id).sort());
    for (const t of tabs) {
      expect(t.options.length, t.tab.id).toBeGreaterThanOrEqual(3);
      expect(t.options.length, t.tab.id).toBeLessThanOrEqual(6);
    }
  });

  it('reads on, adjusted and off from the lever values', () => {
    const health = deliverOption('health-above-sr');
    expect(optionState(health, {}, levers)).toBe('off');
    expect(optionState(health, { dhsc: 3 }, levers)).toBe('on');
    expect(optionState(health, { dhsc: 4 }, levers)).toBe('on');
    expect(optionState(health, { dhsc: 1 }, levers)).toBe('adjusted');
    expect(optionState(health, { dfe: 5 }, levers)).toBe('off');
    const pair = { id: 'pair', values: { dhsc: 3, dfe: 5 } };
    expect(optionState(pair, { dhsc: 3 }, levers)).toBe('adjusted');
    expect(optionState(pair, { dhsc: 3, dfe: 5 }, levers)).toBe('on');
    expect(optionOff(pair, levers)).toEqual({ dhsc: 0, dfe: 0 });
  });

  it('carries the latest earliest start of its levers', () => {
    expect(optionEarliestStart(affordOption('wealth2'), levers)).toBe('2030-31');
    expect(optionEarliestStart(affordOption('cgtalign'), levers)).toBe('2028-29');
    expect(optionEarliestStart(affordOption('hscl'), levers)).toBeUndefined();
    expect(optionEarliestStart({ id: 'both', values: { cgtalign: 1, wealth2: 1 } }, levers)).toBe(
      '2030-31',
    );
  });

  it('names the red line a lever is watched by, and whether the Budget would cross it', () => {
    const lock = ds.pm.promises.find((p) => p.id === 'tax-lock');
    const lines = optionRedLines(affordOption('itbr'), ds.pm.promises, levers, {});
    expect(lines).toEqual([{ promise: lock?.title, when: 'above', broken: true }]);
    expect(optionRedLines(affordOption('hscl'), ds.pm.promises, levers, {})).toEqual([]);
    // A saving that breaks a promise when switched on.
    const limit = optionRedLines(deliverOption('two-child-limit'), ds.pm.promises, levers, {});
    expect(limit.map((l) => l.broken)).toEqual([true]);
  });

  it('warns when an option meets a lever already moved that it interacts with', () => {
    const uprating = affordOption('rvfuel');
    expect(optionOverlaps(uprating, levers, new Set())).toEqual([]);
    const hits = optionOverlaps(uprating, levers, new Set(['fuel']));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.withLever.code).toBe('fuel');
    expect(hits[0]?.active).toBe(true);
  });

  it('names the options it overlaps before either is chosen, from either side of the pair', () => {
    // Employer NICs and corporation tax interact: the note is there before anything moves, and
    // the text comes once the partner has.
    const quiet = optionOverlaps(affordOption('nicer'), levers, new Set(), options);
    const ct = quiet.find((o) => o.option?.id === 'ct');
    expect(ct?.active).toBe(false);
    expect(ct?.option?.title).toBe(byCode('ct').title);
    const loud = optionOverlaps(affordOption('nicer'), levers, new Set(['ct']), options);
    expect(loud.find((o) => o.option?.id === 'ct')?.active).toBe(true);
    // The child tax allowance lists the personal allowance; the allowance does not list it back.
    // Read from either side, the £100 add-on still knows about it, and about the NICs threshold.
    const allowance = optionOverlaps(addOn('allowance-100'), levers, new Set(), options);
    expect(allowance.map((o) => o.option?.id).sort()).toEqual([
      'child-tax-allowance',
      'nics-threshold-2',
    ]);
    // A lever no option offers is only mentioned once it has moved on the desk.
    const vat = optionOverlaps(deliverOption('vat-off-gas'), levers, new Set(), options);
    expect(vat.some((o) => o.withLever.code === 'vatnrg')).toBe(false);
    const vatMoved = optionOverlaps(
      deliverOption('vat-off-gas'),
      levers,
      new Set(['vatnrg']),
      options,
    );
    expect(vatMoved.some((o) => o.withLever.code === 'vatnrg' && o.option === undefined)).toBe(
      true,
    );
    // A pair authored as a conflict is not an overlap as well: the conflict says it.
    expect(optionOverlaps(affordOption('rvfuel'), levers, new Set(['fuel']), options)).toEqual([]);
  });

  it('reads a conflict from either side, and blocks the other option while one is in the Budget', () => {
    const gap = deliverOption('dip-gap');
    const three = deliverOption('three-per-cent-now');
    // Authored on the 3% option, seen from the gap's side too.
    const fromGap = optionConflicts(gap, options, levers, {});
    expect(fromGap.map((c) => [c.option.id, c.partner])).toEqual([['three-per-cent-now', 'off']]);
    expect(fromGap[0]?.text).toMatch(/counts some of the same money twice/);
    expect(optionConflicts(three, options, levers, { dip47: 1 })[0]?.partner).toBe('on');
    // Nothing chosen: nothing blocked. The 3% option on: the gap is blocked, and says by what.
    expect(blockedBy(gap, options, levers, {})).toBeUndefined();
    expect(blockedBy(gap, options, levers, { def3: 1 })?.option.id).toBe('three-per-cent-now');
    // Both on (from the desk): neither is blocked, both can be put back.
    expect(blockedBy(three, options, levers, { def3: 1, dip47: 1 })).toBeUndefined();
    expect(blockedBy(gap, options, levers, { def3: 1, dip47: 1 })).toBeUndefined();
    // A partner adjusted on the desk blocks too: half a fuel duty cut still rules out the uprating.
    expect(blockedBy(affordOption('rvfuel'), options, levers, { fuel: -5 })?.option.id).toBe(
      'fuel-duty-cut',
    );
    // Across screens: the CGT package blocks the charge at death, and the reverse.
    expect(blockedBy(affordOption('cgtdth'), options, levers, { cgtalign: 1 })?.option.id).toBe(
      'cgtalign',
    );
    expect(blockedBy(affordOption('cgtalign'), options, levers, { cgtdth: 1 })?.option.id).toBe(
      'cgtdth',
    );
  });

  it('every option, on its own, moves money in some policy year', () => {
    const years = policyYearsOf(ds.vintage);
    for (const o of [...options.deliver, ...options.afford, ...options.addOns]) {
      const out = run(o.values);
      const moved = out.leverEffects.some((e) =>
        years.some(
          (y) =>
            Math.abs(e.receipts[y] ?? 0) +
              Math.abs(e.currentSpending[y] ?? 0) +
              Math.abs(e.capitalSpending[y] ?? 0) >
            0,
        ),
      );
      expect(moved, o.id).toBe(true);
    }
  });

  it('the schema refuses two options on one lever anywhere, and a conflict that names nobody', () => {
    const line = { text: 'x', sources: [], badge: 'simulated' as const };
    const base = {
      schemaVersion: 1 as const,
      deliver: [{ id: 'a', priority: 'p', title: 'A', line, values: { dhsc: 3 } }],
      afford: [{ id: 'b', values: { itbr: 1 } }],
      addOns: [
        { id: 'c', title: 'C', line, values: { ufsm: 1 } },
        { id: 'd', title: 'D', line, values: { bus2: 1 } },
      ],
    };
    expect(optionsFileSchema.safeParse(base).success).toBe(true);
    // An add-on on a deliver lever: the coupling the user found, refused now.
    expect(
      optionsFileSchema.safeParse({
        ...base,
        addOns: [...base.addOns, { id: 'c2', title: 'C2', line, values: { dhsc: 3 } }],
      }).success,
    ).toBe(false);
    // Conflicts: an unknown partner, a self conflict, a pair authored on both sides; one side is fine.
    const withConflict = (
      deliverConflicts: { with: string; text: string }[],
      affordConflicts?: { with: string; text: string }[],
    ) =>
      optionsFileSchema.safeParse({
        ...base,
        deliver: [{ ...base.deliver[0], conflicts: deliverConflicts }],
        afford: [{ ...base.afford[0], ...(affordConflicts ? { conflicts: affordConflicts } : {}) }],
      }).success;
    expect(withConflict([{ with: 'b', text: 'same money' }])).toBe(true);
    expect(withConflict([{ with: 'nosuch', text: 'x' }])).toBe(false);
    expect(withConflict([{ with: 'a', text: 'x' }])).toBe(false);
    expect(withConflict([{ with: 'b', text: 'x' }], [{ with: 'a', text: 'x' }])).toBe(false);
    expect(
      optionsFileSchema.safeParse({
        ...base,
        deliver: [
          ...base.deliver,
          { id: 'e', priority: 'p', title: 'E', line, values: { dhsc: 5 } },
        ],
      }).success,
    ).toBe(false);
    expect(
      optionsFileSchema.safeParse({ ...base, afford: [{ id: 'b', values: { dhsc: 1 } }] }).success,
    ).toBe(false);
    expect(
      optionsFileSchema.safeParse({
        ...base,
        afford: [{ id: 'b', values: { itbr: 1, vats: 1, nicm: 1 } }],
      }).success,
    ).toBe(false);
  });

  it('validate:data refuses an unknown lever, a default value and a value off the steps', () => {
    const tamper = (values: Record<string, number>) =>
      validateDataset({
        ...ds,
        options: {
          ...options,
          addOns: [
            ...options.addOns,
            { id: 'zz', title: 'Z', line: options.addOns[0]!.line, values },
          ],
        },
      });
    expect(tamper({ nosuch: 1 }).join('\n')).toMatch(/unknown lever "nosuch"/);
    expect(tamper({ dhsc: 0 }).join('\n')).toMatch(/leaves lever dhsc where it is/);
    expect(tamper({ dhsc: 0.3 }).join('\n')).toMatch(/off the control's steps/);
    expect(tamper({ dhsc: 40 }).join('\n')).toMatch(/outside the lever's range/);
  });
});
