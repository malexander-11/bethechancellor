import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  freshGame,
  PREVIEW_RULES,
  reactionPreview,
  receptions,
  signOffLine,
  suggestedSettings,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const ESTIMATE = suggestedSettings(context.readings, ds.levers);
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);

/** The review's walk (Phase 25), and the same Budget paid for by the levy alone. */
const WALK = { dip47: 1, moj: 10, hscl: 1, itbr: 1, ipt: 1, dhsc: -0.5 };
const LEVY_WALK = { dip47: 1, moj: 10, hscl: 1, ipt: 1, dhsc: -0.5 };

function signOff(priorities: string[], policy: Record<string, number>) {
  const game: GamePermalink = { ...freshGame(), priorities };
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE } },
  });
  const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
  const line = signOffLine({ pm: ds.pm, outcome, status, levers: ds.levers, outcomeOf });
  const rooms = receptions({
    outcome,
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    outcomeOf,
    pm: ds.pm,
    incidence: ds.incidence,
    game,
    status,
  });
  return { line, preview: reactionPreview(rooms) };
}

describe('the Prime Minister signs off (Phase 25, R14)', () => {
  it('asks why a promise is broken when the rules would hold without it', () => {
    const { line } = signOff(['defence', 'safer-streets'], WALK);
    expect(line?.key).toBe('brokenWithRoom');
    expect(line?.line.text).toBe(
      'You’d break the tax lock with room to spare? Tell me what it buys that nothing else could.',
    );
    expect(line?.names).toEqual(['tax-lock']);
    expect(line?.line.badge).toBe('simulated');
  });

  it('says a needed break will follow them, when the rules need it', () => {
    // Health above its plan is paid for by the penny: without it the day-to-day rule is missed.
    const { line } = signOff(['nhs'], { dhsc: 3, itbr: 1 });
    expect(line?.key).toBe('broken');
    expect(line?.line.text).toMatch(/^Breaking the tax lock will follow us to the next election\./);
  });

  it('names a strain in its words, and a missed rule by its plain name', () => {
    expect(signOff(['defence', 'safer-streets'], LEVY_WALK).line?.line.text).toBe(
      'The words of the tax lock still hold. Expect the benches to ask about the spirit.',
    );
    const missed = signOff(['defence'], { cdel: 20 }).line;
    expect(missed?.key).toBe('rulesMissed');
    expect(missed?.line.text).toMatch(/^You’d miss the debt rule\?/);
  });

  it('says nothing when all is well', () => {
    expect(signOff(['defence', 'safer-streets'], {}).line).toBeNull();
  });

  it('keeps every sign-off line under twenty words, with no figure', () => {
    for (const line of Object.values(ds.pm.signOff)) {
      expect(line.text.split(/\s+/).length).toBeLessThanOrEqual(20);
      expect(line.text).not.toMatch(/\d/);
    }
  });
});

describe('one reaction read out before delivery, with no rating (Phase 25, R14)', () => {
  it('reads out the band that moves a rating most, from those the review may name', () => {
    const { preview } = signOff(['defence', 'safer-streets'], WALK);
    expect(preview).not.toBeNull();
    expect(PREVIEW_RULES).toContain(preview?.reason.rule);
    expect(preview?.reason.points).not.toBe(0);
    expect(preview?.reason.text).toMatch(/Tax rises of £\d+\.\dbn a year/);
  });

  it('reads out nothing when none of those bands moves anything', () => {
    expect(signOff(['defence', 'safer-streets'], {}).preview).toBeNull();
  });

  it('names only rules the reception file has', () => {
    const ids = new Set(ds.reception.audiences.flatMap((a) => a.rules.map((r) => r.id)));
    for (const id of PREVIEW_RULES) expect(ids.has(id), id).toBe(true);
  });
});
