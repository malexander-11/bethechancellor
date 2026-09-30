import { describe, expect, it } from 'vitest';
import type { Lever, Settings } from '../src/index.js';
import {
  computeOutcome,
  effectiveStartYear,
  fyStart,
  policyYearsOf,
  validateDataset,
} from '../src/index.js';
import { TOGGLE, loadDataset, syntheticLever } from './fixtures.js';
import { PENNY } from './scenarios.js';

const ds = loadDataset();
const run = (
  values: Record<string, number>,
  settings: Partial<Settings> = {},
  levers: readonly Lever[] = ds.levers,
) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers,
    settings: { leverValues: values, implementationYear: '2027-28', ...settings },
  });
const effectOf = (lever: Lever, settings: Partial<Settings> = {}, value = 1) => {
  const e = run({ [lever.code]: value }, settings, [lever]).leverEffects.find(
    (x) => x.code === lever.code,
  );
  if (!e) throw new Error(`no effect for ${lever.code}`);
  return e;
};
const size = (
  e: { receipts: Record<string, number>; currentSpending: Record<string, number> },
  y: string,
) => Math.abs(e.receipts[y] ?? 0) + Math.abs(e.currentSpending[y] ?? 0);
const floor = (year: string) => ({
  year,
  text: 'Its source says it cannot take effect sooner.',
  sources: [{ sourceId: 'obr-efo-2026-03' }],
});
const EVERY_YEAR = {
  '2026-27': 1000,
  '2027-28': 1000,
  '2028-29': 1000,
  '2029-30': 1000,
  '2030-31': 1000,
};
/** A made-up measure worth the same every year, and one that cannot start before a year. */
const measure = (code: string, earliestStart?: string) =>
  syntheticLever({
    code,
    control: TOGGLE,
    ...(earliestStart ? { earliestStart: floor(earliestStart) } : {}),
    costing: {
      kind: 'schedule',
      effect: EVERY_YEAR,
      source: { sourceId: 'hmt-budget-2025-table-4-1' },
      caveats: [],
    },
  });

/** The cards whose sources say they cannot take effect from April 2027 (ADR-0021), and when. */
const EARLIEST: Record<string, string> = Object.fromEntries(
  ds.levers.flatMap((l) => (l.earliestStart ? [[l.code, l.earliestStart.year] as const] : [])),
);

describe('nothing before it can start (ADR-0021)', () => {
  it('gives every sourced earliest start a year inside the forecast, named in the headline', () => {
    expect(Object.keys(EARLIEST).length).toBeGreaterThan(0);
    const years = policyYearsOf(ds.vintage);
    for (const l of ds.levers) {
      if (!l.earliestStart) continue;
      expect(years, l.code).toContain(l.earliestStart.year);
      expect(l.earliestStart.sources.length, l.code).toBeGreaterThan(0);
      // A card taken off the table keeps its floor for the record; its headline says it is kept.
      if (!l.deprecated) expect(l.headline ?? '', l.code).toContain(l.earliestStart.year);
    }
  });

  it('counts nothing before the floor and the full figure from it, however early the Budget starts everything else', () => {
    for (const [code, start] of Object.entries(EARLIEST)) {
      const e = run({ [code]: 1 }, { implementationYear: '2026-27' }).leverEffects.find(
        (x) => x.code === code,
      );
      if (!e) throw new Error(`no effect for ${code}`);
      for (const y of policyYearsOf(ds.vintage)) {
        if (fyStart(y) < fyStart(start)) expect(size(e, y), `${code} ${y}`).toBe(0);
      }
      expect(size(e, start), code).toBeGreaterThan(0);
    }
  });

  it('a delay earlier than the floor changes nothing; a later one wins', () => {
    const floored = measure('xfloor', '2029-30');
    const early = effectOf(floored, { implementationYearByCode: { xfloor: '2028-29' } });
    expect(early.receipts['2028-29'] ?? 0).toBe(0);
    expect(early.receipts['2029-30']).toBeCloseTo(1000, 6);
    const late = effectOf(floored, { implementationYearByCode: { xfloor: '2030-31' } });
    expect(late.receipts['2029-30'] ?? 0).toBe(0);
    expect(late.receipts['2030-31']).toBeCloseTo(1000, 6);
    const game = { implementationYear: '2027-28' };
    expect(effectiveStartYear(floored, game)).toBe('2029-30');
    expect(
      effectiveStartYear(floored, { ...game, implementationYearByCode: { xfloor: '2028-29' } }),
    ).toBe('2029-30');
    const free = measure('xfree');
    expect(
      effectiveStartYear(free, { ...game, implementationYearByCode: { xfree: '2029-30' } }),
    ).toBe('2029-30');
    expect(effectiveStartYear(free, game)).toBe('2027-28');
  });

  it('the schema refuses a floor on a macro slider, or one without a source', () => {
    expect(() =>
      syntheticLever({
        code: 'xmacro',
        category: 'macro',
        earliestStart: floor('2028-29'),
        costing: { kind: 'sensitivity', sensitivityId: 'gilt-rates' },
      }),
    ).toThrow(/a macro slider has no start year to wait for/);
    expect(() => measure('xbare', '2030-31')).not.toThrow();
    expect(() =>
      syntheticLever({
        code: 'xbare',
        earliestStart: { ...floor('2030-31'), sources: [] },
        costing: { kind: 'schedule', effect: EVERY_YEAR, source: { sourceId: 'x' }, caveats: [] },
      }),
    ).toThrow(/earliestStart/);
  });

  it('validate:data refuses a floor outside the forecast', () => {
    const tampered = structuredClone(ds);
    const floored = tampered.levers.find((l) => l.earliestStart);
    if (!floored?.earliestStart) throw new Error('the data has no lever with a floor');
    floored.earliestStart = { ...floored.earliestStart, year: '2031-32' };
    expect(validateDataset(tampered).some((p) => /cannot start/.test(p))).toBe(true);
  });

  it('a measure that starts after the target year leaves its headroom alone, and says when it starts', () => {
    const later = measure('xlater', '2030-31');
    const headroom = (values: Record<string, number>) =>
      run(values, {}, [later]).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
    expect(headroom({ xlater: 1 })).toBeCloseTo(headroom({}), 0);
    const row = run({ xlater: 1 }, {}, [later]).attribution.find((r) => r.code === 'xlater');
    expect(row?.fromYear).toBe('2030-31');
    expect(row?.psnbGbpm).toBe(0);
    // A card that starts in the game's first year has no "from".
    for (const code of Object.keys(PENNY)) {
      expect(run(PENNY).attribution.find((r) => r.code === code)?.fromYear, code).toBeUndefined();
    }
  });
});

describe('a later start for one measure (the seam every floor uses, Phase 8)', () => {
  it('zeroes the early years of a schedule and leaves the later ones alone', () => {
    const schedule = measure('xsched');
    const now = effectOf(schedule);
    const later = effectOf(schedule, { implementationYearByCode: { xsched: '2028-29' } });
    expect(now.receipts['2027-28']).toBeGreaterThan(0);
    expect(later.receipts['2027-28'] ?? 0).toBe(0);
    expect(later.receipts['2029-30']).toBeCloseTo(now.receipts['2029-30'] ?? 0, 6);
  });

  it('delays only the named lever, and a share-of-baseline lever the same way', () => {
    const budget = (code: string) =>
      syntheticLever({
        code,
        category: 'spend',
        badge: 'mechanical',
        control: { unit: 'pct' },
        classification: { side: 'spending' },
        costing: {
          kind: 'pctOfBaseline',
          baseline: { from: 'vintage', series: 'rdel' },
          source: { sourceId: 'obr-efo-2026-03' },
          caveats: [],
        },
      });
    const levers = [budget('xone'), budget('xtwo')];
    const later = run(
      { xone: 2, xtwo: 2 },
      { implementationYearByCode: { xone: '2028-29' } },
      levers,
    );
    const one = later.leverEffects.find((e) => e.code === 'xone');
    const two = later.leverEffects.find((e) => e.code === 'xtwo');
    expect(one?.currentSpending['2027-28'] ?? 0).toBe(0);
    expect(one?.currentSpending['2028-29']).toBeGreaterThan(0);
    expect(two?.currentSpending['2027-28']).toBeGreaterThan(0);
    expect(later.settings.implementationYearByCode).toEqual({ xone: '2028-29' });
  });
});
