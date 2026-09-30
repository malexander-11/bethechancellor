import { describe, expect, it } from 'vitest';
import {
  AMPLE_HEADROOM_GBPM,
  THIN_HEADROOM_GBPM,
  budgetVerdict,
  computeOutcome,
  formatGbpBn,
  freshGame,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  BIG_BROAD_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  EMPLOYER_NICS,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  NEEDED_LOCK_BREAK,
  NICS_WALK,
  PENNY,
  PRISONS,
  SECURITY,
  SECURITY_FLAGSHIPS,
  THIN_MARGIN,
  TWO_CHILD_LIMIT,
  UNPROMISED_TAXES,
  WALK,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });
const typicalErrorGbpm = typicalError(ds);

/** A delivered Budget: today's estimate, the package as given. */
function close(
  game: GamePermalink,
  policy: Budget,
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
const priorityTitle = (id: string) => ds.pm.priorities.find((p) => p.id === id)?.title ?? id;
/** What the close calls the levers of a Budget: their short titles. */
const shortTitles = (budget: Budget) =>
  Object.keys(budget).map((code) => ds.levers.find((l) => l.code === code)?.shortTitle ?? code);

describe('the close', () => {
  it('says how each ambition fared, and how each promise was lost', () => {
    const game = gameWith(['safer-streets', 'nhs']);
    // Prisons are funded as chosen; health has moved without getting there: settled lower.
    const trimmed = { ...PRISONS, dhsc: 1 };
    const v = verdictOf(game, { ...trimmed, ...PENNY });
    const fates = Object.fromEntries(v.ambitions.priorities.map((p) => [p.title, p.fate]));
    expect(fates[priorityTitle('safer-streets')]).toBe('delivered');
    expect(fates[priorityTitle('nhs')]).toBe('settledLower');
    const lockTitle = ds.pm.promises.find((p) => p.id === 'tax-lock')?.title;
    const lock = v.ambitions.promises.find((p) => p.title === lockTitle);
    expect(lock?.fate).toBe('broken-by-choice');
    expect(lock?.by).toEqual(shortTitles(PENNY));
    // Amber (Phase 23): paid for by employer National Insurance instead, the lock is kept in its
    // words and strained.
    const employer = verdictOf(game, { ...trimmed, ...EMPLOYER_NICS });
    const strained = employer.ambitions.promises.find((p) => p.title === lockTitle);
    expect(strained?.fate).toBe('strained');
    expect(strained?.by).toEqual(shortTitles(EMPLOYER_NICS));
    // Every manifesto promise is judged; the rest were kept.
    expect(v.ambitions.promises).toHaveLength(ds.pm.promises.length);
    expect(v.ambitions.promises.filter((p) => p.fate === 'kept')).toHaveLength(
      ds.pm.promises.length - 1,
    );
  });

  it('totals who paid and who benefited from the engine’s own figures', () => {
    const v = verdictOf(freshGame(), {
      ...PENNY,
      ct: 1,
      ...HEALTH_ABOVE_PLAN,
      ...TWO_CHILD_LIMIT,
    });
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
    const { outcome, verdict } = close(freshGame(), HEALTH_ABOVE_PLAN);
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
    const missed = verdictOf(freshGame(), DAY_TO_DAY_RULE_MISSED);
    expect(missed.kind.id).toBe('rules-missed');
    // Cautious: rules met with ample headroom from certified costings, and nothing done for the
    // priorities. Employer National Insurance strains the tax lock and breaks nothing.
    const game = gameWith(['safer-streets']);
    const cautious = close(game, BIG_BROAD_TAX_RISE);
    const headroom = cautious.verdict.headroomGbpm;
    expect(headroom).toBeGreaterThanOrEqual(AMPLE_HEADROOM_GBPM);
    expect(cautious.verdict.kind.id).toBe('cautious');
    // Uncertified costings are not caution (Phase 25), and the line no longer speaks for markets.
    expect(verdictOf(game, BIG_BROAD_TAX_RISE, { credibilityShare: 1 }).kind.id).not.toBe(
      'cautious',
    );
    expect(cautious.verdict.kind.title).not.toMatch(/markets/);
    // A penny on the basic rate breaks the tax lock the rules did not need broken.
    const penny = verdictOf(game, PENNY);
    expect(penny.kind.id).toBe('broke-for-buffer');
    // Paid for by taxes no promise names: the family-home allowance and the biggest homes.
    const delivered = verdictOf(game, { ...PRISONS, ...UNPROMISED_TAXES });
    expect(delivered.kind.id).toBe('delivered-and-paid');
    expect(delivered.kind.title).toBe(
      'A Budget for safer streets that delivered what it promised and paid for it',
    );
    // The first priority ranked names the Budget.
    const both = verdictOf(gameWith(SECURITY), { ...SECURITY_FLAGSHIPS, ...UNPROMISED_TAXES });
    expect(both.kind.title).toBe(
      'A Budget for defence that delivered what it promised and paid for it',
    );
    const quiet = verdictOf(freshGame(), {});
    expect(quiet.kind.id).toBe('small-moves');
    expect(quiet.kind.line.badge).toBe('simulated');
  });

  it('checks the trade-offs it names by re-running the engine on the same estimate', () => {
    const game = gameWith(SECURITY);
    // The walk: the tax lock broken for a margin the rules did not need.
    const broke = close(game, WALK);
    expect(broke.verdict.kind.id).toBe('broke-for-buffer');
    const without = outcomeOf({ ...NICS_WALK, ...ESTIMATE });
    const withoutHeadroom = without.verdicts.find((v) => v.kind === 'currentBudget')!.headroomGbpm;
    expect(without.verdicts.every((v) => v.status !== 'notMet' && v.status !== 'aboveMargin')).toBe(
      true,
    );
    expect(broke.verdict.kind.fact).toBe(
      `Without the change to the basic rate of income tax, you would still meet both rules, with ${formatGbpBn(withoutHeadroom, 1)} of headroom.`,
    );
    // A break the rules did need is the price of the programme, not a buffer.
    const needed = verdictOf(gameWith(['nhs']), NEEDED_LOCK_BREAK);
    expect(needed.kind.id).toBe('broke-the-lock');
    // A priority left out though the rules would hold with it paid for, and what it would cost.
    const left = close(game, PRISONS);
    expect(left.verdict.kind.id).toBe('left-out-with-room');
    expect(left.verdict.kind.line.short).toMatch(/^You named defence a priority/);
    expect(left.verdict.kind.fact).toMatch(
      /^Delivering defence in full with “Fill the funding gap in the defence investment plan” would still meet both rules, with £\d+\.\dbn of headroom\.$/,
    );
    // Paid for by cuts: named by who gets less, ahead of a cautious reading of the same margin.
    const cuts = verdictOf(gameWith(['nhs']), HEALTH_CUT);
    expect(cuts.kind.id).toBe('paid-by-cuts');
    expect(cuts.kind.line.short).toBe(
      'The sums add up by giving less to patients and the NHS, not by taxing more.',
    );
    // A restive party outranks a thin margin kept with every promise.
    const restive = verdictOf(gameWith(['safer-streets']), PRISONS, { rebellionRisk: 3 });
    expect(restive.kind.id).toBe('restive-party');
    // Size is measured, not assumed: big moves and small ones, each without a claim it cannot keep.
    const big = verdictOf(freshGame(), { ...PENNY, ...HEALTH_ABOVE_PLAN });
    expect(big.kind.id).toBe('big-moves');
    const small = verdictOf(freshGame(), { tob: 10 });
    expect(small.kind.id).toBe('small-moves');
    expect(small.kind.line.text).not.toMatch(/markets/i);
    for (const kind of ds.verdicts.kinds) {
      expect(`${kind.title} ${kind.line.text}`).not.toMatch(/OBR’s arithmetic|OBR’s test/);
    }
  });

  it('calls a margin thin under ten billion, as the markets do, and not above it', () => {
    const game = gameWith(['safer-streets']);
    // Every promise kept and the priority delivered; only the margin differs.
    const thin = verdictOf(game, THIN_MARGIN);
    expect(thin.headroomGbpm).toBeLessThan(THIN_HEADROOM_GBPM);
    expect(thin.kind.id).toBe('kept-everything-thin');
    // Over ten billion and under the old line (half the typical forecast error, about £16bn),
    // which once called this thin too.
    const modest = verdictOf(game, { ...PRISONS, ...UNPROMISED_TAXES });
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
