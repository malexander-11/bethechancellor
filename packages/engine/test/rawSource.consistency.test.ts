import { describe, expect, it } from 'vitest';
import { checkRawSourceConsistency, type Lever, type RawSource } from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

const ds = loadDataset();
const extracted = loadExtracts();

/** What a lever's figures cite: its costing's published rows or lines, or its baseline's. */
function rawSourceOf(lever: Lever): RawSource | undefined {
  const costing = lever.costing;
  if (costing.kind === 'pctOfBaseline') {
    return costing.baseline.from === 'published' ? costing.baseline.rawSource : undefined;
  }
  return 'rawSource' in costing ? costing.rawSource : undefined;
}

/**
 * A published row or line reproduced as it stands: HMRC's ready reckoner once over, HMRC's cost of
 * a relief, a Treasury scorecard line reversed, a Spending Review settlement.
 */
function reproducesAPublishedFigure(raw: RawSource | undefined): boolean {
  switch (raw?.kind) {
    case 'hmrcReadyReckoner':
      return (raw.multiplier ?? 1) === 1;
    case 'hmtScorecard':
      return raw.direction === 'reverse';
    case 'hmrcReliefCost':
    case 'hmtSr25':
      return true;
    default:
      return false;
  }
}

describe('every lever is badged for what its costing is (ADR-0017)', () => {
  const policyLevers = ds.levers.filter((l) => l.category !== 'macro');

  it('calls a figure direct only when it reproduces a published row or line as it stands', () => {
    // A certified row is direct; a share of an OBR line, or a stated sum or multiple of official
    // figures with no judgement in it, is mechanical; our own arithmetic that rests on a choice
    // is an assumption, and a repeat of a Treasury measure assumes it raises what it raised.
    for (const l of policyLevers) {
      const raw = rawSourceOf(l);
      if (l.badge === 'direct') expect(reproducesAPublishedFigure(raw), l.code).toBe(true);
      if (l.costing.kind === 'pctOfBaseline') expect(l.badge, l.code).toBe('mechanical');
      if (raw?.kind === 'hmtScorecard' && raw.direction === 'repeat') {
        expect(l.badge, l.code).toBe('assumption');
      }
    }
    // Our own arithmetic, or a multiple of HMRC's rows, would not pass for a published figure.
    const ours = policyLevers
      .map(rawSourceOf)
      .filter((raw) => raw?.kind === 'derivedFromPublished');
    expect(ours.length).toBeGreaterThan(0);
    for (const raw of ours) expect(reproducesAPublishedFigure(raw)).toBe(false);
    expect(
      reproducesAPublishedFigure({
        kind: 'hmrcReadyReckoner',
        sourceId: 'hmrc-trr-2025-06',
        years: ['2026-27', '2027-28', '2028-29'],
        rows: [],
        multiplier: 1.25,
      }),
    ).toBe(false);
  });

  it('names what every figure assumes, and sources every consideration', () => {
    for (const l of policyLevers) {
      expect(l.group, l.code).toBeTruthy();
      if (l.costing.kind !== 'sensitivity' && l.badge !== 'direct') {
        expect(l.costing.caveats.length, l.code).toBeGreaterThan(0);
      }
      if (!l.deprecated) expect(l.considerations.length, l.code).toBeGreaterThan(0);
      for (const c of l.considerations)
        expect(c.sources.length, `${l.code} ${c.id}`).toBeGreaterThan(0);
    }
  });

  it('keeps every spending and welfare lever on the spending side', () => {
    for (const l of policyLevers) {
      if (l.category !== 'tax') expect(l.classification?.side, l.code).toBe('spending');
    }
  });
});

describe('every direct costing reproduces from the extracted published tables', () => {
  const taxLevers = ds.levers.filter((l) => l.category === 'tax');

  it.each(taxLevers.map((l) => [l.id, l] as const))(
    '%s matches its cited rows or lines',
    (_id, lever) => {
      expect(checkRawSourceConsistency(lever, extracted, ds.vintage)).toEqual([]);
    },
  );

  const spendingLevers = ds.levers.filter(
    (l) => l.category === 'spend' || l.category === 'welfare',
  );

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
