import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  freshGame,
  ratingOf,
  receptions,
  suggestedSettings,
  type GamePermalink,
  type Reception,
} from '../src/index.js';
import { loadDataset, outcomeOfFor, readJson } from './fixtures.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
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
function room(leverValues: Record<string, number>, game?: GamePermalink): Reception[] {
  const outcome = run(leverValues);
  return receptions({
    outcome,
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    outcomeOf,
    pm: ds.pm,
    incidence: ds.incidence,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) } : {}),
  });
}
const by = (list: Reception[], id: Reception['audience']) => {
  const r = list.find((x) => x.audience === id);
  if (!r) throw new Error(`no ${id}`);
  return r;
};
const FIGURE = /£\d|\d{3},\d{3}|\d+%/;
const SECURITY: GamePermalink = {
  ...freshGame(),
  priorities: ['defence', 'safer-streets'],
};

describe('cards that agree with their ratings (Phase 25)', () => {
  // Moves a player can make, one or two at a time; a sample of Budgets, not every one.
  const MOVES: Record<string, number>[] = [
    { itbr: 1 },
    { itbr: -1 },
    { vats: 1 },
    { hscl: 1 },
    { dhsc: 3 },
    { dhsc: -10 },
    { dfe: 5 },
    { moj: 10 },
    { cdel: 10 },
    { cdel: -10 },
    { rvpip: 1 },
    { rv2ch: 1 },
    { csjmh: 1 },
    { cgtalign: 1 },
    { wealth2: 1 },
    { nicpen: 1 },
    { it50: 1 },
    { fuel: -10 },
    { def3: 1 },
    { dip47: 1 },
    { wuc: -5 },
    { itpa: 1000 },
  ];
  const budgets = fc
    .subarray(MOVES, { maxLength: 5 })
    .map((picked) => picked.reduce<Record<string, number>>((acc, m) => ({ ...acc, ...m }), {}));
  const words = (s: string) => s.split(/\s+/).filter((w) => w && w !== '·').length;

  it('shows one reason that never contradicts the rating, and names the other side briefly', () => {
    fc.assert(
      fc.property(budgets, (values) => {
        for (const r of room(values, SECURITY)) {
          const lead = r.lead;
          if (r.rating > 3) expect(lead?.points, r.audience).toBeGreaterThan(0);
          if (r.rating < 3) expect(lead?.points, r.audience).toBeLessThan(0);
          if (r.rating === 3 && lead) expect(lead.points, r.audience).toBeLessThan(0);
          expect(r.reasons[0]).toBe(lead);
          // The other side, when there is one, in a line of eight words or fewer.
          const opposite = r.all.some((x) =>
            lead ? (lead.points < 0 ? x.points > 0 : x.points < 0) : false,
          );
          expect(r.counted !== undefined, r.audience).toBe(opposite);
          if (r.counted) {
            expect(r.counted.side).toBe(lead && lead.points < 0 ? 'for' : 'against');
            expect(
              words(`Counted ${r.counted.side}: ${r.counted.labels.join(' · ')}`),
            ).toBeLessThanOrEqual(8);
          }
          expect(r.tally.for).toBe(r.all.filter((x) => x.points > 0).length);
          expect(r.tally.against).toBe(r.all.filter((x) => x.points < 0).length);
        }
      }),
      { numRuns: 60, seed: 20260928 },
    );
  });

  it('writes levels without a plus, points of the economy in words, and causes in running words', () => {
    fc.assert(
      fc.property(budgets, (values) => {
        for (const r of room(values, SECURITY)) {
          for (const x of r.all) {
            expect(x.text, x.rule).not.toMatch(/of \+£|by \+|percentage points/);
            for (const cause of x.causes) expect(cause, x.rule).not.toMatch(/^[A-Z]/);
          }
        }
      }),
      { numRuns: 40, seed: 7 },
    );
  });

  it('never blames a saving for more borrowing, nor a rise for a thin margin', () => {
    // A welfare saving and a big health rise: borrowing is up because of the health rise only.
    const mixed = by(room({ rvpip: 1, dhsc: 10 }), 'markets');
    const borrowing = mixed.all.find((r) => r.rule === 'mk-borrowing');
    expect(borrowing?.points).toBe(-1);
    expect(borrowing?.causes).toContain('the health budget');
    expect(borrowing?.causes).not.toContain('the 2025 PIP cuts');
    const headroom = mixed.all.find((r) => r.rule === 'mk-headroom');
    expect(headroom?.points).toBeLessThan(0);
    expect(headroom?.causes).not.toContain('the 2025 PIP cuts');
    // A band that scores nothing names no cause for a level: "less than March left" is not the
    // player's doing.
    const modest = by(room({ dhsc: 1 }), 'markets').all.find((r) => r.rule === 'mk-headroom');
    if (modest?.points === 0) expect(modest.causes).toEqual([]);
  });

  it('says a margin above twenty billion truly: close to March, or more than March left', () => {
    const text = (values: Record<string, number>) =>
      by(room(values), 'markets').all.find((r) => r.rule === 'mk-headroom')?.text ?? '';
    // March's own headroom, £23.6bn: above twenty billion and close to what March left.
    expect(text({})).toMatch(
      /^Headroom of £23\.6bn, above the twenty billion .* close to what March left/,
    );
    // A levy on top: more than March left, and said so.
    expect(text({ hscl: 1 })).toMatch(
      /^Headroom of £\d+\.\dbn, more than the £23\.6bn March left\./,
    );
    expect(text({ dhsc: 5 })).toMatch(/typical forecast error of about £33bn\.$/);
  });

  it('names who pays from the groups that actually pay', () => {
    const broad = by(room({ itbr: 1 }), 'backbenchers').all.find((r) => r.rule === 'bb-who-pays');
    expect(broad?.text).toMatch(
      /^The new money comes mainly from everyone who earns or spends, not the top/,
    );
    const top = by(room({ it50: 1, wealth: 1, cgtalign: 1 }), 'backbenchers').all.find(
      (r) => r.rule === 'bb-who-pays',
    );
    expect(top?.text).toMatch(/^More is asked of the best-off than of everyone else/);
  });

  it('quotes one gilt yield across the files, and it is today’s', () => {
    const files = [
      readJson('journey/reception.json'),
      readJson('journey/households.json'),
      readJson('journey/briefings.json'),
    ].map((x) => JSON.stringify(x));
    for (const f of files) expect(f).not.toMatch(/5\.35%/);
    const gilts = context.readings.find((r) => r.id === 'gilt-10y');
    expect((gilts?.latest.value ?? 0).toFixed(1)).toBe('5.3');
    expect(files.join(' ')).toMatch(/about 5\.3%/);
  });
});

describe('three audiences, recalibrated on today’s estimate (Phase 25)', () => {
  /** Today's estimate: every game is played on it (Phase 24). */
  const ESTIMATE = suggestedSettings(context.readings, ds.levers);
  const PRIORITIES: GamePermalink = {
    ...freshGame(),
    priorities: ['nhs', 'defence', 'safer-streets'],
  };
  /** The three priorities, one way each, with nothing to pay for them. */
  const THREE = { dhsc: 3, dip47: 1, moj: 10, home: 5 };
  const at = (policy: Record<string, number>, game: GamePermalink = PRIORITIES) =>
    room({ ...ESTIMATE, ...policy }, game);
  const rule = (list: Reception[], audience: Reception['audience'], id: string) =>
    by(list, audience).all.find((r) => r.rule === id);
  const noun = (code: string) => ds.levers.find((l) => l.code === code)?.noun;

  it('measures the markets from before the Budget: doing nothing is Nervous, not Alarmed', () => {
    const nothing = at({});
    expect(by(nothing, 'markets').rating).toBe(2);
    expect(by(nothing, 'markets').label).toBe('Nervous');
    // Nothing moved, so borrowing has not changed: the economy since March is not the player's.
    expect(rule(nothing, 'markets', 'mk-borrowing')?.points).toBe(0);
    const headroom = rule(nothing, 'markets', 'mk-headroom');
    expect(headroom?.points).toBe(-1);
    expect(headroom?.text).toMatch(/not your measures\.$/);
    expect(headroom?.causes).toEqual([]);
  });

  it('makes a missed rule cost something with every audience', () => {
    const missing: Record<string, number>[] = [
      THREE,
      { dhsc: 10, dfe: 10, moj: 10, cdel: 20 },
      { itbr: -2 },
    ];
    for (const policy of missing) {
      const r = at(policy);
      const name = JSON.stringify(policy);
      expect(by(r, 'markets').rating, name).toBe(1);
      expect(by(r, 'backbenchers').rating, name).toBeLessThanOrEqual(3);
      expect(by(r, 'public').rating, name).toBeLessThanOrEqual(3);
      expect(rule(r, 'public', 'pb-rules-missed')?.points, name).toBe(-1);
      expect(rule(r, 'backbenchers', 'bb-rules-missed')?.points, name).toBe(-1);
    }
    // Either rule, the same cap, and the size of the miss in the reason: the engine's own margin.
    expect(rule(at(THREE), 'markets', 'mk-debt-rule')?.text).toMatch(
      /^The debt rule is missed by £\d+\.\dbn/,
    );
    expect(rule(at(THREE), 'markets', 'mk-headroom')?.text).toMatch(
      /^The day-to-day rule is missed by £\d+\.\dbn/,
    );
  });

  it('never rewards borrowing past the rules over paying for the same priorities', () => {
    const borrowed = at(THREE);
    // Paid for from the top, crossing no red line.
    const funded = at({ ...THREE, cgtalign: 1 });
    expect(by(borrowed, 'markets').rating).toBeLessThan(by(funded, 'markets').rating);
    expect(by(borrowed, 'backbenchers').rating).toBeLessThanOrEqual(
      by(funded, 'backbenchers').rating,
    );
    expect(by(borrowed, 'public').rating).toBeLessThanOrEqual(3);
    expect(by(borrowed, 'public').rating).toBeLessThanOrEqual(by(funded, 'public').rating);
  });

  it('sees cuts to services, counted one by one, never netted away', () => {
    const nhs = at({ dhsc: -10 });
    expect(by(nhs, 'public').rating).toBeLessThanOrEqual(3);
    const cuts = rule(nhs, 'public', 'pb-service-cuts');
    expect(cuts?.points).toBe(-2);
    expect(cuts?.text).toMatch(/^Cuts to the health budget: £\d+\.\dbn a year less than planned/);
    expect(rule(nhs, 'markets', 'mk-deep-cuts')?.points).toBe(-1);
    // Health and schools count from two billion: the walk's half-point trim costs nothing.
    expect(rule(at({ dhsc: -0.5 }), 'public', 'pb-service-cuts')?.points).toBe(0);
    expect(rule(at({ dhsc: -1 }), 'public', 'pb-service-cuts')?.points).toBe(-1);
    // Other services count from three billion.
    expect(rule(at({ home: -10 }), 'public', 'pb-service-cuts')?.points).toBe(0);
    // A cut is a cut even when another budget rises more, and the party hears both sides.
    const mixed = rule(at({ dhsc: 3, moj: -10, home: -10 }), 'backbenchers', 'bb-public-services');
    expect(mixed?.text).toMatch(/with cuts to the /);
  });

  it('keeps benefits out of public services, and hears welfare both ways', () => {
    const welfare: Record<string, number>[] = [
      { wuc: -5 },
      { wuc: 5 },
      { rvpip: 1 },
      { lha30: 1 },
      { csjmh: 1 },
    ];
    for (const policy of welfare) {
      expect(
        rule(at(policy), 'backbenchers', 'bb-public-services')?.points,
        JSON.stringify(policy),
      ).toBe(0);
    }
    expect(rule(at({ csjmh: 1 }), 'backbenchers', 'bb-welfare-cut')?.points).toBe(-2);
    expect(rule(at({ wuc: 5 }), 'backbenchers', 'bb-welfare-cut')?.points).toBe(1);
  });

  it('counts the taxes most households feel, and gives no point either way for taxing the top', () => {
    const banks = at({ bank5: 1, banklevy: 1, qelevy: 1 });
    expect(rule(banks, 'public', 'pb-tax-rises')?.points).toBe(0);
    const unfelt = rule(banks, 'public', 'pb-not-felt');
    expect(unfelt?.points).toBe(0);
    expect(unfelt?.text).toMatch(/most households will not feel it\.$/);
    // Employer National Insurance is felt, through pay and prices.
    const employers = rule(at({ nicer: 2 }), 'public', 'pb-tax-rises');
    expect(employers?.points).toBeLessThan(0);
    expect(employers?.text).toMatch(/felt through pay and prices/);
    // A higher-rate rise is the better-off paying, as the benches see it.
    expect(rule(at({ ithr: 2 }), 'backbenchers', 'bb-who-pays')?.points).toBe(1);
  });

  it('floors the public only for the manifesto’s own words; last year’s U-turn costs a point', () => {
    const twoChild = at({ rv2ch: 1 });
    expect(by(twoChild, 'public').rating).toBeGreaterThan(1);
    expect(rule(twoChild, 'public', 'pb-commitments')?.points).toBe(-1);
    expect(rule(twoChild, 'public', 'pb-manifesto')?.points).toBe(0);
    expect(rule(twoChild, 'public', 'pb-commitments')?.causes).toEqual([noun('rv2ch')]);
    // The benches still pay for it.
    expect(rule(twoChild, 'backbenchers', 'bb-welfare-reversals')?.points).toBe(-1);
    expect(rule(twoChild, 'backbenchers', 'bb-manifesto')?.points).toBe(0);
    // A defence trim strains a promise and is scored by nobody: the public is not furious.
    const trim = at({ mod: -1 });
    expect(by(trim, 'public').rating).toBeGreaterThan(1);
    expect(rule(trim, 'public', 'pb-manifesto-strain')?.points).toBe(0);
    // The tax lock still floors it.
    expect(by(at({ itbr: 1 }), 'public').rating).toBe(1);
  });

  it('credits a Budget paid for in every year, and marks borrowing that comes early', () => {
    const paid = rule(at({ dip47: 1, moj: 10, itbr: 1 }), 'markets', 'mk-paid-for');
    expect(paid?.points).toBe(1);
    expect(paid?.causes).toContain(noun('itbr'));
    // Nothing moved: nothing to pay for, and no point for it.
    expect(rule(at({}), 'markets', 'mk-paid-for')?.points).toBe(0);
    // Borrowed in some year: no point, and the borrowing says so elsewhere.
    expect(rule(at(THREE), 'markets', 'mk-paid-for')?.points).toBe(0);
    // Defence at 3% now costs most in 2027-28: the target year understates it.
    const front = rule(at({ def3: 1 }), 'markets', 'mk-front-loaded');
    expect(front?.points).toBe(-1);
    expect(front?.causes).toContain(noun('def3'));
  });

  it('takes three points to reach either end of the scale; a strain alone is never the floor', () => {
    expect(ratingOf([{ points: -2 }])).toBe(2);
    expect(ratingOf([{ points: -3 }])).toBe(1);
    expect(ratingOf([{ points: 2 }])).toBe(4);
    expect(ratingOf([{ points: 3 }])).toBe(5);
    expect(ratingOf([{ points: 2 }, { points: -1, cap: 3 }])).toBe(3);
    // Partners' National Insurance strains the tax lock and is small: the strain is all there is.
    const strained = at({ nicllp: 1 }, freshGame());
    expect(rule(strained, 'public', 'pb-manifesto-strain')?.points).toBe(-1);
    for (const r of strained) expect(r.rating, r.audience).toBeGreaterThan(1);
  });

  it('offers a nudge only when the better band would move the rating itself', () => {
    // Both priorities delivered and a felt tax rise: four either way, so nothing is offered.
    const four = at(
      { dip47: 1, moj: 10, ipt: 8 },
      { ...freshGame(), priorities: SECURITY.priorities },
    );
    expect(by(four, 'public').rating).toBe(4);
    const rises = rule(four, 'public', 'pb-tax-rises');
    expect(rises?.points).toBe(-1);
    expect(rises?.nudge).toBeUndefined();
    // Held at the floor by a red line, no other nudge can lift it.
    for (const r of by(at({ itbr: 1, nicer: 2 }), 'public').all) {
      if (r.rule !== 'pb-manifesto') expect(r.nudge, r.rule).toBeUndefined();
    }
  });
});

describe('graded delivery (Phase 25)', () => {
  const THREE: GamePermalink = { ...freshGame(), priorities: ['nhs', 'defence', 'schools-send'] };
  // One cheap way per priority: a care down-payment, the defence plan's gap, the Plan 2 threshold.
  const TOKEN = { mhclg: 5, dip47: 1, rvplan2: 1 };

  it('a token three-tick earns no more with the public or the party than delivering the same priorities in full', () => {
    const token = room(TOKEN, THREE);
    const full = room({ dhsc: 3, dip47: 1, dfe: 5 }, THREE);
    for (const audience of ['public', 'backbenchers'] as const) {
      expect(by(token, audience).rating, audience).toBeLessThanOrEqual(by(full, audience).rating);
    }
    const priorities = (list: Reception[]) =>
      by(list, 'public').all.find((r) => r.rule === 'pb-priorities');
    expect(priorities(token)?.points).toBeLessThan(priorities(full)?.points ?? 0);
    // It says so in words, and the words score nothing of their own.
    expect(priorities(token)?.text).toMatch(/only make a start/);
    const downing = by(token, 'backbenchers').all.find((r) => r.rule === 'bb-downing-street');
    expect(downing?.points).toBe(0);
    expect(downing?.text).toMatch(/some only make a start/);
    expect(by(full, 'backbenchers').all.find((r) => r.rule === 'bb-downing-street')?.text).toBe(
      'Everything agreed in Downing Street has something behind it in the Budget.',
    );
  });

  it('a token three-tick rates no better than the funded walk, audience by audience', () => {
    const token = room(TOKEN, THREE);
    const walk = room({ moj: 10, dip47: 1 }, SECURITY);
    for (const audience of ['backbenchers', 'markets', 'public'] as const) {
      expect(by(token, audience).rating, audience).toBeLessThanOrEqual(by(walk, audience).rating);
    }
  });
});

describe('what would have moved a rating', () => {
  it('says how far the reading was from the next better band, in the reading’s own unit', () => {
    // Employer NICs on pension contributions: a large tax rise that breaks no red line.
    const pub = by(room({ nicpen: 1 }), 'public');
    const rises = pub.all.find((r) => r.rule === 'pb-tax-rises');
    expect(rises?.points).toBeLessThan(0);
    expect(rises?.nudge).toMatch(
      /^£\d+\.\dbn less in tax rises would have lifted the public’s rating\.$/,
    );
    // The best band has nowhere better to go, so it says nothing.
    const small = by(room({ ved: 10 }), 'public').all.find((r) => r.rule === 'pb-tax-rises');
    expect(small?.points).toBe(0);
    expect(small?.nudge).toBeUndefined();
    // A rule with no authored nudge never gets one, whatever the band.
    const kept = pub.all.find((r) => r.rule === 'pb-manifesto');
    expect(kept?.nudge).toBeUndefined();
  });
});

describe('three audiences, five steps', () => {
  it('rates each audience one to five, deterministically, with a label from the data', () => {
    const budget = { dhsc: 3, itbr: 1, socrent: 1 };
    const a = room(budget);
    expect(a).toEqual(room(budget));
    expect(a.map((r) => r.audience)).toEqual(['backbenchers', 'markets', 'public']);
    for (const r of a) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
      const audience = ds.reception.audiences.find((x) => x.id === r.audience);
      expect(audience?.labels).toContain(r.label);
      expect(r.reasons.length).toBeLessThanOrEqual(3);
      expect(r.all).toHaveLength(audience?.rules.length ?? -1);
      expect(r.badge).toBe('simulated');
    }
    // An empty Budget: the backbenchers and the public shrug, the markets take March's headroom.
    const base = room({});
    expect(by(base, 'backbenchers').label).toBe('Divided');
    expect(by(base, 'public').label).toBe('Shrugging');
    expect(by(base, 'markets').rating).toBe(4);
  });

  it('pins the public at the floor when a manifesto red line is crossed, whatever else happens', () => {
    const lock = by(room({ moj: 10, dip47: 1, itbr: 1, fuel: -10 }, SECURITY), 'public');
    expect(lock.rating).toBe(1);
    expect(lock.label).toBe('Furious');
    expect(lock.reasons[0]?.text).toMatch(/manifesto promise has been broken/);
    // The same Budget paid for without crossing a line is liked.
    const base = by(room({ moj: 10, dip47: 1, iht: 10, fuel: -10 }, SECURITY), 'public');
    expect(base.rating).toBeGreaterThan(3);
    expect(base.reasons.some((r) => /of the Budget’s priorities/.test(r.text))).toBe(true);
    // Missing a rule by arithmetic is not a manifesto break: no floor.
    expect(by(room({ def5: 1 }, SECURITY), 'public').rating).toBeGreaterThan(1);
  });

  it('marks a strain amber: the levy alone leaves the public above the floor, with the strain named', () => {
    const budget = { moj: 10, dip47: 1, hscl: 1 };
    const pub = by(room(budget, SECURITY), 'public');
    expect(pub.rating).toBeGreaterThan(1);
    expect(pub.all.find((r) => r.rule === 'pb-manifesto')?.points).toBe(0);
    expect(pub.all.find((r) => r.rule === 'pb-manifesto-strain')?.points).toBe(-1);
    expect(pub.all.find((r) => r.rule === 'pb-manifesto-strain')?.text).toMatch(
      /kept in the words and tested in the spirit/,
    );
    const benches = by(room(budget, SECURITY), 'backbenchers');
    expect(benches.all.find((r) => r.rule === 'bb-manifesto-strain')?.points).toBe(-1);
    // Paid for by the penny instead: the floor, and the strain rule has nothing to add.
    const penny = by(room({ moj: 10, dip47: 1, itbr: 1 }, SECURITY), 'public');
    expect(penny.rating).toBe(1);
    expect(penny.all.find((r) => r.rule === 'pb-manifesto-strain')?.points).toBe(0);
  });

  it('warms the backbenchers to services funded from the top, and cools them to cuts', () => {
    const labour = by(room({ dhsc: 5, dfe: 3, it50: 1, wealth: 1, iht: 10 }), 'backbenchers');
    const austere = by(room({ dhsc: -5, dfe: -5, rv2ch: 1, fuel: 10 }), 'backbenchers');
    expect(labour.rating).toBeGreaterThan(austere.rating);
    expect(labour.rating).toBeGreaterThanOrEqual(4);
    expect(austere.rating).toBeLessThanOrEqual(2);
    expect(
      austere.reasons.some((r) => /welfare cut the party fought to reverse/.test(r.text)),
    ).toBe(true);
    expect(labour.reasons.some((r) => /best-off/.test(r.text))).toBe(true);
  });

  it('lowers the markets when headroom is thin or a rule missed, and raises them for a margin', () => {
    const base = by(room({}), 'markets');
    const thin = by(room({ dhsc: 8 }), 'markets');
    const missed = by(room({ def5: 1 }), 'markets');
    // A certified saving, not a relief cost: the markets doubt those (Phase 25).
    const ample = by(room({ dhsc: -5 }), 'markets');
    expect(thin.rating).toBeLessThan(base.rating);
    expect(missed.rating).toBeLessThanOrEqual(2);
    expect(missed.label).toBe('Alarmed');
    expect(missed.reasons.some((r) => /day-to-day rule is missed/.test(r.text))).toBe(true);
    expect(missed.reasons.some((r) => r.causes.includes('Defence to 5% of GDP'))).toBe(true);
    expect(ample.rating).toBeGreaterThanOrEqual(base.rating);
  });

  it('doubts a yield that rests on HMRC’s cost of a relief, and says which kind of figure it is', () => {
    // Employer NICs on pensions is Worked out, but its base is HMRC's cost of a relief.
    const relief = by(room({ nicpen: 1 }), 'markets');
    const doubted = relief.all.find((r) => r.rule === 'mk-credibility');
    expect(doubted?.points).toBe(-1);
    expect(doubted?.text).toMatch(/what tax breaks cost today/);
    expect(doubted?.causes).toContain(ds.levers.find((l) => l.code === 'nicpen')?.noun);
    // A think tank's figure is doubted in other words.
    const other = by(room({ qelevy: 1 }), 'markets');
    const doubtedOther = other.all.find((r) => r.rule === 'mk-credibility');
    expect(doubtedOther?.text).toMatch(/nobody has certified/);
    // HMRC's certified rows raise no doubt.
    const certified = by(room({ itbr: 1 }), 'markets');
    expect(certified.all.find((r) => r.rule === 'mk-credibility')?.points).toBe(0);
  });

  it('says nothing that is not in the data, and quotes no figure a band cannot source', () => {
    const templates = ds.reception.audiences.flatMap((a) =>
      a.rules.flatMap((r) =>
        r.bands.flatMap((b) => [b.text, ...(b.variants ?? []).map((v) => v.text)]),
      ),
    );
    const matches = (template: string, text: string) => {
      const pattern = template
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(
          /\\\{(value|abs|typicalError|payers|feltHow|protected|protectedCut|cutServices|year|lateFrom)\\\}/g,
          '.+?',
        );
      return new RegExp(`^${pattern}$`).test(text);
    };
    for (const r of room({ itbr: 3, def5: 1, rv2ch: 1 }, SECURITY)) {
      for (const reason of r.all) {
        expect(
          templates.some((t) => matches(t, reason.text)),
          reason.text,
        ).toBe(true);
      }
    }
    for (const a of ds.reception.audiences) {
      expect(a.labels).toHaveLength(5);
      for (const rule of a.rules) {
        for (const band of rule.bands) {
          expect(band.badge).toBe('simulated');
          const words = band.text.replace(
            /\{(value|abs|typicalError|payers|feltHow|protected|protectedCut|cutServices|year|lateFrom)\}/g,
            '',
          );
          if (FIGURE.test(words)) {
            expect(
              band.sources.length,
              `${rule.id}/${band.id} quotes a figure without a source`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('keeps every rating in one to five, however the points and caps fall', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            points: fc.integer({ min: -3, max: 3 }),
            cap: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          }),
          { maxLength: 8 },
        ),
        (reasons) => {
          const rating = ratingOf(reasons);
          expect(rating).toBeGreaterThanOrEqual(1);
          expect(rating).toBeLessThanOrEqual(5);
          for (const r of reasons)
            if (r.cap !== undefined) expect(rating).toBeLessThanOrEqual(r.cap);
        },
      ),
    );
    // And over real packages: a handful of levers at random settings.
    const codes = ['itbr', 'dhsc', 'cdel', 'rv2ch', 'def3', 'fuel', 'wealth'];
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -2, max: 2 }), { minLength: 7, maxLength: 7 }),
        (v) => {
          const values: Record<string, number> = {};
          codes.forEach((code, i) => {
            const lever = ds.levers.find((l) => l.code === code);
            if (!lever) return;
            const n = v[i] ?? 0;
            const value = Math.max(
              lever.control.min,
              Math.min(lever.control.max, n * lever.control.step * 2),
            );
            if (value !== lever.control.default) values[code] = value;
          });
          for (const r of room(values, SECURITY)) {
            expect(r.rating).toBeGreaterThanOrEqual(1);
            expect(r.rating).toBeLessThanOrEqual(5);
          }
        },
      ),
      { numRuns: 12 },
    );
  });
});
