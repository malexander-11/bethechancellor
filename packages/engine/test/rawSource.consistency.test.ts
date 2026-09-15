import { describe, expect, it } from 'vitest';
import { checkRawSourceConsistency } from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();

describe('every direct costing reproduces from the extracted published tables', () => {
  const taxLevers = ds.levers.filter((l) => l.category === 'tax');

  it('covers the planned core set', () => {
    expect(taxLevers.length).toBe(23);
    expect(taxLevers.every((l) => l.badge === 'direct' && l.group)).toBe(true);
  });

  it.each(taxLevers.map((l) => [l.id, l] as const))(
    '%s matches its cited rows or lines',
    (_id, lever) => {
      expect(checkRawSourceConsistency(lever, extracted)).toEqual([]);
    },
  );

  it('detects a tampered figure', () => {
    const lever = structuredClone(taxLevers.find((l) => l.code === 'itbr'));
    if (!lever || lever.costing.kind !== 'linearPerUnit') throw new Error('missing itbr');
    lever.costing.perUnit['2028-29'] = 9000;
    expect(checkRawSourceConsistency(lever, extracted).length).toBeGreaterThan(0);
    const toggle = structuredClone(taxLevers.find((l) => l.code === 'rvfrz'));
    if (!toggle || toggle.costing.kind !== 'schedule') throw new Error('missing rvfrz');
    toggle.costing.effect['2029-30'] = -1;
    expect(checkRawSourceConsistency(toggle, extracted).length).toBeGreaterThan(0);
  });
});
