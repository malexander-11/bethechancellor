import { describe, expect, it } from 'vitest';
import {
  computeOutcome,
  finetuneItems,
  growthNote,
  parseLever,
  parsePm,
  priorityScale,
  receptions,
  suggestedSettings,
} from '../src/index.js';
import { loadDataset, outcomeOfFor, readJson } from './fixtures.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const ESTIMATE = suggestedSettings(context.readings, ds.levers);
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);
const run = (policy: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE } },
  });
const lateBand = (policy: Record<string, number>) =>
  receptions({
    outcome: run(policy),
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    outcomeOf,
    pm: ds.pm,
    incidence: ds.incidence,
  })
    .find((r) => r.audience === 'markets')
    ?.all.find((r) => r.rule === 'mk-late-yield');

/** The feedback made wider (Phase 25, R21): growth, interest, timing, climate and scale. */
describe('wider feedback (Phase 25, R21)', () => {
  it('says what the biggest measure may do to growth, or that the game does not model it', () => {
    const ct = growthNote(run({ ct: 1 }), ds.levers, '2029-30');
    expect(ct?.leverTitle).toBe('Corporation tax');
    expect(ct?.text).toMatch(/effects on investment and the wider economy/);
    // No moved measure has a note on growth: the tool's own note says it is not modelled.
    const none = growthNote(run({ moj: 10 }), ds.levers, '2029-30');
    expect(none?.text).toMatch(/^Your own choices can affect growth/);
    // Only a macro note speaks to growth.
    const json = readJson('levers/tax/corporation-tax-rate.json') as {
      considerations: { kind: string; growth?: boolean }[];
    };
    const tampered = structuredClone(json);
    const note = tampered.considerations.find((c) => c.growth);
    if (!note) throw new Error('no growth note on corporation tax');
    note.kind = 'behavioural';
    expect(() => parseLever(tampered)).toThrow(/only a macro note speaks to growth/);
  });

  it('marks money that arrives late with the markets, and moves no rating by it', () => {
    // CGT like income raises nothing before 2028-29; the penny raises from the first year.
    const late = lateBand({ cgtalign: 1, itbr: 1 });
    expect(late?.points).toBe(0);
    expect(late?.text).toMatch(
      /^\d+% of the new tax money in 2029-30 waits until 2028-29 or later\. The markets will want to see it arrive\.$/,
    );
    expect(lateBand({ itbr: 1 })?.text).toBe(
      'No new tax money waits until 2028-29 or later to arrive.',
    );
    expect(lateBand({})?.points).toBe(0);
  });

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
    expect(advice('rvfuel')?.text).toMatch(/emissions dip/);
    cites('rvfuel', 'hmrc-tiin-fuel-duty-2026-27');
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
