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
function room(leverValues: Record<string, number>, game?: GamePermalink): Reception[] {
  const outcome = run(leverValues);
  return receptions({
    outcome,
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    pm: ds.pm,
    incidence: ds.incidence,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, outcome, ds.levers) } : {}),
  });
}
const by = (list: Reception[], id: Reception['audience']) => {
  const r = list.find((x) => x.audience === id);
  if (!r) throw new Error(`no ${id}`);
  return r;
};
const FIGURE = /£\d|\d{3},\d{3}|\d+%/;
const SECURITY: GamePermalink = {
  ...freshGame(7),
  themes: ['security'],
  priorities: ['prisons', 'dip-gap'],
};

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
    expect(base.reasons.some((r) => /One of the Budget’s themes/.test(r.text))).toBe(true);
    // Missing a rule by arithmetic is not a manifesto break: no floor.
    expect(by(room({ def5: 1 }, SECURITY), 'public').rating).toBeGreaterThan(1);
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
    const ample = by(room({ vatfood: 1 }), 'markets');
    expect(thin.rating).toBeLessThan(base.rating);
    expect(missed.rating).toBeLessThanOrEqual(2);
    expect(missed.label).toBe('Alarmed');
    expect(missed.reasons.some((r) => /stability rule is missed/.test(r.text))).toBe(true);
    expect(missed.reasons.some((r) => r.causes.includes('Defence to 5% of GDP'))).toBe(true);
    expect(ample.rating).toBeGreaterThanOrEqual(base.rating);
  });

  it('says nothing that is not in the data, and quotes no figure a band cannot source', () => {
    const templates = ds.reception.audiences.flatMap((a) =>
      a.rules.flatMap((r) => r.bands.map((b) => b.text)),
    );
    const matches = (template: string, text: string) => {
      const pattern = template
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{value\\\}/g, '.+?')
        .replace(/\\\{abs\\\}/g, '.+?');
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
          const words = band.text.replace(/\{value\}|\{abs\}/g, '');
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
