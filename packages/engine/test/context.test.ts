import { describe, expect, it } from 'vitest';
import { fyOfDate, validateDataset, type ContextFile } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();

function latestContext(): ContextFile {
  const latest = ds.contexts[ds.contexts.length - 1];
  if (!latest) throw new Error('no context');
  return latest;
}
const context = latestContext();

/** The dataset's problems with the context changed by `patch`. */
function tamper(patch: (c: ContextFile) => void): string {
  const copy: ContextFile = structuredClone(context);
  patch(copy);
  return validateDataset({ ...ds, contexts: [copy] }).join('\n');
}

describe('the briefing’s published figures (Phase 28, ADR-0030)', () => {
  it('reads two figures, each quoted from its source, and is clean', () => {
    const briefing = context.briefing;
    expect(briefing?.averageHeadroom.gbpm).toBe(29_000);
    expect(briefing?.averageHeadroom.since).toBe('2010');
    expect(briefing?.averageHeadroom.source.sourceId).toBe('obr-efo-2025-11');
    expect(briefing?.averageHeadroom.source.quote).toMatch(/around £29 billion/);
    expect(briefing?.giltSales.gbpm).toBe(246_200);
    expect(briefing?.giltSales.source.sourceId).toBe('dmo-remit-2026-04');
    expect(briefing?.giltSales.source.quote).toMatch(/gilt sales of £246\.2 billion/);
    expect(validateDataset(ds).filter((p) => /briefing/.test(p))).toEqual([]);
  });

  it('keeps "this year" true: the gilt sales are for the year the context is dated in', () => {
    expect(context.briefing?.giltSales.year).toBe(fyOfDate(context.asOf));
    expect(tamper((c) => (c.asOf = '2027-04-01'))).toMatch(
      /briefing gilt sales are for 2026-27, not 2027-28, the year it is dated in/,
    );
    expect(tamper((c) => (c.briefing!.giltSales.year = '2025-26'))).toMatch(
      /briefing gilt sales are for 2025-26, not 2026-27/,
    );
  });

  it('refuses a figure with no quote, or a source the registry does not hold', () => {
    expect(tamper((c) => delete c.briefing!.averageHeadroom.source.quote)).toMatch(
      /briefing average headroom quotes nothing from its source/,
    );
    expect(tamper((c) => delete c.briefing!.giltSales.source.quote)).toMatch(
      /briefing gilt sales quotes nothing from its source/,
    );
    expect(tamper((c) => (c.briefing!.giltSales.source.sourceId = 'dmo-remit-nosuch'))).toMatch(
      /dmo-remit-nosuch/,
    );
  });
});

describe('the fiscal year of a date', () => {
  it('turns on 1 April', () => {
    expect(fyOfDate('2027-03-31')).toBe('2026-27');
    expect(fyOfDate('2027-04-01')).toBe('2027-28');
    expect(fyOfDate('2026-09-22')).toBe('2026-27');
    expect(fyOfDate('2027-01-01')).toBe('2026-27');
    expect(() => fyOfDate('22 September 2026')).toThrow(/invalid date/);
  });
});
