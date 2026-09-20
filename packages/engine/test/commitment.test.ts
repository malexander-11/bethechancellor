import { describe, expect, it } from 'vitest';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();

describe('protected and unprotected departments', () => {
  it('tags the nine department levers, and nothing else, sourced to the OBR', () => {
    const tagged = ds.levers.filter((l) => l.commitment);
    const protectedCodes = tagged
      .filter((l) => l.commitment?.kind === 'protected')
      .map((l) => l.code);
    const unprotectedCodes = tagged
      .filter((l) => l.commitment?.kind === 'unprotected')
      .map((l) => l.code);
    expect(protectedCodes.sort()).toEqual(['dfe', 'dhsc', 'mod']);
    expect(unprotectedCodes.sort()).toEqual(['dft', 'fcdo', 'home', 'mhclg', 'moj', 'otherd']);
    for (const l of tagged) {
      expect(l.group).toBe('Day-to-day departmental budgets');
      expect(l.commitment?.sources.map((s) => s.sourceId)).toEqual(['obr-efo-2026-03']);
    }
  });

  it('records what has been decided since the forecast, each on a registered source', () => {
    const context = ds.contexts?.[0];
    expect(context?.decisionsSinceForecast).toHaveLength(3);
    const ids = new Set(ds.sources.sources.map((s) => s.id));
    for (const d of context?.decisionsSinceForecast ?? []) {
      expect(d.amountGbpm).toBeLessThan(0);
      for (const s of d.sources) expect(ids.has(s.sourceId), s.sourceId).toBe(true);
    }
  });
});
