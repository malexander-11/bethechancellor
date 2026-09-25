import { describe, expect, it } from 'vitest';
import type { Settings } from '../src/index.js';
import {
  AFFORD_TABS,
  affordTabs,
  computeOutcome,
  deliverOptionsFor,
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

  it('no lever appears twice on a screen, and none on both deliver and afford', () => {
    for (const list of [options.deliver, options.afford, options.addOns]) {
      const codes = list.flatMap((o) => codesOf(o.values));
      expect(new Set(codes).size).toBe(codes.length);
    }
    const delivering = new Set(options.deliver.flatMap((o) => codesOf(o.values)));
    for (const o of options.afford) {
      for (const code of codesOf(o.values)) expect(delivering.has(code), code).toBe(false);
    }
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

  it('the schema refuses two options on one lever, or an afford option on a deliver lever', () => {
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
