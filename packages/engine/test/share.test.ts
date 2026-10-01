import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FINAL_STAGE,
  GAME_SETTINGS,
  PICTURE_ROWS,
  ambitionStatus,
  budgetTheme,
  decodePermalink,
  encodePermalink,
  gameImplementationYear,
  gameOutcomeOf,
  headroomWords,
  missedBy,
  pictureRows,
  preBudget,
  readFinishedBudget,
  receptions,
  reconcile,
  reconcileWords,
  summariseBudget,
  summaryWords,
  typicalErrorGbpm,
  type ChangeRow,
  type GameData,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, wording } from './fixtures.js';
import {
  DEBT_RULE_MISSED,
  SECURITY,
  TAXES_AT_THE_TOP,
  WALK,
  latestContext,
  todaysEstimate,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const data: GameData = { ...ds, context: latestContext(ds) };
const estimate = todaysEstimate(ds);
const outcomeOf = gameOutcomeOf(data);
const live = ds.levers.filter((l) => l.status === 'reviewed' && !l.deprecated);

/** A link to a Budget, as the web writes one. */
function link(values: Budget, game?: GamePermalink, codes = data): string {
  return encodePermalink(
    {
      vintageCode: codes.vintage.permalinkCode,
      rulesCode: codes.rules.permalinkCode,
      implementationYear: gameImplementationYear(codes.vintage),
      leverValues: values,
      ...GAME_SETTINGS,
      ...(game ? { game } : {}),
    },
    ds.levers,
  );
}
const finished = (priorities: readonly string[] = []): GamePermalink => ({
  reached: FINAL_STAGE,
  priorities: [...priorities],
});
const read = (values: Budget, priorities: readonly string[] = []) => {
  const budget = readFinishedBudget(data, link({ ...estimate, ...values }, finished(priorities)));
  if (!budget) throw new Error('not read as a finished Budget');
  return budget;
};

describe('a finished Budget read from its link', () => {
  it('is read only from a game at Budget day', () => {
    expect(readFinishedBudget(data, link(WALK))).toBeNull();
    expect(
      readFinishedBudget(data, link(WALK, { reached: FINAL_STAGE - 1, priorities: [] })),
    ).toBeNull();
    expect(readFinishedBudget(data, 'not a link at all')).toBeNull();
    expect(readFinishedBudget(data, link(WALK, finished()))).not.toBeNull();
  });

  it('puts every link to the same choices in one form, on today’s codes and estimate', () => {
    const canonical = read(WALK, SECURITY);
    // Whatever a link says of the economy, the game plays today's estimate (ADR-0025).
    const odd = Object.fromEntries(Object.keys(estimate).map((code) => [code, 2]));
    const other = readFinishedBudget(data, link({ ...WALK, ...odd }, finished(SECURITY)));
    expect(other).toEqual(canonical);
    const params = new URLSearchParams(canonical.query);
    expect(params.get('f')).toBe(data.vintage.permalinkCode);
    expect(params.get('r')).toBe(data.rules.permalinkCode);
    for (const [code, value] of Object.entries(estimate)) {
      const lever = ds.levers.find((l) => l.code === code);
      if (value !== lever?.control.default) expect(canonical.leverValues[code]).toBe(value);
    }
  });

  it('keeps only the priorities the game knows, at most three, in their order', () => {
    const budget = read(WALK, ['defence', 'not-a-priority', ...ds.pm.priorities.map((p) => p.id)]);
    const known = new Set(ds.pm.priorities.map((p) => p.id));
    expect(budget.game.priorities.length).toBeLessThanOrEqual(3);
    expect(budget.game.priorities[0]).toBe('defence');
    expect(budget.game.priorities.every((id) => known.has(id))).toBe(true);
    expect(budget.game.reached).toBe(FINAL_STAGE);
  });

  it('reads its own link back unchanged, every value on its lever’s steps (property)', () => {
    const lever = fc.constantFrom(...live.filter((l) => l.category !== 'macro'));
    const values = fc
      .array(
        lever.chain((l) =>
          fc.tuple(
            fc.constant(l),
            fc.double({ min: l.control.min, max: l.control.max, noNaN: true }),
          ),
        ),
        { maxLength: 8 },
      )
      .map((pairs) => Object.fromEntries(pairs.map(([l, v]) => [l.code, v])));
    const priorities = fc.subarray(ds.pm.priorities.map((p) => p.id));
    fc.assert(
      fc.property(values, priorities, (budget, ids) => {
        const first = readFinishedBudget(data, link(budget, finished(ids)));
        expect(first).not.toBeNull();
        if (!first) return;
        expect(readFinishedBudget(data, first.query)).toEqual(first);
        expect(decodePermalink(first.query, ds.levers).state.leverValues).toEqual(
          first.leverValues,
        );
        for (const [code, value] of Object.entries(first.leverValues)) {
          const l = ds.levers.find((x) => x.code === code);
          if (!l) throw new Error(code);
          expect(value).not.toBe(l.control.default);
          expect(value).toBeGreaterThanOrEqual(l.control.min);
          expect(value).toBeLessThanOrEqual(l.control.max);
        }
      }),
      { numRuns: 60, seed: 20261001 },
    );
  });
});

describe('a finished Budget summed up', () => {
  it('says the engine’s own figures: the review’s reconciliation, the theme and the three ratings', () => {
    const budget = read(WALK, SECURITY);
    const summary = summariseBudget(data, budget, outcomeOf);
    const outcome = outcomeOf(budget.leverValues);
    const r = reconcile(outcome, preBudget(outcomeOf, budget.leverValues, ds.levers));
    expect(summary.year).toBe(r.year);
    expect(summary.headroom).toEqual({ startGbpm: r.startGbpm, endGbpm: r.endGbpm });
    expect(summary.headroomLine).toBe(headroomWords(r));
    expect(summary.moves).toEqual(reconcileWords(r));
    expect(summary.theme).toBe(budgetTheme(ds.pm, budget.game.priorities));
    const room = receptions({
      outcome,
      levers: ds.levers,
      reception: ds.reception,
      typicalErrorGbpm: typicalErrorGbpm(ds.vintage, outcome),
      outcomeOf,
      pm: ds.pm,
      incidence: ds.incidence,
      game: budget.game,
      status: ambitionStatus(budget.game, ds.pm, ds.options, outcome, ds.levers),
    });
    expect(summary.ratings.map((x) => [x.audience, x.rating, x.label])).toEqual(
      room.map((x) => [x.audience, x.rating, x.label]),
    );
  });

  it('lists every moved lever on its side, biggest first', () => {
    const summary = summariseBudget(data, read(WALK, SECURITY), outcomeOf);
    const moved = Object.keys(WALK);
    expect([...summary.tax, ...summary.spending].map((r) => r.code).sort()).toEqual(moved.sort());
    for (const side of [summary.tax, summary.spending]) {
      const sizes = side.map((r) => Math.abs(r.gbpm));
      expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    }
    expect(summary.tax.every((r) => r.side === 'tax')).toBe(true);
    expect(summary.spending.every((r) => r.side === 'spending')).toBe(true);
  });

  it('names a missed rule by its margin, and meets them when it does', () => {
    expect(summariseBudget(data, read(WALK, SECURITY), outcomeOf).rules).toEqual({
      met: true,
      welfareOnly: false,
      missed: [],
    });
    const missed = summariseBudget(data, read(DEBT_RULE_MISSED), outcomeOf).rules;
    expect(missed.met).toBe(false);
    expect(missed.missed.length).toBeGreaterThan(0);
    for (const words of missed.missed) expect(words).toMatch(/^the .+ by £\d+\.\dbn$/);
  });

  it('shows three rows a side on the picture, or two and how many more', () => {
    const rows = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ code: `x${i}` }) as ChangeRow);
    expect(pictureRows(rows(PICTURE_ROWS))).toEqual({ shown: rows(PICTURE_ROWS), more: 0 });
    const many = pictureRows(rows(PICTURE_ROWS + 4));
    expect(many.shown.length + many.more).toBe(PICTURE_ROWS + 4);
    expect(many.shown.length).toBe(PICTURE_ROWS - 1);
  });

  it('says a Budget in words (snapshot, £ masked)', () => {
    const budgets: Record<string, [Budget, readonly string[]]> = {
      'rules met': [WALK, SECURITY],
      'debt rule missed, no priorities': [DEBT_RULE_MISSED, []],
      'a tax that starts later': [TAXES_AT_THE_TOP, ['defence']],
    };
    const words = Object.fromEntries(
      Object.entries(budgets).map(([name, [values, priorities]]) => {
        const said = summaryWords(summariseBudget(data, read(values, priorities), outcomeOf));
        return [name, Object.fromEntries(Object.entries(said).map(([k, v]) => [k, wording(v)]))];
      }),
    );
    expect(words).toMatchSnapshot();
  });

  it('keeps what a player posts short enough to post with its link on X', () => {
    // The longest name the game can give a Budget, with every rule missed by the most the words
    // can say: X counts a link as 23 characters, and a post as 280.
    const ids = ds.pm.priorities.map((p) => p.id);
    const themes = ids.flatMap((a) =>
      ids.flatMap((b) =>
        ids.flatMap((c) =>
          new Set([a, b, c]).size === 3 ? [budgetTheme(ds.pm, [a, b, c]) ?? ''] : [],
        ),
      ),
    );
    const longest = themes.reduce((x, y) => (y.length > x.length ? y : x), '');
    const summary = summariseBudget(data, read(DEBT_RULE_MISSED), outcomeOf);
    const missed = outcomeOf({}).verdicts.map((v) => missedBy({ ...v, headroomGbpm: -999_949 }));
    const { share } = summaryWords({
      ...summary,
      theme: longest,
      rules: { met: false, welfareOnly: false, missed },
    });
    expect(missed.length).toBeGreaterThan(1);
    expect(share).toContain(longest.slice(2));
    expect(share.length + 1 + 23).toBeLessThanOrEqual(280);
  });
});
