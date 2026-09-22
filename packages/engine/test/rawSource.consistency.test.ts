import { describe, expect, it } from 'vitest';
import { checkRawSourceConsistency } from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();

describe('every direct costing reproduces from the extracted published tables', () => {
  const taxLevers = ds.levers.filter((l) => l.category === 'tax');

  it('covers the planned core set', () => {
    expect(taxLevers.length).toBe(56);
    expect(taxLevers.every((l) => l.group)).toBe(true);
    // A share of an OBR receipts line is mechanical arithmetic; a certified row is direct; our own
    // arithmetic on published figures is an assumption and says so on the card (ADR-0017).
    const mechanical = taxLevers.filter((l) => l.badge === 'mechanical').map((l) => l.code);
    expect(mechanical.sort()).toEqual(['brates']);
    for (const l of taxLevers) {
      expect(l.badge === 'mechanical', `${l.code}`).toBe(l.costing.kind === 'pctOfBaseline');
    }
    expect(taxLevers.filter((l) => l.badge === 'direct')).toHaveLength(41);
    expect(
      taxLevers
        .filter((l) => l.badge === 'assumption')
        .map((l) => l.code)
        .sort(),
    ).toEqual([
      'bank5',
      'cgtdth',
      'epl2',
      'gam2',
      'hmrc2',
      'hscl',
      'hvcts15',
      'iinc2',
      'it50',
      'nicllp',
      'pens30',
      'vatelec',
      'vatgas',
      'wealth',
    ]);
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
    // Every file in the two folders, the five kept for the record included (ADR-0017).
    expect(spendingLevers.length).toBe(32);
    expect(spendingLevers.every((l) => l.group && l.classification?.side === 'spending')).toBe(
      true,
    );
    expect(
      spendingLevers
        .filter((l) => l.deprecated)
        .map((l) => l.code)
        .sort(),
    ).toEqual(['aid07', 'chb', 'def5', 'freeuni', 'nonuk', 'water']);
    expect(spendingLevers.filter((l) => l.group === 'Shelved').every((l) => l.deprecated)).toBe(
      true,
    );
    expect(
      spendingLevers
        .filter((l) => l.badge === 'direct')
        .map((l) => l.code)
        .sort(),
    ).toEqual(['chb', 'rv2ch', 'rveff', 'rvpip', 'rvplan2', 'rvwfp']);
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

  it('detects a tampered milestone', () => {
    const health = structuredClone(ds.levers.find((l) => l.code === 'dhsc'));
    if (!health?.milestones) throw new Error('missing dhsc milestones');
    const cited = health.milestones.find((m) => m.from);
    if (!cited) throw new Error('no milestone cites a table');
    cited.value += 1;
    expect(checkRawSourceConsistency(health, extracted, ds.vintage).length).toBeGreaterThan(0);
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
