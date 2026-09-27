import { describe, expect, it } from 'vitest';
import { budgetTheme } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();

describe('the theme of the Budget', () => {
  it('is written from the ranked priorities, in rank order, and from nothing else', () => {
    expect(budgetTheme(ds.pm, [])).toBeUndefined();
    expect(budgetTheme(ds.pm, ['defence'])).toBe('A Budget for defence');
    expect(budgetTheme(ds.pm, ['defence', 'cost-of-living'])).toBe(
      'A Budget for defence and the cost of living',
    );
    expect(budgetTheme(ds.pm, ['nhs', 'families', 'safer-streets'])).toBe(
      'A Budget for the NHS, families and safer streets',
    );
  });

  it('ignores a fourth priority and an id the data no longer carries', () => {
    expect(budgetTheme(ds.pm, ['defence', 'nhs', 'families', 'welfare-bill'])).toBe(
      'A Budget for defence, the NHS and families',
    );
    expect(budgetTheme(ds.pm, ['prisons', 'defence'])).toBe('A Budget for defence');
  });
});
