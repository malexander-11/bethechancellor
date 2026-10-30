import { describe, expect, it } from 'vitest';
import { parsePm } from '../src/index.js';
import { readJson } from './fixtures.js';

/** The feedback made wider (Phase 25, R21): the Prime Minister's sign-off. */
describe('wider feedback (Phase 25, R21)', () => {
  it('keeps the Prime Minister’s sign-off to twenty words, with no figure', () => {
    const json = readJson('journey/pm.json') as { signOff: Record<string, { text: string }> };
    const digit = structuredClone(json);
    if (digit.signOff.broken) digit.signOff.broken.text = 'Breaking {promises} costs £5bn.';
    expect(() => parsePm(digit)).toThrow(/signs off with no figure/);
    const long = structuredClone(json);
    if (long.signOff.strained)
      long.signOff.strained.text = `The words of {promises} still hold ${'and more '.repeat(10)}.`;
    expect(() => parsePm(long)).toThrow(/twenty words or fewer/);
  });
});
