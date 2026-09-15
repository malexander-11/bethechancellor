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
      expect(checkRawSourceConsistency(lever, extracted, ds.vintage)).toEqual([]);
    },
  );

  const spendingLevers = ds.levers.filter(
    (l) => l.category === 'spend' || l.category === 'welfare',
  );

  it('covers the planned spending set', () => {
    expect(spendingLevers.length).toBe(19);
    expect(spendingLevers.every((l) => l.group && l.classification?.side === 'spending')).toBe(
      true,
    );
    expect(
      spendingLevers
        .filter((l) => l.badge === 'direct')
        .map((l) => l.code)
        .sort(),
    ).toEqual(['chb', 'rv2ch', 'rveff', 'rvpip', 'rvwfp']);
  });

  it.each(spendingLevers.map((l) => [l.id, l] as const))(
    '%s matches its cited Spending Review rows, HMRC rows or scorecard lines',
    (_id, lever) => {
      expect(checkRawSourceConsistency(lever, extracted, ds.vintage)).toEqual([]);
    },
  );

  it('detects a tampered Spending Review baseline, a sign-flipped spending toggle and a wrong-sign HMRC spending row', () => {
    const health = structuredClone(spendingLevers.find((l) => l.code === 'dhsc'));
    if (
      !health ||
      health.costing.kind !== 'pctOfBaseline' ||
      health.costing.baseline.from !== 'published'
    )
      throw new Error('missing dhsc');
    health.costing.baseline.values['2028-29'] =
      (health.costing.baseline.values['2028-29'] ?? 0) + 10;
    expect(checkRawSourceConsistency(health, extracted, ds.vintage).length).toBeGreaterThan(0);
    const other = structuredClone(spendingLevers.find((l) => l.code === 'otherd'));
    if (
      !other ||
      other.costing.kind !== 'pctOfBaseline' ||
      other.costing.baseline.from !== 'published'
    )
      throw new Error('missing otherd');
    if (other.costing.baseline.rawSource.kind === 'hmtSr25')
      other.costing.baseline.rawSource.rows.pop();
    expect(checkRawSourceConsistency(other, extracted, ds.vintage).length).toBeGreaterThan(0);
    const toggle = structuredClone(spendingLevers.find((l) => l.code === 'rv2ch'));
    if (!toggle || toggle.costing.kind !== 'schedule') throw new Error('missing rv2ch');
    toggle.costing.effect['2029-30'] = 3095;
    expect(checkRawSourceConsistency(toggle, extracted, ds.vintage).length).toBeGreaterThan(0);
    const cb = structuredClone(spendingLevers.find((l) => l.code === 'chb'));
    if (!cb || cb.costing.kind !== 'linearPerUnit') throw new Error('missing chb');
    cb.costing.perUnit['2026-27'] = -565;
    expect(checkRawSourceConsistency(cb, extracted, ds.vintage).length).toBeGreaterThan(0);
  });

  it('detects a tampered figure', () => {
    const lever = structuredClone(taxLevers.find((l) => l.code === 'itbr'));
    if (!lever || lever.costing.kind !== 'linearPerUnit') throw new Error('missing itbr');
    lever.costing.perUnit['2028-29'] = 9000;
    expect(checkRawSourceConsistency(lever, extracted, ds.vintage).length).toBeGreaterThan(0);
    const toggle = structuredClone(taxLevers.find((l) => l.code === 'rvfrz'));
    if (!toggle || toggle.costing.kind !== 'schedule') throw new Error('missing rvfrz');
    toggle.costing.effect['2029-30'] = -1;
    expect(checkRawSourceConsistency(toggle, extracted, ds.vintage).length).toBeGreaterThan(0);
  });
});
