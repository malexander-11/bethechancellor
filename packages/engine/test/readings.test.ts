import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  distributionalNotes,
  freshGame,
  readings,
  readingsWithCauses,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);
const run = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const read = (leverValues: Record<string, number>, game?: GamePermalink) => {
  const outcome = run(leverValues);
  return readings({
    outcome,
    levers: ds.levers,
    typicalErrorGbpm,
    pm: ds.pm,
    incidence: ds.incidence,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) } : {}),
  });
};

describe('the readings of a Budget', () => {
  it('sits where the March forecast left it for an empty Budget', () => {
    const base = read({});
    expect(base.stabilityHeadroomGbpm).toBeCloseTo(23600, -2);
    expect(base.borrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(base.budget2025Reversals).toBe(0);
    expect(base.publicServiceSpendingGbpm).toBe(0);
    expect(base.taxRisesGbpm).toBe(0);
    expect(base.taxCutsGbpm).toBe(0);
    expect(base.rulesMissed).toBe(0);
    // Above the cap but inside the 5% margin, as the March forecast has it.
    expect(base.welfareCapStatus).toBe(1);
  });

  it('counts what you reversed', () => {
    const r = read({ def3: 1, airet: 1, rvfrz: 1, rv2ch: 1 });
    expect(r.budget2025Reversals).toBe(2);
    expect(r.welfareReversals).toBe(1);
  });

  it('totals spending, tax rises and tax cuts in the target year, and who the rises fall on', () => {
    const r = read({ dhsc: 3, cdel: 10, itbr: 1, it50: 1, fuel: -10 });
    expect(r.publicServiceSpendingGbpm).toBeGreaterThan(15000);
    expect(r.capitalChangeGbpm).toBeCloseTo(13420, -1);
    expect(r.taxRisesGbpm).toBeGreaterThan(8000);
    expect(r.taxCutsGbpm).toBeGreaterThan(0);
    expect(r.netRevenueGbpm).toBeCloseTo((r.taxRisesGbpm ?? 0) - (r.taxCutsGbpm ?? 0), 6);
    // A penny on the basic rate is broad-based and dwarfs the new top rate: the balance is negative.
    expect(r.progressiveBalanceGbpm).toBeLessThan(0);
    expect(read({ it50: 1, wealth: 1 }).progressiveBalanceGbpm).toBeGreaterThan(0);
    // Cutting welfare rates reads as a welfare cut; the reversals are counted separately.
    expect(read({ wuc: -5 }).welfareChangeGbpm).toBeLessThan(-2000);
    expect(read({ wuc: -5 }).welfareReversals).toBe(0);
  });

  it('reads the game: red lines, flagships, themes and the breach', () => {
    const game: GamePermalink = {
      ...freshGame(7),
      headroomTargetBn: 30,
      priorities: ['defence', 'safer-streets'],
      breachAccepted: true,
    };
    const r = read({ itbr: 1, moj: 10 }, game);
    expect(r.promisesBroken).toBe(1);
    expect(r.manifestoBroken).toBe(1);
    expect(r.prioritiesUnfunded).toBe(1);
    expect(r.prioritiesFunded).toBe(1);
    // Two priorities ranked: not a single story, whatever the money behind either.
    expect(r.clearPriorityGbpm).toBe(0);
    expect(r.deliveredGbpm).toBeGreaterThan(1000);
    expect(r.breachAccepted).toBe(1);
    expect(r.headroomVsTargetGbpm).toBeCloseTo((r.stabilityHeadroomGbpm ?? 0) - 30000, 6);
    expect(r.rebellionRisk).toBe(2 + 1 + 0);
    // One priority ranked and delivered: a clear story worth what its options cost.
    const clear = read({ moj: 10 }, { ...game, priorities: ['safer-streets'] });
    expect(clear.clearPriorityGbpm).toBeCloseTo(clear.deliveredGbpm ?? 0, 6);
    expect(clear.clearPriorityGbpm).toBeGreaterThan(1000);
    // Missing the stability rule breaks the fiscal-rules promise but crosses no manifesto red line.
    const missed = read({ def5: 1 }, game);
    expect(missed.rulesMissed).toBeGreaterThan(0);
    expect(missed.promisesBroken).toBe(1);
    expect(missed.manifestoBroken).toBe(0);
  });

  it('names the decisions behind each reading', () => {
    const game: GamePermalink = { ...freshGame(7), priorities: ['safer-streets'] };
    const outcome = run({ itbr: 1, moj: 10, def5: 1 });
    const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
    const { causes } = readingsWithCauses({
      outcome,
      levers: ds.levers,
      typicalErrorGbpm,
      pm: ds.pm,
      incidence: ds.incidence,
      game,
      status,
    });
    expect(causes.borrowingChangeGbpm).toContain('Defence to 5% of GDP');
    expect(causes.manifestoBroken?.[0]).toMatch(/The tax lock \(Basic rate\)/);
    expect(causes.taxRisesGbpm).toEqual(['Basic rate']);
    expect(causes.prioritiesFunded).toEqual(['Safer streets: prisons, police, borders']);
    expect(causes.publicServiceSpendingGbpm?.[0]).toBe('Defence to 5% of GDP');
  });

  it('measures credibility as the share of the improvement that rests on uncertified figures', () => {
    expect(read({ itbr: 2 }).credibilityShare).toBe(0);
    expect(read({ cgtalign: 1 }).credibilityShare).toBe(1);
    // A wealth tax that cannot start before 2030-31 improves nothing in 2029-30, so it is not
    // uncertified improvement either (ADR-0021).
    expect(read({ wealth: 1 }).credibilityShare).toBe(0);
    const mixed = read({ cgtalign: 1, itbr: 2 }).credibilityShare ?? 0;
    expect(mixed).toBeGreaterThan(0);
    expect(mixed).toBeLessThan(1);
  });

  it('carries the distributional notes of the levers you moved, biggest first', () => {
    const outcome = run({ itbr: 2, nonuk: 1 });
    const notes = distributionalNotes(outcome, ds.levers, '2029-30');
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.sources.length > 0)).toBe(true);
    expect(notes[0]?.leverTitle).toBeDefined();
    expect(distributionalNotes(run({}), ds.levers, '2029-30')).toEqual([]);
  });
});
