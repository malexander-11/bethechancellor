import { describe, expect, it } from 'vitest';
import { formatGbp, formatGbpBn, formatPct, perHousehold } from '../src/index.js';

describe('display formatting', () => {
  it('formats £ million as £bn with a proper minus sign', () => {
    expect(formatGbpBn(23600)).toBe('£23.6bn');
    expect(formatGbpBn(-3300)).toBe('−£3.3bn');
    expect(formatGbpBn(15000, 0, true)).toBe('+£15bn');
    expect(formatGbpBn(0.4, 1, true)).toBe('£0.0bn');
    expect(formatGbpBn(Number.NaN)).toBe('n/a');
  });

  it('formats percentages and per-household amounts', () => {
    expect(formatPct(0.672)).toBe('0.7%');
    expect(formatPct(-0.7, 1, true, 'pp')).toBe('−0.7pp');
    expect(perHousehold(23600, 28_600_000)).toBe(830);
    expect(formatGbp(830)).toBe('£830');
    expect(formatGbp(-1234, true)).toBe('−£1,234');
  });
});
