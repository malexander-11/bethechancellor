import { describe, expect, it } from 'vitest';
import { finetuneItems, parsePm, priorityScale } from '../src/index.js';
import { loadDataset, outcomeOfFor, readJson } from './fixtures.js';
import { todaysEstimate } from './scenarios.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const ESTIMATE = todaysEstimate(ds);

/** The feedback made wider (Phase 25, R21): the scale of the priorities, climate and more. */
describe('wider feedback (Phase 25, R21)', () => {
  it('gives the scale of the priorities: one full way each, and which saves money', () => {
    const scale = priorityScale({
      pm: ds.pm,
      options: ds.options,
      levers: ds.levers,
      outcomeOf,
      current: ESTIMATE,
    });
    expect(scale.year).toBe('2029-30');
    // The defence plan's gap is the cheapest; health above its plan the dearest (one price each).
    expect(Math.round((scale.costs?.minGbpm ?? 0) / 100) / 10).toBe(0.8);
    expect(Math.round((scale.costs?.maxGbpm ?? 0) / 100) / 10).toBe(8.1);
    expect(scale.saves).toEqual(['welfare-bill']);
  });

  it('says a word on climate where a registered source does, both ways', () => {
    const advice = (code: string) =>
      finetuneItems(ds.finetune).find((i) => i.code === code)?.policies[0]?.advice;
    const cites = (code: string, id: string) =>
      expect(
        advice(code)?.sources.map((s) => s.sourceId),
        code,
      ).toContain(id);
    // Keeping fuel duty down adds a little to emissions; raising it takes a little off (HMRC).
    expect(advice('fuelfrz')?.text).toMatch(/emissions edge up/);
    cites('fuelfrz', 'hmrc-tiin-fuel-duty-2026-27');
    expect(advice('fuel')?.text).toMatch(/emissions dip/);
    cites('fuel', 'hmrc-tiin-fuel-duty-2026-27');
    const cut = ds.options.deliver.find((o) => o.id === 'fuel-duty-cut');
    expect(cut?.advice.text).toMatch(/emissions edge up/);
    expect(cut?.advice.sources.map((s) => s.sourceId)).toContain('hmrc-tiin-fuel-duty-2026-27');
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
