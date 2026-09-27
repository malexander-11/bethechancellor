import { describe, expect, it } from 'vitest';
import {
  AMPLE_HEADROOM_GBPM,
  THIN_HEADROOM_GBPM,
  budgetVerdict,
  computeOutcome,
  freshGame,
  suggestedSettings,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = suggestedSettings(context.readings, ds.levers);
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);

/** A delivered Budget: today's estimate, the package as given. */
function close(
  game: GamePermalink,
  policy: Record<string, number>,
  extra: { credibilityShare?: number; rebellionRisk?: number } = {},
) {
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE }, implementationYear: '2027-28' },
  });
  return {
    outcome,
    verdict: budgetVerdict({
      levers: ds.levers,
      pm: ds.pm,
      options: ds.options,
      incidence: ds.incidence,
      kinds: ds.verdicts,
      game,
      outcome,
      typicalErrorGbpm,
      credibilityShare: extra.credibilityShare ?? 0,
      rebellionRisk: extra.rebellionRisk ?? 0,
    }),
  };
}
const verdictOf = (...args: Parameters<typeof close>) => close(...args).verdict;

describe('the close', () => {
  it('says how each ambition fared, and how each promise was lost', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets', 'nhs'] };
    const v = verdictOf(game, { moj: 10, dhsc: 1, itbr: 1 });
    const fates = Object.fromEntries(v.ambitions.priorities.map((p) => [p.title, p.fate]));
    // Prisons are funded as chosen; health has moved without getting there.
    expect(fates['Safer streets: prisons, police, borders']).toBe('delivered');
    expect(fates['Bring down NHS waiting lists']).toBe('narrowed');
    const lock = v.ambitions.promises.find((p) => p.title === 'The tax lock');
    expect(lock?.fate).toBe('broken-by-choice');
    expect(lock?.by).toEqual(['Basic rate']);
    // Amber (Phase 23): paid for by the levy instead, the lock is kept in its words and strained.
    const levy = verdictOf(game, { moj: 10, dhsc: 1, hscl: 1 });
    const strained = levy.ambitions.promises.find((p) => p.title === 'The tax lock');
    expect(strained?.fate).toBe('strained');
    expect(strained?.by).toEqual(['Health and social care levy']);
    // Every manifesto promise is judged; the rest were kept.
    expect(v.ambitions.promises).toHaveLength(ds.pm.promises.length);
    expect(v.ambitions.promises.filter((p) => p.fate === 'kept')).toHaveLength(
      ds.pm.promises.length - 1,
    );
  });

  it('totals who paid and who benefited from the engine’s own figures', () => {
    const v = verdictOf(freshGame(), { itbr: 1, ct: 1, dhsc: 3, rv2ch: 1 });
    const paid = Object.fromEntries(v.paid.map((r) => [r.group, r.gbpm]));
    expect(paid['broad-base']).toBeGreaterThan(8000);
    expect(paid['business']).toBeGreaterThan(3000);
    const benefited = Object.fromEntries(v.benefited.map((r) => [r.group, r.gbpm]));
    expect(benefited['nhs']).toBeGreaterThan(6000);
    // Reinstating the two-child limit takes money from families: a negative benefit.
    expect(benefited['families-on-benefits']).toBeLessThan(0);
    // Biggest first.
    for (let i = 1; i < v.paid.length; i += 1) {
      expect(Math.abs(v.paid[i - 1]!.gbpm)).toBeGreaterThanOrEqual(Math.abs(v.paid[i]!.gbpm));
    }
  });

  it('judges the Budget on the figures the player saw, and nothing else', () => {
    const { outcome, verdict } = close(freshGame(), { dhsc: 3 });
    const stability = outcome.verdicts.find((r) => r.kind === 'currentBudget');
    expect(verdict.headroomGbpm).toBe(stability?.headroomGbpm);
    expect(verdict.targetYear).toBe('2029-30');
    // Phase 24 retired the forecast that arrived later: no compromises since it, no re-runs.
    expect(Object.keys(verdict).sort()).toEqual([
      'ambitions',
      'benefited',
      'headroomGbpm',
      'kind',
      'paid',
      'targetYear',
    ]);
  });

  it('names the kind of Budget from the closed list, first fit wins', () => {
    const missed = verdictOf(freshGame(), { def5: 1 });
    expect(missed.kind.id).toBe('rules-missed');
    // Cautious: rules met with ample headroom, and nothing done for the priorities.
    const game = { ...freshGame(), priorities: ['safer-streets'] };
    const cautious = close(game, { itbr: 2 });
    const headroom = cautious.verdict.headroomGbpm;
    expect(headroom).toBeGreaterThanOrEqual(AMPLE_HEADROOM_GBPM);
    expect(cautious.verdict.kind.id).toBe('cautious');
    // A penny raises less than the advisers’ twenty billion on today’s estimate: not cautious.
    const penny = verdictOf(game, { itbr: 1 });
    expect(penny.headroomGbpm).toBeLessThan(AMPLE_HEADROOM_GBPM);
    expect(penny.kind.id).not.toBe('cautious');
    // Paid for by broadening the VAT base, which the tax lock does not name.
    const delivered = verdictOf(game, { moj: 10, vatfood: 1 });
    expect(delivered.kind.id).toBe('delivered-and-paid');
    expect(delivered.kind.title).toBe(
      'A Budget for safer streets that delivered what it promised and paid for it',
    );
    // The first priority ranked names the Budget.
    const both = verdictOf(
      { ...freshGame(), priorities: ['defence', 'safer-streets'] },
      { moj: 10, dip47: 1, vatfood: 1 },
    );
    expect(both.kind.title).toBe(
      'A Budget for defence that delivered what it promised and paid for it',
    );
    const quiet = verdictOf(freshGame(), {});
    expect(quiet.kind.id).toBe('small-moves');
    expect(quiet.kind.line.badge).toBe('simulated');
  });

  it('draws the thin and ample lines where the markets’ bands do', () => {
    const rule = ds.reception.audiences.flatMap((a) => a.rules).find((r) => r.id === 'mk-headroom');
    const ceilings = Object.fromEntries((rule?.bands ?? []).map((b) => [b.id, b.upTo]));
    expect(THIN_HEADROOM_GBPM).toBe(ceilings.thin);
    expect(AMPLE_HEADROOM_GBPM).toBe(ceilings.modest);
    // No verdict kind reads a target the player set: Phase 24 has none.
    for (const kind of ds.verdicts.kinds) {
      expect(Object.keys(kind.when)).not.toContain('headroomAtLeastTarget');
      expect(Object.keys(kind.when)).not.toContain('breachAccepted');
    }
  });
});
