import { describe, expect, it } from 'vitest';
import type { Lever, Settings } from '../src/index.js';
import {
  computeOutcome,
  effectiveStartYear,
  fyStart,
  leverSchema,
  policyYearsOf,
  validateDataset,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const lever = (code: string): Lever => {
  const l = ds.levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};
const run = (values: Record<string, number>, settings: Partial<Settings> = {}) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values, implementationYear: '2027-28', ...settings },
  });
const effectOf = (values: Record<string, number>, code: string, settings?: Partial<Settings>) => {
  const e = run(values, settings).leverEffects.find((x) => x.code === code);
  if (!e) throw new Error(`no effect for ${code}`);
  return e;
};
const size = (
  e: { receipts: Record<string, number>; currentSpending: Record<string, number> },
  y: string,
) => Math.abs(e.receipts[y] ?? 0) + Math.abs(e.currentSpending[y] ?? 0);

/** The cards whose sources say they cannot take effect from April 2027 (ADR-0021). */
const EARLIEST: Record<string, string> = {
  wealth: '2030-31',
  wealth2: '2030-31',
  sugsalt: '2029-30',
  qelevy: '2028-29',
  ctgh: '2029-30',
  nicrent: '2028-29',
  cta: '2028-29',
  csjmh: '2029-30',
  dlakids: '2030-31',
  uitime: '2030-31',
  cgtalign: '2028-29',
  cgtdth: '2028-29',
  cgtexit: '2028-29',
};

describe('nothing before it can start (ADR-0021)', () => {
  it('exactly these cards carry a sourced earliest start, inside the forecast, named in the headline', () => {
    const tagged = Object.fromEntries(
      ds.levers.filter((l) => l.earliestStart).map((l) => [l.code, l.earliestStart?.year]),
    );
    expect(tagged).toEqual(EARLIEST);
    const years = policyYearsOf(ds.vintage);
    for (const l of ds.levers) {
      if (!l.earliestStart) continue;
      expect(years, l.code).toContain(l.earliestStart.year);
      expect(l.earliestStart.sources.length, l.code).toBeGreaterThan(0);
      expect(l.headline ?? '', l.code).toContain(l.earliestStart.year);
    }
  });

  it('counts nothing before the floor and the full figure from it, however early the Budget starts everything else', () => {
    for (const [code, start] of Object.entries(EARLIEST)) {
      const e = effectOf({ [code]: 1 }, code, { implementationYear: '2026-27' });
      for (const y of policyYearsOf(ds.vintage)) {
        if (fyStart(y) < fyStart(start)) expect(size(e, y), `${code} ${y}`).toBe(0);
      }
      expect(size(e, start), code).toBeGreaterThan(0);
    }
  });

  it('a delay earlier than the floor changes nothing; a later one wins', () => {
    const early = effectOf({ wealth2: 1 }, 'wealth2', {
      implementationYearByCode: { wealth2: '2028-29' },
    });
    expect(early.receipts['2028-29'] ?? 0).toBe(0);
    expect(early.receipts['2029-30'] ?? 0).toBe(0);
    expect(early.receipts['2030-31']).toBeCloseTo(18500, 6);
    const late = effectOf({ nicrent: 1 }, 'nicrent', {
      implementationYearByCode: { nicrent: '2029-30' },
    });
    expect(late.receipts['2028-29'] ?? 0).toBe(0);
    expect(late.receipts['2029-30']).toBeCloseTo(3000, 6);
    expect(effectiveStartYear(lever('wealth'), { implementationYear: '2027-28' })).toBe('2030-31');
    expect(
      effectiveStartYear(lever('wealth'), {
        implementationYear: '2027-28',
        implementationYearByCode: { wealth: '2028-29' },
      }),
    ).toBe('2030-31');
    expect(
      effectiveStartYear(lever('itbr'), {
        implementationYear: '2027-28',
        implementationYearByCode: { itbr: '2029-30' },
      }),
    ).toBe('2029-30');
    expect(effectiveStartYear(lever('itbr'), { implementationYear: '2027-28' })).toBe('2027-28');
  });

  it('the schema refuses a floor on a macro slider, or one without a source', () => {
    const macro: Lever = {
      ...lever('rate'),
      earliestStart: { year: '2028-29', text: 'x', sources: [{ sourceId: 'obr-efo-2026-03' }] },
    };
    expect(leverSchema.safeParse(macro).success).toBe(false);
    const bare: Lever = {
      ...lever('wealth'),
      earliestStart: { year: '2030-31', text: 'x', sources: [] },
    };
    expect(leverSchema.safeParse(bare).success).toBe(false);
  });

  it('validate:data refuses a floor outside the forecast', () => {
    const tampered = structuredClone(ds);
    const w = tampered.levers.find((l) => l.code === 'wealth');
    if (!w?.earliestStart) throw new Error('wealth carries a floor');
    w.earliestStart = { ...w.earliestStart, year: '2031-32' };
    expect(validateDataset(tampered).some((p) => /cannot start/.test(p))).toBe(true);
  });

  it('a wealth tax leaves 2029-30 headroom alone, and the running list says when it starts', () => {
    const headroom = (values: Record<string, number>) =>
      run(values).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
    expect(headroom({ wealth: 1 })).toBeCloseTo(headroom({}), 0);
    const row = run({ wealth: 1 }).attribution.find((r) => r.code === 'wealth');
    expect(row?.fromYear).toBe('2030-31');
    expect(row?.psnbGbpm).toBe(0);
    // A card that starts in the game's first year has no "from".
    expect(run({ itbr: 1 }).attribution.find((r) => r.code === 'itbr')?.fromYear).toBeUndefined();
  });
});
