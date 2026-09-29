import { describe, expect, it } from 'vitest';
import type { Settings } from '../src/index.js';
import {
  allOptions,
  blockedBy,
  computeOutcome,
  deliverOptionsFor,
  deskLevers,
  finetuneItems,
  onShowInBasic,
  optionPrice,
  shortlistedWays,
  suggestedSettings,
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

const ds = loadDataset();
const options = ds.options;
const levers = ds.levers;
/** The levers step 4 offers: every policy lever, since Phase 26. */
const offered = new Set(finetuneItems(ds.finetune).map((i) => i.code));
const deliverOption = (id: string) => {
  const o = options.deliver.find((x) => x.id === id);
  if (!o) throw new Error(`no deliver option ${id}`);
  return o;
};
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
    expect(byLever.get('moj')?.title).toBe('More money for prisons and courts');
    // The ways to pay became step 4's levers and the add-ons went (ADR-0025).
    expect(allOptions(options)).toHaveLength(options.deliver.length);
    expect(byLever.get('itbr')).toBeUndefined();
  });

  it('every priority named has two to five ways to deliver it', () => {
    const priorities = new Set(options.deliver.map((o) => o.priority));
    expect(priorities.size).toBe(8);
    for (const id of priorities) {
      const n = deliverOptionsFor(id, options).length;
      expect(n, id).toBeGreaterThanOrEqual(2);
      expect(n, id).toBeLessThanOrEqual(5);
    }
  });

  it('reads on, adjusted and off from the lever values', () => {
    const health = deliverOption('health-above-sr');
    expect(optionState(health, {}, levers)).toBe('off');
    expect(optionState(health, { dhsc: 3 }, levers)).toBe('on');
    expect(optionState(health, { dhsc: 4 }, levers)).toBe('on');
    expect(optionState(health, { dhsc: 1 }, levers)).toBe('adjusted');
    expect(optionState(health, { dfe: 5 }, levers)).toBe('off');
    const pair = { id: 'pair', values: { dhsc: 3, dfe: 5 } };
    expect(optionState(pair, { dhsc: 3 }, levers)).toBe('adjusted');
    expect(optionState(pair, { dhsc: 3, dfe: 5 }, levers)).toBe('on');
    expect(optionOff(pair, levers)).toEqual({ dhsc: 0, dfe: 0 });
  });

  it('carries the latest earliest start of its levers', () => {
    expect(optionEarliestStart(deliverOption('unemployment-insurance-limit'), levers)).toBe(
      '2030-31',
    );
    expect(optionEarliestStart(deliverOption('mental-health-reset'), levers)).toBe('2029-30');
    expect(optionEarliestStart(deliverOption('child-tax-allowance'), levers)).toBe('2028-29');
    expect(optionEarliestStart(deliverOption('prisons'), levers)).toBeUndefined();
    expect(optionEarliestStart({ id: 'both', values: { cgtalign: 1, wealth2: 1 } }, levers)).toBe(
      '2030-31',
    );
  });

  it('names the red line a lever is watched by, and whether the Budget would cross it', () => {
    const lock = ds.pm.promises.find((p) => p.id === 'tax-lock');
    const bundle = (values: Record<string, number>) => ({ id: 'b', values });
    // Each carries the promise's id and short name for its resting tag (Phase 25).
    const red = { manifesto: true, scored: true, id: 'tax-lock', tag: 'Tax lock' };
    expect(optionRedLines(bundle({ itbr: 1 }), ds.pm.promises, levers, {})).toEqual([
      { promise: lock?.title, when: 'above', severity: 'breaks', broken: true, ...red },
    ]);
    // The levy keeps the pledge's words and tests its spirit: amber (Phase 23).
    expect(optionRedLines(bundle({ hscl: 1 }), ds.pm.promises, levers, {})).toEqual([
      { promise: lock?.title, when: 'on', severity: 'strains', broken: true, ...red },
    ]);
    expect(optionRedLines(bundle({ nicer: 1 }), ds.pm.promises, levers, {})[0]?.severity).toBe(
      'strains',
    );
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
    const cut = deliverOption('fuel-duty-cut');
    expect(optionOverlaps(cut, levers, new Set())).toEqual([]);
    const hits = optionOverlaps(cut, levers, new Set(['rvfuel']));
    expect(hits.map((h) => [h.withLever.code, h.severity, h.active])).toEqual([
      ['rvfuel', 'warn', true],
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
    // Restoring fuel duty's uprating and cutting it, the old conflict (ADR-0022), is now a
    // warning the card names at once, because the uprating is one of step 4's levers; so is the
    // April 2027 freeze (Phase 25), read from its own side of the pair.
    const fuel = optionOverlaps(deliverOption('fuel-duty-cut'), levers, new Set(), options);
    expect(fuel.map((o) => [o.withLever.code, o.severity])).toEqual([
      ['rvfuel', 'warn'],
      ['fuelfrz', 'warn'],
    ]);
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
    const template = deliverOption('health-above-sr');
    const tamper = (values: Record<string, number>) =>
      validateDataset({
        ...ds,
        options: {
          ...options,
          deliver: [...options.deliver, { ...template, id: 'zz', title: 'Z', values }],
        },
      });
    expect(tamper({ nosuch: 1 }).join('\n')).toMatch(/unknown lever "nosuch"/);
    expect(tamper({ mhclg: 0 }).join('\n')).toMatch(/leaves lever mhclg where it is/);
    expect(tamper({ mhclg: 0.3 }).join('\n')).toMatch(/off the control's steps/);
    expect(tamper({ mhclg: 40 }).join('\n')).toMatch(/outside the lever's range/);
  });
});

describe('the advisers’ shortlist on step 3 (Phase 27, ADR-0028)', () => {
  const context = ds.contexts[ds.contexts.length - 1];
  if (!context) throw new Error('no context');
  const desk = deskLevers(context);

  it('picks one or two ways to deliver each priority, at least one in full', () => {
    const picks = Object.fromEntries(
      [...new Set(options.deliver.map((o) => o.priority))].map((p) => [
        p,
        shortlistedWays(options, p).map((o) => o.id),
      ]),
    );
    expect(picks).toEqual({
      'cost-of-living': ['freeze-early', 'free-school-meals'],
      nhs: ['health-above-sr', 'drop-efficiencies'],
      defence: ['defence-uplift'],
      'schools-send': ['send-settlement'],
      'homes-growth': ['invest-push', 'council-homes'],
      families: ['relink-housing-support', 'uc-up'],
      'safer-streets': ['prisons', 'borders'],
      'welfare-bill': ['pip-changes'],
    });
    expect(shortlistedWays(options)).toHaveLength(13);
    for (const ways of Object.values(picks)) {
      expect(ways.some((id) => deliverOption(id).scale.kind === 'full')).toBe(true);
    }
  });

  it('holds every pick to £1bn of headroom in 2029-30, on today’s estimate', () => {
    // Each card's own price (optionPrice), under the web's settings: interest included, and an
    // all-investment way priced on the debt rule.
    const estimate = suggestedSettings(context.readings, levers);
    const outcomeOf = outcomeOfFor(ds, {
      implementationYear: ds.vintage.years.forecast[1],
      debtInterestFeedback: true,
      assessAsOf: 'vintage',
    });
    const onTheDebtRule: string[] = [];
    for (const o of shortlistedWays(options)) {
      const price = optionPrice({ outcomeOf, levers, current: estimate, values: o.values });
      expect(price.year).toBe('2029-30');
      expect(Math.abs(price.headroomChangeGbpm), o.title).toBeGreaterThanOrEqual(1000);
      if (price.rule === 'stockFalling') onTheDebtRule.push(o.id);
    }
    expect(onTheDebtRule).toEqual(['invest-push', 'council-homes']);
  });

  it('shows in basic mode the picks, a way that moves a lever on the desk, and anything chosen', () => {
    const shown = (priority: string, values: Record<string, number> = {}) =>
      deliverOptionsFor(priority, options)
        .filter((o) => onShowInBasic(o, optionState(o, values, levers), desk))
        .map((o) => o.id);
    // The defence plan's gap is on the desk, so it shows beside the pick; 3% now waits.
    expect(shown('defence')).toEqual(['dip-gap', 'defence-uplift']);
    expect(shown('welfare-bill')).toEqual(['pip-changes']);
    expect(shown('safer-streets')).toEqual(['prisons', 'borders']);
    // Chosen, trimmed or cut the other way before the screen opened, a way stays on show.
    expect(shown('defence', { def3: 1 })).toEqual([
      'dip-gap',
      'three-per-cent-now',
      'defence-uplift',
    ]);
    expect(shown('welfare-bill', { rv2ch: 1 })).toEqual(['pip-changes', 'two-child-limit']);
  });

  it('validate:data names each way a step-3 pick can break the shortlist’s rules', () => {
    const tamper = (patch: (list: typeof options.deliver) => void) => {
      const deliver = structuredClone(options.deliver);
      patch(deliver);
      return validateDataset({ ...ds, options: { ...options, deliver } }).join('\n');
    };
    const set = (id: string, on: boolean) => (list: typeof options.deliver) => {
      const o = list.find((x) => x.id === id);
      if (!o) throw new Error(`no option ${id}`);
      if (on) o.shortlist = true;
      else delete o.shortlist;
    };
    expect(tamper(set('two-child-limit', true))).toMatch(
      /step 3 picks “Reinstate the two-child limit”, which breaks The two-child limit stays abolished/,
    );
    expect(tamper(set('mental-health-reset', true))).toMatch(
      /step 3 shows “Stop disability benefits for milder mental health conditions” and “Go ahead with the 2025 cuts to PIP”, which count the same money/,
    );
    expect(tamper(set('unemployment-insurance-limit', true))).toMatch(
      /which starts in 2030-31, after 2029-30/,
    );
    expect(tamper(set('vat-off-gas', true))).toMatch(
      /priority cost-of-living has 3 picks, not one or two/,
    );
    expect(
      tamper((list) => {
        set('relink-housing-support', false)(list);
        set('uc-up', false)(list);
        set('uc-floor', true)(list);
      }),
    ).toMatch(/priority families has no pick that delivers it in full/);
    expect(tamper(set('pip-changes', false))).toMatch(/priority welfare-bill has no pick/);
  });
});
