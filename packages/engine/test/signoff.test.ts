import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  PREVIEW_RULES,
  reactionPreview,
  receptions,
  signOffLine,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  DEBT_RULE_MISSED,
  NEEDED_LOCK_BREAK,
  NICS_WALK,
  SECURITY,
  WALK,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const ESTIMATE = todaysEstimate(ds);
const typicalErrorGbpm = typicalError(ds);

function signOff(priorities: readonly string[], policy: Budget) {
  const game = gameWith(priorities);
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
    const { line } = signOff(SECURITY, WALK);
    expect(line?.key).toBe('brokenWithRoom');
    expect(line?.line.text).toBe(
      'You’d break the tax lock with room to spare? Tell me what it buys that nothing else could.',
    );
    expect(line?.names).toEqual(['tax-lock']);
    expect(line?.line.badge).toBe('simulated');
  });

  it('says a needed break will follow them, when the rules need it', () => {
    // Health above its plan is paid for by the penny: without it the day-to-day rule is missed.
    const { line } = signOff(['nhs'], NEEDED_LOCK_BREAK);
    expect(line?.key).toBe('broken');
    expect(line?.line.text).toMatch(/^Breaking the tax lock will follow us to the next election\./);
  });

  it('names a strain in its words, and a missed rule by its plain name', () => {
    expect(signOff(SECURITY, NICS_WALK).line?.line.text).toBe(
      'The words of the tax lock still hold. Expect the benches to ask about the spirit.',
    );
    const missed = signOff(['defence'], DEBT_RULE_MISSED).line;
    expect(missed?.key).toBe('rulesMissed');
    expect(missed?.line.text).toMatch(/^You’d miss the debt rule\?/);
  });

  it('says nothing when all is well', () => {
    expect(signOff(SECURITY, {}).line).toBeNull();
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
    const { preview } = signOff(SECURITY, WALK);
    expect(preview).not.toBeNull();
    expect(PREVIEW_RULES).toContain(preview?.reason.rule);
    expect(preview?.reason.points).not.toBe(0);
    expect(preview?.reason.text).toMatch(/Tax rises of £\d+\.\dbn a year/);
  });

  it('reads out nothing when none of those bands moves anything', () => {
    expect(signOff(SECURITY, {}).preview).toBeNull();
  });

  it('names only rules the reception file has', () => {
    const ids = new Set(ds.reception.audiences.flatMap((a) => a.rules.map((r) => r.id)));
    for (const id of PREVIEW_RULES) expect(ids.has(id), id).toBe(true);
  });
});
