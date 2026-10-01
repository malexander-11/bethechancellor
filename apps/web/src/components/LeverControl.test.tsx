import { describe, expect, it } from 'vitest';
import { levers } from '../data';
import {
  formatLeverValue,
  formatLeverValueShort,
  levelChange,
  plannedWords,
  sizeWords,
  takesOutWords,
} from './LeverControl';

const lever = (code: string) => {
  const found = levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing ${code}`);
  return found;
};

/**
 * The words the rows are built from (ADR-0037): the card they once drew went with the rows in one
 * card a decision, and these stay, shared with the review and step 3's cards.
 */
describe('the lever helpers', () => {
  it('formats pence, points, per cent and pounds', () => {
    expect(formatLeverValue(lever('itbr'), -1)).toBe('−1p');
    // A point, never "pp" (Phase 25).
    expect(formatLeverValue(lever('nicm'), 0.5)).toBe('+0.5 points');
    expect(formatLeverValueShort(lever('nicm'), 1)).toBe('+1 point');
    expect(formatLeverValue(lever('fuel'), 10)).toBe('+10%');
    expect(formatLeverValue(lever('nicpt'), 1040)).toBe('+£1,040');
  });

  it('names a level the way its radio does, and where the lever is planned to be', () => {
    expect(sizeWords(lever('vats'), 2)).toBe('22%');
    expect(sizeWords(lever('iht'), -40)).toBe('Abolish (0%)');
    expect(sizeWords(lever('dhsc'), -1)).toBe('1% less');
    expect(sizeWords(lever('dhsc'), 5)).toBe('5% more');
    expect(plannedWords(lever('vats'))).toBe('20% as planned');
    // A lever with no level of its own is simply as planned.
    expect(plannedWords(lever('brates'))).toBe('As planned');
  });

  it('shows the level a setting moves to, and growth after rising prices for a budget', () => {
    expect(levelChange(lever('itbr'), 1)).toEqual({ from: '20%', to: '21%' });
    expect(levelChange(lever('iht'), -40)?.to).toBe('0%');
    // A budget leads with growth a year after rising prices, the plan beside it (Phase 25); its
    // cash waits in its card's fold.
    const health = levelChange(lever('dhsc'), 2);
    expect(health?.from).toBe('£232.0bn');
    expect(health?.to).toBe('£236.6bn');
    expect(health?.note).toBe('in 2028-29');
    expect(health?.real?.span).toBe('2026-27 to 2028-29');
    expect(health?.real?.fromPct).toBeCloseTo(2.9, 1);
    expect(health?.real?.toPct).toBeCloseTo(3.9, 1);
    expect(levelChange(lever('rvfrz'), 1)).toBeNull();
  });

  it('says what choosing takes out, of a tick or of a level (ADR-0036)', () => {
    expect(takesOutWords(['Food'], 'tick')).toBe('Choosing this takes out “Food”.');
    expect(takesOutWords(['Food', 'New homes', 'Books'], 'scale')).toBe(
      'Choosing a level here takes out “Food”, “New homes” and “Books”.',
    );
  });
});
