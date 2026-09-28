import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  freshGame,
  ratingOf,
  receptions,
  type GamePermalink,
  type Reception,
} from '../src/index.js';
import { loadDataset, readJson } from './fixtures.js';

const ds = loadDataset();
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
      /^£\d+\.\dbn less in tax rises would have moved this by a point\.$/,
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
        .replace(/\\\{(value|abs|typicalError|payers)\\\}/g, '.+?');
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
          const words = band.text.replace(/\{(value|abs|typicalError|payers)\}/g, '');
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
