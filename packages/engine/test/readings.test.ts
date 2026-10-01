import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  readingsWithCauses,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  DAY_TO_DAY_RULE_MISSED,
  EMPLOYER_NICS,
  HEALTH_ABOVE_PLAN,
  INVESTMENT,
  NHS_START,
  PENNY,
  PRISONS,
  SECURITY,
  TAXES_AT_THE_TOP,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const typicalErrorGbpm = typicalError(ds);
/** What a reading's causes call the levers of a Budget. */
const causes = (budget: Budget) =>
  Object.keys(budget).map((code) => {
    const lever = ds.levers.find((l) => l.code === code);
    return lever?.noun ?? lever?.shortTitle ?? code;
  });
const run = (leverValues: Budget) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
const read = (leverValues: Budget, game?: GamePermalink) => {
  const outcome = run(leverValues);
  return readingsWithCauses({
    outcome,
    levers: ds.levers,
    typicalErrorGbpm,
    outcomeOf,
    pm: ds.pm,
    incidence: ds.incidence,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) } : {}),
  }).values;
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
    const estimate = todaysEstimate(ds);
    const nothing = read(estimate);
    expect(nothing.borrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.cumulativeBorrowingChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.taxTakeChangePp).toBeCloseTo(0, 6);
    expect(nothing.headroomChangeGbpm).toBeCloseTo(0, 6);
    expect(nothing.stabilityHeadroomGbpm).toBeCloseTo(6850, -2);
    expect(nothing.fiscalRulesMissed).toBe(0);
    expect(nothing.paidForStatus).toBe(1);
    // A cut and a rise elsewhere are both counted, never netted; health counts as protected.
    const both = read({ ...estimate, dhsc: -1, ...PRISONS });
    expect(both.serviceCutsGbpm).toBeGreaterThan(2000);
    expect(both.protectedCutsGbpm).toBeCloseTo(both.serviceCutsGbpm ?? 0, 6);
    expect(both.publicServiceSpendingGbpm).toBeLessThan(0);
    // Benefits are not public services.
    expect(read({ ...estimate, wuc: 5 }).publicServiceSpendingGbpm).toBe(0);
    // A bank levy raises money most households do not feel.
    expect(read({ ...estimate, banklevy: 1 }).feltTaxRisesGbpm).toBe(0);
  });

  it('counts what you reversed', () => {
    const r = read({ def3: 1, airet: 1, rvfrz: 1, rv2ch: 1 });
    expect(r.budget2025Reversals).toBe(2);
    expect(r.welfareReversals).toBe(1);
  });

  it('totals spending, tax rises and tax cuts in the target year, and who the rises fall on', () => {
    const budget = { ...HEALTH_ABOVE_PLAN, ...INVESTMENT, ...PENNY, it50: 1, fuel: -10 };
    const r = read(budget);
    expect(r.publicServiceSpendingGbpm).toBeGreaterThan(15000);
    // The investment is all the capital there is, as the Budget's own paths count it.
    expect(r.capitalChangeGbpm).toBeCloseTo(
      run(budget).paths.deltas.capitalSpending['2029-30'] ?? 0,
      6,
    );
    expect(r.capitalChangeGbpm).toBeGreaterThan(0);
    expect(r.taxRisesGbpm).toBeGreaterThan(8000);
    expect(r.taxCutsGbpm).toBeGreaterThan(0);
    expect(r.netRevenueGbpm).toBeCloseTo((r.taxRisesGbpm ?? 0) - (r.taxCutsGbpm ?? 0), 6);
    // A penny on the basic rate is broad-based and dwarfs the new top rate: the balance is negative.
    expect(r.progressiveBalanceGbpm).toBeLessThan(0);
    expect(read(TAXES_AT_THE_TOP).progressiveBalanceGbpm).toBeGreaterThan(0);
    // Cutting welfare rates reads as a welfare cut; the reversals are counted separately.
    expect(read({ wuc: -5 }).welfareChangeGbpm).toBeLessThan(-2000);
    expect(read({ wuc: -5 }).welfareReversals).toBe(0);
  });

  it('reads the game: red lines and priorities', () => {
    const game = gameWith(SECURITY);
    const r = read({ ...PENNY, ...PRISONS }, game);
    expect(r.promisesBroken).toBe(1);
    expect(r.manifestoBroken).toBe(1);
    expect(r.manifestoStrained).toBe(0);
    // Amber (Phase 23): employer National Insurance strains the lock; with the lock already broken
    // it counts once.
    expect(read({ ...EMPLOYER_NICS, ...PRISONS }, game).manifestoStrained).toBe(1);
    expect(read({ ...EMPLOYER_NICS, ...PRISONS }, game).manifestoBroken).toBe(0);
    expect(read({ ...EMPLOYER_NICS, ...PENNY, ...PRISONS }, game).manifestoStrained).toBe(0);
    expect(r.prioritiesUnfunded).toBe(1);
    expect(r.prioritiesFunded).toBe(1);
    // Two priorities ranked: not a single story, whatever the money behind either.
    expect(r.clearPriorityGbpm).toBe(0);
    expect(r.deliveredGbpm).toBeGreaterThan(1000);
    // The target, the breach and the add-ons went with the forecast (Phase 24).
    expect(r.breachAccepted).toBeUndefined();
    expect(r.headroomVsTargetGbpm).toBeUndefined();
    expect(r.rabbitGbpm).toBeUndefined();
    // One priority ranked and delivered: a clear story worth what its options cost.
    const clear = read(PRISONS, gameWith(['safer-streets']));
    expect(clear.clearPriorityGbpm).toBeCloseTo(clear.deliveredGbpm ?? 0, 6);
    expect(clear.clearPriorityGbpm).toBeGreaterThan(1000);
    // Graded delivery (Phase 25): a way that only makes a start is started, not funded, and a
    // single started priority is not a clear story.
    const started = read(NHS_START, gameWith(['nhs']));
    expect(started.prioritiesStarted).toBe(1);
    expect(started.prioritiesFunded).toBe(0);
    expect(started.prioritiesUnfunded).toBe(0);
    expect(started.clearPriorityGbpm).toBe(0);
    expect(r.prioritiesStarted).toBe(0);
    // Missing the stability rule breaks the fiscal-rules promise but crosses no manifesto red line.
    const missed = read(DAY_TO_DAY_RULE_MISSED, game);
    expect(missed.rulesMissed).toBeGreaterThan(0);
    expect(missed.promisesBroken).toBe(1);
    expect(missed.manifestoBroken).toBe(0);
  });

  it('names the decisions behind each reading', () => {
    const game = gameWith(['safer-streets']);
    const outcome = run({ ...PENNY, ...PRISONS, ...DAY_TO_DAY_RULE_MISSED });
    const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
    const { causes: found } = readingsWithCauses({
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
    const titles = (m: string) => (found[m] ?? []).map((c) => c.title);
    const [miss] = causes(DAY_TO_DAY_RULE_MISSED);
    const [penny] = causes(PENNY);
    expect(titles('borrowingChangeGbpm')).toContain(miss);
    const tax = found.borrowingChangeGbpm?.find((c) => c.title === penny);
    expect(tax?.delta).toBeLessThan(0);
    const lock = ds.pm.promises.find((p) => p.id === 'tax-lock')?.noun;
    expect(titles('manifestoBroken')[0]?.startsWith(`${lock} (${penny})`)).toBe(true);
    expect(titles('taxRisesGbpm')).toEqual(causes(PENNY));
    expect(titles('prioritiesFunded')).toEqual(
      ds.pm.priorities.filter((p) => p.id === 'safer-streets').map((p) => p.noun),
    );
    expect(titles('publicServiceSpendingGbpm')[0]).toBe(miss);
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
});
