import { describe, expect, it } from 'vitest';
import {
  AMPLE_HEADROOM_GBPM,
  THIN_HEADROOM_GBPM,
  budgetVerdict,
  computeOutcome,
  formatGbpBn,
  freshGame,
  suggestedSettings,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = suggestedSettings(context.readings, ds.levers);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });
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
      outcomeOf,
    }),
  };
}
const verdictOf = (...args: Parameters<typeof close>) => close(...args).verdict;

describe('the close', () => {
  it('says how each ambition fared, and how each promise was lost', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets', 'nhs'] };
    const v = verdictOf(game, { moj: 10, dhsc: 1, itbr: 1 });
    const fates = Object.fromEntries(v.ambitions.priorities.map((p) => [p.title, p.fate]));
    // Prisons are funded as chosen; health has moved without getting there: settled lower.
    expect(fates['Safer streets: prisons, police, borders']).toBe('delivered');
    expect(fates['Bring down NHS waiting lists']).toBe('settledLower');
    const lock = v.ambitions.promises.find((p) => p.title === 'The tax lock');
    expect(lock?.fate).toBe('broken-by-choice');
    expect(lock?.by).toEqual(['Basic rate']);
    // Amber (Phase 23): paid for by employer National Insurance instead, the lock is kept in its
    // words and strained.
    const employer = verdictOf(game, { moj: 10, dhsc: 1, nicer: 1 });
    const strained = employer.ambitions.promises.find((p) => p.title === 'The tax lock');
    expect(strained?.fate).toBe('strained');
    expect(strained?.by).toEqual(['Employer NICs']);
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
    // Cautious: rules met with ample headroom from certified costings, and nothing done for the
    // priorities. Employer National Insurance strains the tax lock and breaks nothing.
    const game = { ...freshGame(), priorities: ['safer-streets'] };
    const cautious = close(game, { nicer: 2 });
    const headroom = cautious.verdict.headroomGbpm;
    expect(headroom).toBeGreaterThanOrEqual(AMPLE_HEADROOM_GBPM);
    expect(cautious.verdict.kind.id).toBe('cautious');
    // Uncertified costings are not caution (Phase 25), and the line no longer speaks for markets.
    expect(verdictOf(game, { nicer: 2 }, { credibilityShare: 1 }).kind.id).not.toBe('cautious');
    expect(cautious.verdict.kind.title).not.toMatch(/markets/);
    // A penny on the basic rate breaks the tax lock the rules did not need broken.
    const penny = verdictOf(game, { itbr: 1 });
    expect(penny.kind.id).toBe('broke-for-buffer');
    // Paid for by taxes no promise names: the family-home allowance and the biggest homes.
    const delivered = verdictOf(game, { moj: 10, rnrb: 1, ctgh: 1 });
    expect(delivered.kind.id).toBe('delivered-and-paid');
    expect(delivered.kind.title).toBe(
      'A Budget for safer streets that delivered what it promised and paid for it',
    );
    // The first priority ranked names the Budget.
    const both = verdictOf(
      { ...freshGame(), priorities: ['defence', 'safer-streets'] },
      { moj: 10, dip47: 1, rnrb: 1, ctgh: 1 },
    );
    expect(both.kind.title).toBe(
      'A Budget for defence that delivered what it promised and paid for it',
    );
    const quiet = verdictOf(freshGame(), {});
    expect(quiet.kind.id).toBe('small-moves');
    expect(quiet.kind.line.badge).toBe('simulated');
  });

  it('checks the trade-offs it names by re-running the engine on the same estimate', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['defence', 'safer-streets'] };
    // The walk: the tax lock broken for a margin the rules did not need.
    const walk = { dip47: 1, moj: 10, nicer: 2, itbr: 1, dhsc: -0.5 };
    const broke = close(game, walk);
    expect(broke.verdict.kind.id).toBe('broke-for-buffer');
    const without = outcomeOf({ ...walk, itbr: 0, ...ESTIMATE });
    const withoutHeadroom = without.verdicts.find((v) => v.kind === 'currentBudget')!.headroomGbpm;
    expect(without.verdicts.every((v) => v.status !== 'notMet' && v.status !== 'aboveMargin')).toBe(
      true,
    );
    expect(broke.verdict.kind.fact).toBe(
      `Without the change to the basic rate of income tax, you would still meet both rules, with ${formatGbpBn(withoutHeadroom, 1)} of headroom.`,
    );
    // A break the rules did need is the price of the programme, not a buffer.
    const needed = verdictOf({ ...freshGame(), priorities: ['nhs'] }, { dhsc: 3, itbr: 1 });
    expect(needed.kind.id).toBe('broke-the-lock');
    // A priority left out though the rules would hold with it paid for, and what it would cost.
    const left = close(game, { moj: 10 });
    expect(left.verdict.kind.id).toBe('left-out-with-room');
    expect(left.verdict.kind.line.short).toMatch(/^You named defence a priority/);
    expect(left.verdict.kind.fact).toMatch(
      /^Delivering defence in full with “Fill the funding gap in the defence investment plan” would still meet both rules, with £\d+\.\dbn of headroom\.$/,
    );
    // Paid for by cuts: named by who gets less, ahead of a cautious reading of the same margin.
    const cuts = verdictOf({ ...freshGame(), priorities: ['nhs'] }, { dhsc: -5 });
    expect(cuts.kind.id).toBe('paid-by-cuts');
    expect(cuts.kind.line.short).toBe(
      'The sums add up by giving less to patients and the NHS, not by taxing more.',
    );
    // A restive party outranks a thin margin kept with every promise.
    const restive = verdictOf(
      { ...freshGame(), priorities: ['safer-streets'] },
      { moj: 10 },
      { rebellionRisk: 3 },
    );
    expect(restive.kind.id).toBe('restive-party');
    // Size is measured, not assumed: big moves and small ones, each without a claim it cannot keep.
    const big = verdictOf(freshGame(), { itbr: 1, dhsc: 3 });
    expect(big.kind.id).toBe('big-moves');
    const small = verdictOf(freshGame(), { tob: 10 });
    expect(small.kind.id).toBe('small-moves');
    expect(small.kind.line.text).not.toMatch(/markets/i);
    for (const kind of ds.verdicts.kinds) {
      expect(`${kind.title} ${kind.line.text}`).not.toMatch(/OBR’s arithmetic|OBR’s test/);
    }
  });

  it('calls a margin thin under ten billion, as the markets do, and not above it', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets'] };
    // Every promise kept and the priority delivered; only the margin differs.
    const thin = verdictOf(game, { moj: 10, rnrb: 1 });
    expect(thin.headroomGbpm).toBeLessThan(THIN_HEADROOM_GBPM);
    expect(thin.kind.id).toBe('kept-everything-thin');
    // Over ten billion and under the old line (half the typical forecast error, about £16bn),
    // which once called this thin too.
    const modest = verdictOf(game, { moj: 10, rnrb: 1, ctgh: 1 });
    expect(modest.headroomGbpm).toBeGreaterThan(THIN_HEADROOM_GBPM);
    expect(modest.headroomGbpm).toBeLessThan(typicalErrorGbpm / 2);
    expect(modest.kind.id).toBe('delivered-and-paid');
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
