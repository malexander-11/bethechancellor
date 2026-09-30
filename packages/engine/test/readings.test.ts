import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  distributionalNotes,
  freshGame,
  readings,
  readingsWithCauses,
  suggestedSettings,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
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
    outcomeOf,
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

  it('measures from before the Budget, today’s estimate, not from March (Phase 25)', () => {
    const context = ds.contexts[ds.contexts.length - 1];
    if (!context) throw new Error('no context');
    const estimate = suggestedSettings(context.readings, ds.levers);
    const nothing = read(estimate);
    expect(nothing.borrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.cumulativeBorrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.taxTakeChangePp).toBeCloseTo(0, 6);
    expect(nothing.headroomChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.stabilityHeadroomGbpm).toBeCloseTo(6850, -2);
    expect(nothing.fiscalRulesMissed).toBe(0);
    expect(nothing.paidForStatus).toBe(1);
    // A cut and a rise elsewhere are both counted, never netted; health counts as protected.
    const both = read({ ...estimate, dhsc: -1, moj: 10 });
    expect(both.serviceCutsGbpm).toBeGreaterThan(2000);
    expect(both.protectedCutsGbpm).toBeCloseTo(both.serviceCutsGbpm ?? 0, 6);
    expect(both.publicServiceSpendingGbpm).toBeLessThan(0);
    // Benefits are not public services.
    expect(read({ ...estimate, wuc: 5 }).publicServiceSpendingGbpm).toBe(0);
    // A bank levy raises money most households do not feel.
    const banks = read({ ...estimate, banklevy: 1 });
    expect(banks.feltTaxRisesGbpm).toBe(0);
    expect(banks.notFeltTaxRisesGbpm).toBeGreaterThan(1000);
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

  it('reads the game: red lines and priorities', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['defence', 'safer-streets'] };
    const r = read({ itbr: 1, moj: 10 }, game);
    expect(r.promisesBroken).toBe(1);
    expect(r.manifestoBroken).toBe(1);
    expect(r.manifestoStrained).toBe(0);
    // Amber (Phase 23): employer National Insurance strains the lock; with the lock already broken
    // it counts once.
    expect(read({ nicer: 1, moj: 10 }, game).manifestoStrained).toBe(1);
    expect(read({ nicer: 1, moj: 10 }, game).manifestoBroken).toBe(0);
    expect(read({ nicer: 1, itbr: 1, moj: 10 }, game).manifestoStrained).toBe(0);
    expect(r.prioritiesUnfunded).toBe(1);
    expect(r.prioritiesFunded).toBe(1);
    // Two priorities ranked: not a single story, whatever the money behind either.
    expect(r.clearPriorityGbpm).toBe(0);
    expect(r.deliveredGbpm).toBeGreaterThan(1000);
    // The target, the breach and the add-ons went with the forecast (Phase 24).
    expect(r.breachAccepted).toBeUndefined();
    expect(r.headroomVsTargetGbpm).toBeUndefined();
    expect(r.rabbitGbpm).toBeUndefined();
    expect(r.rebellionRisk).toBe(2 + 1 + 0);
    // A benefit cut by a slider counts with the benches as a U-turn does (Phase 25).
    expect(read({ moj: 10, wuc: -5 }, game).rebellionRisk).toBe(0 + 1 + 1);
    expect(read({ moj: 10, rv2ch: 1 }, game).rebellionRisk).toBe(2 + 1 + 1);
    // One priority ranked and delivered: a clear story worth what its options cost.
    const clear = read({ moj: 10 }, { ...game, priorities: ['safer-streets'] });
    expect(clear.clearPriorityGbpm).toBeCloseTo(clear.deliveredGbpm ?? 0, 6);
    expect(clear.clearPriorityGbpm).toBeGreaterThan(1000);
    // Graded delivery (Phase 25): a way that only makes a start is started, not funded, and a
    // single started priority is not a clear story.
    const started = read({ mhclg: 5 }, { ...game, priorities: ['nhs'] });
    expect(started.prioritiesStarted).toBe(1);
    expect(started.prioritiesFunded).toBe(0);
    expect(started.prioritiesUnfunded).toBe(0);
    expect(started.clearPriorityGbpm).toBe(0);
    expect(r.prioritiesStarted).toBe(0);
    // Missing the stability rule breaks the fiscal-rules promise but crosses no manifesto red line.
    const missed = read({ def5: 1 }, game);
    expect(missed.rulesMissed).toBeGreaterThan(0);
    expect(missed.promisesBroken).toBe(1);
    expect(missed.manifestoBroken).toBe(0);
  });

  it('names the decisions behind each reading', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets'] };
    const outcome = run({ itbr: 1, moj: 10, def5: 1 });
    const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
    const { causes } = readingsWithCauses({
      outcome,
      levers: ds.levers,
      typicalErrorGbpm,
      outcomeOf,
      pm: ds.pm,
      incidence: ds.incidence,
      game,
      status,
    });
    // Causes carry how far each decision moved the reading, and are named in running words
    // (Phase 25): a lever's noun, a promise or a priority in lower case.
    const titles = (m: string) => (causes[m] ?? []).map((c) => c.title);
    expect(titles('borrowingChangeGbpm')).toContain('Defence to 5% of GDP');
    const tax = causes.borrowingChangeGbpm?.find((c) => c.title === 'the basic rate of income tax');
    expect(tax?.delta).toBeLessThan(0);
    expect(titles('manifestoBroken')[0]).toMatch(/^the tax lock \(the basic rate of income tax\)/);
    expect(titles('taxRisesGbpm')).toEqual(['the basic rate of income tax']);
    expect(titles('prioritiesFunded')).toEqual(['safer streets']);
    expect(titles('publicServiceSpendingGbpm')[0]).toBe('Defence to 5% of GDP');
    // The economy is not the player's decision: never a cause.
    expect(titles('borrowingChangeGbpm')).not.toContain('the economy since March');
  });

  it('measures credibility as the share of the improvement that rests on uncertified figures', () => {
    expect(read({ itbr: 2 }).credibilityShare).toBe(0);
    expect(read({ nicuel: 1 }).credibilityShare).toBe(1);
    // A wealth tax that cannot start before 2030-31 improves nothing in 2029-30, so it is not
    // uncertified improvement either (ADR-0021).
    expect(read({ wealth: 1 }).credibilityShare).toBe(0);
    const mixed = read({ nicuel: 1, itbr: 2 }).credibilityShare ?? 0;
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
