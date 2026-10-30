import { describe, expect, it } from 'vitest';
import { finetuneItems, parsePm } from '../src/index.js';
import { loadDataset, readJson } from './fixtures.js';

const ds = loadDataset();

/** The feedback made wider (Phase 25, R21): climate and more. */
describe('wider feedback (Phase 25, R21)', () => {
  it('says a word on climate where a registered source does, both ways', () => {
    const advice = (code: string) =>
      finetuneItems(ds.finetune).find((i) => i.code === code)?.policies[0]?.advice;
    const cites = (code: string, id: string) =>
      expect(
        advice(code)?.sources.map((s) => s.sourceId),
        code,
      ).toContain(id);
    // Raising fuel duty sooner, or further, takes a little off emissions (HMRC); keeping it down
    // adds a little.
    expect(advice('b6fuel')?.text).toMatch(/emissions dip/);
    cites('b6fuel', 'hmrc-tiin-fuel-duty-2026-27');
    expect(advice('fuel')?.text).toMatch(/emissions dip/);
    cites('fuel', 'hmrc-tiin-fuel-duty-2026-27');
    // A few pounds a ticket barely changes emissions (HMRC).
    expect(advice('apd')?.text).toMatch(/barely changes emissions either way/);
    cites('apd', 'hmrc-tiin-apd-2026-27');
    // Car tax's standard rate is the same whatever a car emits (gov.uk).
    expect(advice('ved')?.text).toMatch(/whatever it emits/);
    cites('ved', 'govuk-ved-rate-tables');
    expect(advice('otherd')?.text).toMatch(/energy and net zero/);
  });

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
