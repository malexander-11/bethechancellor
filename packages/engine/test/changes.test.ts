import { describe, expect, it } from 'vitest';
import { changeRows, type ChangeRow, type ChangeRowsInput } from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  HEALTH_CUT,
  INVESTMENT,
  PENNY,
  TWO_CHILD_LIMIT,
  WALK,
  todaysEstimate,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const estimate = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds);
const rows = (budget: Budget, input: Partial<ChangeRowsInput> = {}) =>
  changeRows({ outcome: outcomeOf({ ...estimate, ...budget }), levers: ds.levers, ...input });
const row = (budget: Budget, code: string): ChangeRow => {
  const found = rows(budget).find((r) => r.code === code);
  if (!found) throw new Error(`no row for ${code}`);
  return found;
};

describe('a moved lever read back', () => {
  it('says what a tax raises or costs in the target year, at its new level', () => {
    const rise = row(PENNY, 'itbr');
    expect(rise).toMatchObject({ side: 'tax', standing: '21%', tone: 'better' });
    expect(rise.words).toMatch(/^raises £\d+\.\dbn$/);
    expect(rise.gbpm).toBeGreaterThan(0);
    const cut = row(BASIC_RATE_CUT, 'itbr');
    expect(cut).toMatchObject({ side: 'tax', standing: '18%', tone: 'worse' });
    expect(cut.words).toMatch(/^costs £\d+\.\dbn$/);
    expect(cut.gbpm).toBeLessThan(0);
  });

  it('says what spending costs or saves, as a share of its budget, and investment as investment', () => {
    const cut = row(HEALTH_CUT, 'dhsc');
    expect(cut).toMatchObject({ side: 'spending', standing: '5% less', tone: 'better' });
    expect(cut.words).toMatch(/^saves £\d+\.\dbn$/);
    const investment = row(INVESTMENT, 'cdel');
    expect(investment).toMatchObject({ standing: '10% more', tone: 'worse' });
    expect(investment.words).toMatch(/^adds £\d+\.\dbn of investment$/);
  });

  it('gives a tick box no standing, and a benefit is spending', () => {
    const limit = row(TWO_CHILD_LIMIT, 'rv2ch');
    expect(limit.side).toBe('spending');
    expect(limit.standing).toBeUndefined();
  });

  it('reads back every lever moved, in the data’s order, and never the economy', () => {
    // Today's estimate moves the economy's own levers: they are not the Budget's choices.
    expect(rows({}).map((r) => r.code)).toEqual([]);
    const order = ds.levers.map((l) => l.code).filter((code) => code in WALK);
    expect(rows(WALK).map((r) => r.code)).toEqual(order);
  });

  it('names a lever by the name given, else its short title, and leaves out what is excluded', () => {
    expect(rows(PENNY)[0]?.name).toBe(ds.levers.find((l) => l.code === 'itbr')?.shortTitle);
    expect(rows(PENNY, { names: () => 'A penny on the basic rate' })[0]?.name).toBe(
      'A penny on the basic rate',
    );
    expect(rows(WALK, { exclude: new Set(['itbr']) }).map((r) => r.code)).not.toContain('itbr');
  });
});
