import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  computeOutcome,
  freshGame,
  macroCodesOf,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const MACRO = macroCodesOf(context.readings);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });

function speak(values: Record<string, number>, game?: GamePermalink) {
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
    macroCodes: MACRO,
    outcomeOf,
  });
}

describe('the speech', () => {
  it('is deterministic, stays inside its word budget, and repeats no fragment', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['nhs', 'schools-send'] };
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
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets'] };
    const s = speak({ moj: 10, itbr: 2, vats: 1 }, game);
    const figures = new Set(s.paragraphs.flatMap((p) => p.figures));
    for (const p of s.paragraphs) {
      for (const match of p.text.match(/[+−-]?£\d[\d,]*\.?\d*bn/g) ?? []) {
        expect(figures.has(match), `"${match}" is not an engine figure`).toBe(true);
      }
    }
    expect(figures.size).toBeGreaterThan(0);
  });

  it('follows the choices: the priority, its options, who pays and a broken promise', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['cost-of-living'] };
    const s = speak({ ufsm: 1, bus2: 1, alc: -5, ct: 1, it50: 1 }, game);
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
    expect(s.paragraphs.find((p) => p.kind === 'giveaways')?.text).toMatch(/alcohol/i);
    expect(s.paragraphs.find((p) => p.kind === 'lock-break')?.text).toMatch(
      /corporation tax capped/i,
    );
    expect(kinds[kinds.length - 1]).toBe('peroration');
  });

  it('opens on the first priority ranked, and on the estimate when nothing is ranked', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['defence', 'cost-of-living'] };
    const s = speak({ dip47: 1 }, game);
    expect(s.paragraphs[0]?.kind).toBe('opening');
    expect(s.paragraphs[0]?.text).toMatch(/security of its people/);
    // Without a game the opening names what the Budget is built on: the March forecast brought
    // up to date, never a forecast that arrived later.
    const sandbox = speak({ itbr: 1 });
    expect(sandbox.paragraphs[0]?.text).toMatch(/brought up to date/);
    expect(sandbox.paragraphs[0]?.text).not.toMatch(/this morning/);
  });

  it('owns a missed rule, and says so plainly when every rule is met', () => {
    const missed = speak({ def5: 1 }, { ...freshGame() });
    expect(missed.paragraphs.at(-1)?.text).toMatch(/misses a rule in 2029-30/);
    const met = speak({ itbr: 1 });
    expect(met.paragraphs.at(-1)?.text).toMatch(/meets the fiscal rules/);
    // Phase 24 retired the add-on flourish, the compromises and the delays: none is ever said.
    for (const s of [missed, met]) {
      for (const p of s.paragraphs) {
        expect(['rabbit', 'compromises', 'delay']).not.toContain(p.kind);
      }
    }
  });
});
