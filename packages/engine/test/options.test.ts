import { describe, expect, it } from 'vitest';
import type { CurrentBudgetRule, DeliverOption, Settings } from '../src/index.js';
import {
  allOptions,
  blockedBy,
  computeOutcome,
  deliverOptionsFor,
  deskLevers,
  finetuneItems,
  fyStart,
  onShowInBasic,
  optionPrice,
  promiseBreaks,
  resolveTargetYear,
  shortlistedWays,
  optionByLever,
  optionConflicts,
  optionEarliestStart,
  optionOff,
  optionOverlaps,
  optionRedLines,
  optionState,
  optionsFileSchema,
  policyYearsOf,
  validateDataset,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import { EMPLOYER_NICS, PENNY, latestContext, todaysEstimate } from './scenarios.js';

const ds = loadDataset();
const options = ds.options;
const levers = ds.levers;
/** The levers step 4 offers: every policy lever, since Phase 26. */
const offered = new Set(finetuneItems(ds.finetune).map((i) => i.code));
/** The value, or a failure that says what the data no longer has for a test to use. */
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`the data has no ${what} to test with`);
  return value;
}
const deliverOption = (id: string) =>
  must(
    options.deliver.find((x) => x.id === id),
    `option ${id}`,
  );
const lever = (code: string) =>
  must(
    levers.find((l) => l.code === code),
    `lever ${code}`,
  );
/** The ways that set one lever, beyond where it rests by more than a step, and the lever's values. */
const singles = options.deliver.flatMap((o) => {
  const [entry, ...more] = Object.entries(o.values);
  if (!entry || more.length > 0) return [];
  const [code, target] = entry;
  const { default: base, step } = lever(code).control;
  return Math.abs(target - base) > step ? [{ option: o, code, target, base, step }] : [];
});
const run = (values: Record<string, number>, settings: Partial<Settings> = {}) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers,
    settings: {
      leverValues: values,
      implementationYear: ds.vintage.years.forecast[1] ?? '',
      ...settings,
    },
  });

describe('the options (ADR-0022): since Phase 24, the ways to deliver the priorities', () => {
  it('validate:data accepts the file, and every option moves a real lever off its default', () => {
    expect(validateDataset(ds)).toEqual([]);
    const byCode = new Map(levers.map((l) => [l.code, l] as const));
    for (const o of options.deliver) {
      for (const [code, value] of Object.entries(o.values)) {
        const lever = byCode.get(code);
        expect(lever, `${o.id} names ${code}`).toBeDefined();
        expect(value, `${o.id} leaves ${code} alone`).not.toBe(lever?.control.default);
      }
    }
  });

  it('no lever appears in two options, so no card can light or undo another', () => {
    const codes = options.deliver.flatMap((o) => Object.keys(o.values));
    expect(new Set(codes).size).toBe(codes.length);
    const byLever = optionByLever(options);
    expect(byLever.size).toBe(codes.length);
    for (const o of options.deliver) {
      for (const code of Object.keys(o.values))
        expect(byLever.get(code)?.title, code).toBe(o.title);
    }
    // The ways to pay became step 4's levers and the add-ons went (ADR-0025): a lever no option
    // sets belongs to none.
    expect(allOptions(options)).toHaveLength(options.deliver.length);
    const unset = must(
      levers.find((l) => !codes.includes(l.code)),
      'lever no option sets',
    );
    expect(byLever.get(unset.code)).toBeUndefined();
  });

  it('every priority named has two to five ways to deliver it', () => {
    for (const { id } of ds.pm.priorities) {
      const n = deliverOptionsFor(id, options).length;
      expect(n, id).toBeGreaterThanOrEqual(2);
      expect(n, id).toBeLessThanOrEqual(5);
    }
  });

  it('reads on, adjusted and off from the lever values', () => {
    const [one, two] = singles;
    if (!one || !two) throw new Error('the data has no two ways that each set one lever');
    const way = one.option;
    const toward = one.base + Math.sign(one.target - one.base) * one.step;
    expect(optionState(way, {}, levers)).toBe('off');
    expect(optionState(way, { [one.code]: one.target }, levers)).toBe('on');
    // Past the target still delivers it; short of it is a way adjusted.
    expect(optionState(way, { [one.code]: one.target + (one.target - one.base) }, levers)).toBe(
      'on',
    );
    expect(optionState(way, { [one.code]: toward }, levers)).toBe('adjusted');
    expect(optionState(way, { [two.code]: two.target }, levers)).toBe('off');
    const pair = { id: 'pair', values: { [one.code]: one.target, [two.code]: two.target } };
    expect(optionState(pair, { [one.code]: one.target }, levers)).toBe('adjusted');
    expect(optionState(pair, pair.values, levers)).toBe('on');
    expect(optionOff(pair, levers)).toEqual({ [one.code]: one.base, [two.code]: two.base });
  });

  it('carries the latest earliest start of its levers', () => {
    const floor = (code: string) => lever(code).earliestStart?.year;
    for (const o of options.deliver) {
      const floors = Object.keys(o.values)
        .map(floor)
        .filter((y): y is string => y !== undefined)
        .sort((a, b) => fyStart(b) - fyStart(a));
      expect(optionEarliestStart(o, levers), o.id).toBe(floors[0]);
    }
    // A bundle of two waits for the later of their floors.
    const floored = levers
      .filter((l) => l.earliestStart)
      .sort((a, b) => fyStart(floor(a.code) ?? '') - fyStart(floor(b.code) ?? ''));
    const [early, late] = [floored[0], floored[floored.length - 1]];
    if (!early || !late) throw new Error('the data has no lever with an earliest start');
    const both = { id: 'both', values: { [early.code]: 1, [late.code]: 1 } };
    expect(optionEarliestStart(both, levers)).toBe(floor(late.code));
  });

  it('names the red line a lever is watched by, and whether the Budget would cross it', () => {
    const lock = ds.pm.promises.find((p) => p.id === 'tax-lock');
    const bundle = (values: Record<string, number>) => ({ id: 'b', values: { ...values } });
    // Each carries the promise's id and short name for its resting tag (Phase 25).
    const red = { manifesto: true, scored: true, id: 'tax-lock', tag: 'Tax lock' };
    expect(optionRedLines(bundle(PENNY), ds.pm.promises, levers, {})).toEqual([
      { promise: lock?.title, when: 'above', severity: 'breaks', broken: true, ...red },
    ]);
    // Employer National Insurance keeps the pledge's words and tests its spirit: amber (Phase 23).
    expect(optionRedLines(bundle(EMPLOYER_NICS), ds.pm.promises, levers, {})).toEqual([
      { promise: lock?.title, when: 'above', severity: 'strains', broken: true, ...red },
    ]);
    // A saving that breaks a promise when switched on.
    const limit = optionRedLines(deliverOption('two-child-limit'), ds.pm.promises, levers, {});
    expect(limit.map((l) => l.broken)).toEqual([true]);
    // A Budget 2025 decision, not the manifesto's words (Phase 25).
    expect(limit.map((l) => l.manifesto)).toEqual([false]);
    // A health cut strains the 18-week target, shown and scored by nobody.
    const health = optionRedLines(bundle({ dhsc: -1 }), ds.pm.promises, levers, {});
    expect(health.map((l) => [l.severity, l.scored])).toEqual([['strains', false]]);
  });

  it('warns when an option meets a lever already moved that it interacts with', () => {
    // Ending the freeze early names the basic rate from its own side of the pair.
    const freeze = deliverOption('freeze-early');
    expect(optionOverlaps(freeze, levers, new Set())).toEqual([]);
    const hits = optionOverlaps(freeze, levers, new Set(['itbr']));
    expect(hits.map((h) => [h.withLever.code, h.severity, h.active])).toEqual([
      ['itbr', 'info', true],
    ]);
  });

  it('names a partner before either moves when another option or step 4 offers it', () => {
    // The freeze and the basic rate interact; the basic rate is on the fine-tuning screen, so the
    // card names it before anything moves, and quotes the interaction once it has.
    const freeze = deliverOption('freeze-early');
    const quiet = optionOverlaps(freeze, levers, new Set(), options);
    expect(quiet.map((o) => [o.withLever.code, o.active, o.option])).toEqual([
      ['itbr', false, undefined],
    ]);
    // Without the options file, nothing is named before it moves.
    expect(optionOverlaps(freeze, levers, new Set())).toEqual([]);
    const loud = optionOverlaps(freeze, levers, new Set(['itbr']), options);
    expect(loud[0]?.active).toBe(true);
    // The April 2027 freeze (Phase 25) and a fuel duty cut both set the duty: a warning the card
    // names at once, because the freeze is one of step 4's levers, read from its own side.
    const fuel = optionOverlaps(deliverOption('fuel-duty-cut'), levers, new Set(), options);
    expect(fuel.map((o) => [o.withLever.code, o.severity])).toEqual([['fuelfrz', 'warn']]);
    // Another option is named as the option: the 3% path and a day-to-day uplift add up.
    const three = optionOverlaps(deliverOption('three-per-cent-now'), levers, new Set(), options);
    expect(three.find((o) => o.withLever.code === 'mod')?.option?.id).toBe('defence-uplift');
    // Every policy lever is on step 4 (Phase 26), so the gas card names each partner at once,
    // read from either side of the pair, and quotes the one that has moved.
    const live = levers.filter((l) => !l.deprecated && l.category !== 'macro');
    expect(live.filter((l) => !offered.has(l.code)).map((l) => l.code)).toEqual([]);
    const gas = deliverOption('vat-off-gas');
    expect(
      optionOverlaps(gas, levers, new Set(), options).map((o) => [o.withLever.code, o.active]),
    ).toEqual([
      ['vatnrg', false],
      ['vatr', false],
      ['vatelec', false],
    ]);
    const moved = optionOverlaps(gas, levers, new Set(['vatr']), options);
    expect(moved.filter((o) => o.active).map((o) => o.withLever.code)).toEqual(['vatr']);
    // A pair authored as a conflict is not an overlap as well: the conflict says it.
    expect(three.some((o) => o.withLever.code === 'dip47')).toBe(false);
  });

  it('reads a conflict from either side, and blocks the other option while one is in the Budget', () => {
    const gap = deliverOption('dip-gap');
    const three = deliverOption('three-per-cent-now');
    // Authored on the 3% option, seen from the gap's side too.
    const fromGap = optionConflicts(gap, options, levers, {});
    expect(fromGap.map((c) => [c.option.id, c.partner])).toEqual([['three-per-cent-now', 'off']]);
    expect(fromGap[0]?.text).toMatch(/Funding both counts some money twice/);
    expect(optionConflicts(three, options, levers, { dip47: 1 })[0]?.partner).toBe('on');
    // Nothing chosen: nothing blocked. The 3% option on: the gap is blocked, and says by what.
    expect(blockedBy(gap, options, levers, {})).toBeUndefined();
    expect(blockedBy(gap, options, levers, { def3: 1 })?.option.id).toBe('three-per-cent-now');
    // Both on (from the desk): neither is blocked, both can be put back.
    expect(blockedBy(three, options, levers, { def3: 1, dip47: 1 })).toBeUndefined();
    expect(blockedBy(gap, options, levers, { def3: 1, dip47: 1 })).toBeUndefined();
    // The two PIP reforms on one caseload, likewise; a partner adjusted blocks too.
    const pip = deliverOption('pip-changes');
    expect(blockedBy(pip, options, levers, { csjmh: 1 })?.option.id).toBe('mental-health-reset');
    expect(fromGap).toHaveLength(1);
  });

  it('every option, on its own, moves money in some policy year', () => {
    const years = policyYearsOf(ds.vintage);
    for (const o of options.deliver) {
      const out = run(o.values);
      const moved = out.leverEffects.some((e) =>
        years.some(
          (y) =>
            Math.abs(e.receipts[y] ?? 0) +
              Math.abs(e.currentSpending[y] ?? 0) +
              Math.abs(e.capitalSpending[y] ?? 0) >
            0,
        ),
      );
      expect(moved, o.id).toBe(true);
    }
  });

  it('the schema refuses two options on one lever, a conflict that names nobody, and the retired lists', () => {
    const line = { text: 'x', sources: [], badge: 'simulated' as const };
    const advice = {
      adviser: 'director-of-public-spending',
      text: 'x',
      sources: [{ sourceId: 'obr-efo-2026-03' }],
      badge: 'simulated' as const,
    };
    const scale = (kind: 'full' | 'start') => ({
      kind,
      why: 'x',
      sources: [{ sourceId: 'obr-efo-2026-03' }],
      badge: 'simulated' as const,
    });
    const option = (
      id: string,
      title: string,
      values: Record<string, number>,
      kind: 'full' | 'start' = 'full',
    ) => ({
      id,
      priority: 'p',
      title,
      line,
      advice,
      values,
      scale: scale(kind),
    });
    const settled = {
      role: 'Chief Secretary to the Treasury',
      text: 'x',
      sources: [{ sourceId: 'hmt-sr25-del-tables' }],
      badge: 'simulated' as const,
    };
    const base = {
      schemaVersion: 1 as const,
      settled,
      deliver: [option('a', 'A', { dhsc: 3 }), option('b', 'B', { dfe: 5 }, 'start')],
    };
    expect(optionsFileSchema.safeParse(base).success).toBe(true);
    // Graded delivery (Phase 25): every option says whether it delivers in full or makes a start,
    // and every priority has at least one way to deliver it in full.
    const unscaled: Record<string, unknown> = { ...option('a', 'A', { dhsc: 3 }) };
    delete unscaled.scale;
    expect(
      optionsFileSchema.safeParse({ ...base, deliver: [unscaled, base.deliver[1]] }).success,
    ).toBe(false);
    expect(
      optionsFileSchema.safeParse({
        ...base,
        deliver: [option('a', 'A', { dhsc: 3 }, 'start'), base.deliver[1]],
      }).success,
    ).toBe(false);
    const unsettled: Record<string, unknown> = { ...base };
    delete unsettled.settled;
    expect(optionsFileSchema.safeParse(unsettled).success).toBe(false);
    // Two options on one lever.
    expect(
      optionsFileSchema.safeParse({
        ...base,
        deliver: [...base.deliver, option('c', 'C', { dhsc: 5 })],
      }).success,
    ).toBe(false);
    // Conflicts: an unknown partner, a self conflict, a pair authored on both sides; one side is fine.
    const withConflicts = (
      a: { with: string; text: string }[],
      b?: { with: string; text: string }[],
    ) =>
      optionsFileSchema.safeParse({
        ...base,
        deliver: [
          { ...base.deliver[0], conflicts: a },
          { ...base.deliver[1], ...(b ? { conflicts: b } : {}) },
        ],
      }).success;
    expect(withConflicts([{ with: 'b', text: 'same money' }])).toBe(true);
    expect(withConflicts([{ with: 'nosuch', text: 'x' }])).toBe(false);
    expect(withConflicts([{ with: 'a', text: 'x' }])).toBe(false);
    expect(withConflicts([{ with: 'b', text: 'x' }], [{ with: 'a', text: 'x' }])).toBe(false);
    // Two options with one title, and an option with no adviser's line (Phase 23).
    expect(
      optionsFileSchema.safeParse({
        ...base,
        deliver: [base.deliver[0], { ...base.deliver[1], title: 'A' }],
      }).success,
    ).toBe(false);
    const silent = {
      id: 'b',
      priority: 'p',
      title: 'B',
      line,
      values: { dfe: 5 },
      scale: scale('start'),
    };
    expect(
      optionsFileSchema.safeParse({ ...base, deliver: [base.deliver[0], silent] }).success,
    ).toBe(false);
    // The ways to pay and the add-ons retired in Phase 24: a file that still lists them is refused.
    expect(optionsFileSchema.safeParse({ ...base, afford: [] }).success).toBe(false);
    expect(optionsFileSchema.safeParse({ ...base, addOns: [] }).success).toBe(false);
  });

  it('validate:data refuses an unknown lever, a default value and a value off the steps', () => {
    const template = must(options.deliver[0], 'option');
    const tamper = (values: Record<string, number>) =>
      validateDataset({
        ...ds,
        options: {
          ...options,
          deliver: [...options.deliver, { ...template, id: 'zz', title: 'Z', values }],
        },
      }).join('\n');
    const code = must(Object.keys(template.values)[0], 'lever an option sets');
    const { default: base, step, max } = lever(code).control;
    expect(tamper({ nosuch: 1 })).toContain('deliver option zz names unknown lever "nosuch"');
    expect(tamper({ [code]: base })).toContain(
      `deliver option zz leaves lever ${code} where it is`,
    );
    expect(tamper({ [code]: base + step / 2 })).toContain(
      `deliver option zz sets ${code} to ${base + step / 2}, off the control's steps`,
    );
    expect(tamper({ [code]: max + step })).toContain(
      `deliver option zz sets ${code} to ${max + step}, outside the lever's range`,
    );
  });
});

describe('the advisers’ shortlist on step 3 (Phase 27, ADR-0028)', () => {
  const desk = deskLevers(latestContext(ds));

  it('picks one or two ways to deliver each priority, at least one in full', () => {
    for (const { id } of ds.pm.priorities) {
      const picks = shortlistedWays(options, id);
      expect(picks.length, id).toBeGreaterThanOrEqual(1);
      expect(picks.length, id).toBeLessThanOrEqual(2);
      expect(
        picks.some((o) => o.scale.kind === 'full'),
        id,
      ).toBe(true);
    }
    expect(shortlistedWays(options)).toEqual(options.deliver.filter((o) => o.shortlist));
  });

  it('holds every pick to £1bn of headroom in the target year, on today’s estimate', () => {
    // Each card's own price (optionPrice), under the web's settings: interest included, and an
    // all-investment way priced on the debt rule, which it touches.
    const estimate = todaysEstimate(ds);
    const outcomeOf = outcomeOfFor(ds, {
      implementationYear: ds.vintage.years.forecast[1],
      debtInterestFeedback: true,
      assessAsOf: 'vintage',
    });
    const target = outcomeOf(estimate).verdicts.find((v) => v.kind === 'currentBudget')?.targetYear;
    for (const o of shortlistedWays(options)) {
      const price = optionPrice({ outcomeOf, levers, current: estimate, values: o.values });
      expect(price.year).toBe(target);
      expect(Math.abs(price.headroomChangeGbpm), o.title).toBeGreaterThanOrEqual(1000);
      const investment = Object.keys(o.values).every(
        (code) => lever(code).classification?.currentOrCapital === 'capital',
      );
      expect(price.rule, o.id).toBe(investment ? 'stockFalling' : 'currentBudget');
    }
  });

  it('shows in basic mode the picks, a way that moves a lever on the desk, and anything chosen', () => {
    const shown = (priority: string, values: Record<string, number> = {}) =>
      deliverOptionsFor(priority, options)
        .filter((o) => onShowInBasic(o, optionState(o, values, levers), desk))
        .map((o) => o.id);
    const onDesk = (o: DeliverOption) => Object.keys(o.values).some((code) => desk.has(code));
    for (const { id } of ds.pm.priorities) {
      const ways = deliverOptionsFor(id, options);
      expect(shown(id), id).toEqual(ways.filter((o) => o.shortlist || onDesk(o)).map((o) => o.id));
      // Chosen, or cut the other way, before the screen opened, a way stays on show.
      for (const way of ways) {
        expect(shown(id, way.values), way.id).toContain(way.id);
        const against = Object.fromEntries(
          Object.entries(way.values).map(([code, v]) => {
            const base = lever(code).control.default;
            return [code, base - (v - base)];
          }),
        );
        expect(shown(id, against), way.id).toContain(way.id);
      }
    }
  });

  it('validate:data names each way a step-3 pick can break the shortlist’s rules', () => {
    const tamper = (patch: (list: typeof options.deliver) => void) => {
      const deliver = structuredClone(options.deliver);
      patch(deliver);
      return validateDataset({ ...ds, options: { ...options, deliver } }).join('\n');
    };
    const set =
      (on: boolean, ...ids: string[]) =>
      (list: typeof options.deliver) => {
        for (const id of ids) {
          const o = must(
            list.find((x) => x.id === id),
            `option ${id}`,
          );
          if (on) o.shortlist = true;
          else delete o.shortlist;
        }
      };
    const lines = (result: string) => result.split('\n');
    const unpicked = options.deliver.filter((o) => !o.shortlist);
    const stability = must(
      ds.rules.rules.find((r): r is CurrentBudgetRule => r.kind === 'currentBudget'),
      'stability rule',
    );
    const target = resolveTargetYear(stability, ds.vintage.years, 'vintage').targetYear;

    // A pick breaks no promise, and counts by the target year.
    const breaker = must(
      unpicked
        .map((o) => ({
          o,
          broken: promiseBreaks(o.values, ds.pm.promises, levers).find((r) => !r.kept),
        }))
        .find((x) => x.broken),
      'way that breaks a promise',
    );
    expect(tamper(set(true, breaker.o.id))).toContain(
      `step 3 picks “${breaker.o.title}”, which breaks ${breaker.broken?.promise.title}`,
    );
    const late = must(
      unpicked.find((o) => {
        const year = optionEarliestStart(o, levers);
        return year !== undefined && fyStart(year) > fyStart(target);
      }),
      'way that starts after the target year',
    );
    expect(tamper(set(true, late.id))).toContain(
      `step 3 picks “${late.title}”, which starts in ${optionEarliestStart(late, levers)}, after ${target}`,
    );
    // Nor do two ways basic mode shows count the same money.
    const shownInBasic = (o: DeliverOption) =>
      o.shortlist === true || Object.keys(o.values).some((code) => desk.has(code));
    const [rival, shown] = must(
      options.deliver.flatMap((o) =>
        (o.conflicts ?? []).flatMap((c) => {
          const other = deliverOption(c.with);
          if (shownInBasic(other) && !shownInBasic(o)) return [[o, other] as const];
          if (shownInBasic(o) && !shownInBasic(other)) return [[other, o] as const];
          return [];
        }),
      )[0],
      'two ways that count the same money, one shown in basic mode',
    );
    expect(
      lines(tamper(set(true, rival.id))).some(
        (line) =>
          line.includes(`“${rival.title}”`) &&
          line.includes(`“${shown.title}”`) &&
          line.endsWith('which count the same money'),
      ),
    ).toBe(true);
    // One or two picks a priority, at least one of them in full.
    const pair = must(
      ds.pm.priorities.find(
        (p) =>
          shortlistedWays(options, p.id).length === 2 &&
          deliverOptionsFor(p.id, options).length > 2,
      ),
      'priority with two picks and a third way',
    );
    const third = must(
      deliverOptionsFor(pair.id, options).find((o) => !o.shortlist),
      'third way',
    );
    expect(tamper(set(true, third.id))).toContain(
      `priority ${pair.id} has 3 picks, not one or two`,
    );
    const starting = must(
      ds.pm.priorities.find((p) =>
        deliverOptionsFor(p.id, options).some((o) => o.scale.kind === 'start'),
      ),
      'priority with a way that only makes a start',
    );
    const start = must(
      deliverOptionsFor(starting.id, options).find((o) => o.scale.kind === 'start'),
      'way that only makes a start',
    );
    expect(
      tamper((list) => {
        set(false, ...shortlistedWays(options, starting.id).map((o) => o.id))(list);
        set(true, start.id)(list);
      }),
    ).toContain(`priority ${starting.id} has no pick that delivers it in full`);
    const any = must(ds.pm.priorities[0], 'priority');
    expect(
      lines(tamper(set(false, ...shortlistedWays(options, any.id).map((o) => o.id)))),
    ).toContain(`priority ${any.id} has no pick`);
  });
});
