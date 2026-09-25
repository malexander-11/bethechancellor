import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  computeOutcome,
  freshGame,
  macroCodesOf,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const MACRO = macroCodesOf(context.readings);

function speak(
  values: Record<string, number>,
  game?: GamePermalink,
  snapshot?: Record<string, number>,
) {
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values, implementationYear: '2027-28' },
  });
  return assembleSpeech({
    speech: ds.speech,
    outcome,
    levers: ds.levers,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) } : {}),
    pm: ds.pm,
    ...(snapshot ? { snapshot } : {}),
    macroCodes: MACRO,
    rabbitTitles: Object.fromEntries(ds.options.addOns.map((o) => [o.id, o.title])),
  });
}

describe('the speech', () => {
  it('is deterministic, stays inside its word budget, and repeats no fragment', () => {
    const game: GamePermalink = {
      ...freshGame(3),
      priorities: ['nhs', 'schools-send'],
      rabbit: ['meals'],
    };
    const values = {
      dhsc: 3,
      dfe: 5,
      mhclg: 5,
      ufsm: 1,
      itbr: 1,
      ct: 1,
      cgtalign: 1,
      fuel: -5,
      mod: -2,
    };
    const a = speak(values, game);
    const b = speak(values, game);
    expect(a).toEqual(b);
    expect(a.words).toBeLessThanOrEqual(300);
    const texts = a.paragraphs.map((p) => p.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(a.paragraphs.every((p) => p.badge === 'simulated')).toBe(true);
  });

  it('quotes only figures the engine produced, formatted as the scorecard formats them', () => {
    const game: GamePermalink = { ...freshGame(3), priorities: ['safer-streets'] };
    const s = speak({ moj: 10, itbr: 2, vats: 1 }, game);
    const figures = new Set(s.paragraphs.flatMap((p) => p.figures));
    for (const p of s.paragraphs) {
      for (const match of p.text.match(/[+−-]?£\d[\d,]*\.?\d*bn/g) ?? []) {
        expect(figures.has(match), `"${match}" is not an engine figure`).toBe(true);
      }
    }
    expect(figures.size).toBeGreaterThan(0);
  });

  it('follows the choices: the priority, its options, who pays, a broken promise and the add-on', () => {
    const game: GamePermalink = {
      ...freshGame(3),
      priorities: ['cost-of-living'],
      rabbit: ['fuel-cut'],
    };
    const s = speak({ ufsm: 1, bus2: 1, fuel: -5, ct: 1, it50: 1 }, game);
    const kinds = s.paragraphs.map((p) => p.kind);
    expect(kinds[0]).toBe('opening');
    expect(s.paragraphs[0]?.text).toMatch(/cost of living/);
    const priority = s.paragraphs.filter((p) => p.kind === 'priority');
    expect(priority).toHaveLength(1);
    expect(priority[0]?.text).toMatch(
      /free school meals for every child and keep the £2 bus fare cap running/,
    );
    expect(
      s.paragraphs.some((p) => p.kind === 'revenue' && /broadest shoulders/.test(p.text)),
    ).toBe(true);
    expect(
      s.paragraphs.some((p) => p.kind === 'revenue' && /Business will contribute/.test(p.text)),
    ).toBe(true);
    expect(s.paragraphs.find((p) => p.kind === 'lock-break')?.text).toMatch(
      /corporation tax capped/i,
    );
    expect(s.paragraphs.find((p) => p.kind === 'rabbit')?.text).toMatch(/cut by five per cent/);
    expect(kinds[kinds.length - 1]).toBe('peroration');
  });

  it('opens on the first priority ranked, and names several add-ons in one flourish', () => {
    const game: GamePermalink = {
      ...freshGame(3),
      priorities: ['defence', 'cost-of-living'],
      rabbit: ['meals', 'fuel-cut'],
    };
    const s = speak({ dip47: 1, ufsm: 1, fuel: -5 }, game);
    expect(s.paragraphs[0]?.kind).toBe('opening');
    expect(s.paragraphs[0]?.text).toMatch(/security of its people/);
    const flourish = s.paragraphs.find((p) => p.kind === 'rabbit')?.text ?? '';
    expect(flourish).toMatch(/free school meals for every child and fuel duty cut by 5%/);
    // Keeping the headroom is an announcement only while there is headroom to keep.
    const kept = speak({ dip47: 1 }, { ...game, rabbit: ['keep'] });
    expect(kept.paragraphs.find((p) => p.kind === 'rabbit')?.text).toMatch(/no rabbit in this hat/);
  });

  it('owns a missed rule, and says so differently when the breach was chosen', () => {
    const missed = speak({ def5: 1 }, { ...freshGame(3) });
    expect(missed.paragraphs.at(-1)?.text).toMatch(/misses a rule in 2029-30/);
    const chosen = speak({ def5: 1 }, { ...freshGame(3), breachAccepted: true });
    expect(chosen.paragraphs.at(-1)?.text).toMatch(/I have chosen to proceed/);
    const met = speak({ itbr: 1 });
    expect(met.paragraphs.at(-1)?.text).toMatch(/meets the fiscal rules/);
  });

  it('mentions what was scaled back since the desk, and what starts later', () => {
    const game: GamePermalink = { ...freshGame(3), delays: { ufsm: '2028-29' } };
    const s = speak({ ufsm: 1, dhsc: 1 }, game, { ufsm: 1, dhsc: 3 });
    expect(s.paragraphs.find((p) => p.kind === 'compromises')?.text).toMatch(/1 of our measures/);
    expect(s.paragraphs.find((p) => p.kind === 'delay')?.text).toMatch(/2028-29/);
  });
});
