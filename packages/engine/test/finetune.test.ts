import { describe, expect, it } from 'vitest';
import {
  FINETUNE_SIDES,
  WHO_PAYS,
  basicPolicy,
  deskLevers,
  finetuneFileSchema,
  finetuneItems,
  finetuneNames,
  finetuneSideOf,
  leadPolicy,
  policyCount,
  priceMove,
  setByFlagship,
  shortlistOf,
  shortlistPolicy,
  sizeIndex,
  sizeLabels,
  suggestedSettings,
  validateDataset,
  type ContextFile,
  type FinetuneFile,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';

const ds = loadDataset();
const file = ds.finetune;
const lever = (code: string) => {
  const l = ds.levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};

/**
 * The taxes, in the order the tax screen shows them (Phase 24, ADR-0025). Phase 25 added the two
 * cuts a Chancellor actually faces this autumn: keeping VAT off electricity (third in "Everyone",
 * the main VAT rate folded) and freezing fuel duty (first for drivers, last year's cancelled rise
 * folded). Phase 26 folds every other tax into its who-pays group, the toggles and then the
 * rates, after the hand-picked ones and before any lever not on the table (ADR-0027).
 */
const TAX_CODES = [
  [
    'everyone',
    // prettier-ignore
    [
      'hscl', 'itbr', 'vatelec', 'vats', 'sugsalt', 'ipt', 'hmrc2',
      'cta', 'nicspa', 'vatgas', 'vat1z', 'rvfrz', 'rvsal',
      'itpa', 'nicm', 'nica', 'nicpt', 'nic4', 'vatr',
      'vatfood', 'vatnrg', 'vattrn', 'vatkids', 'vatbook',
    ],
  ],
  [
    'best-off',
    // prettier-ignore
    [
      'cgtalign', 'nicuel', 'pens30', 'it50', 'wealth2',
      'pens20', 'pslump', 'nicllp', 'carried', 'cgtexit', 'wealth',
      'ithr', 'itar', 'itbrl',
    ],
  ],
  [
    'business',
    // prettier-ignore
    [
      'nicpen', 'nicer', 'qelevy', 'ct', 'banklevy',
      'bank5', 'epl2', 'vatthr',
      'nicst', 'brates',
    ],
  ],
  [
    'savers-owners',
    // prettier-ignore
    [
      'ctgh', 'cgtdth', 'rnrb', 'nicrent', 'iinc2',
      'sdltabol', 'hvcts15', 'rvcgt', 'rvinv', 'rvapr', 'rvhrad',
      'iht', 'sdlt5', 'cgth', 'cgtl', 'badr',
      'cgtprr', 'vathome',
    ],
  ],
  [
    'duties',
    // prettier-ignore
    [
      'fuelfrz', 'gam2', 'tob', 'ved', 'apd', 'rvfuel',
      'rvgam', 'vatmot',
      'fuel', 'alc',
    ],
  ],
];

const SPENDING_CODES = [
  [
    'services',
    // prettier-ignore
    [
      'dhsc', 'dfe', 'mod', 'home', 'moj', 'mhclg', 'dft', 'fcdo', 'otherd',
      'ufsm', 'bus2', 'airet',
    ],
  ],
  // Phase 25: the defence plan's gap, already on the desk, joins investment; Phase 26: council
  // homes fill its third place on show, and the 3% path waits in the fold.
  ['investment', ['cdel', 'dip47', 'socrent', 'def3']],
  [
    'benefits',
    // prettier-ignore
    [
      'wpens', 'wuc', 'wdis', 'woth',
      'ucfloor', 'lha30', 'uitime', 'csjmh', 'dlakids', 'cpilock', 'pensmth',
    ],
  ],
  ['decisions', ['rvpip', 'rveff', 'rv2ch', 'rvwfp', 'rvplan2']],
];

describe('the fine-tuning screens (Phase 24, ADR-0025)', () => {
  it('offers seventy-six taxes in five who-pays groups, and thirty-two spending levers in four', () => {
    expect(file.tax.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(TAX_CODES);
    expect(file.spending.groups.map((g) => [g.id, g.items.map((i) => i.code)])).toEqual(
      SPENDING_CODES,
    );
    expect(finetuneItems(file, 'tax')).toHaveLength(76);
    expect(finetuneItems(file, 'spending')).toHaveLength(32);
    // The spending screen says how long the settlements run, the squeeze already after them, and
    // whose budgets most of these are (Phase 25).
    expect(file.spending.notes.map((n) => n.badge)).toEqual(['simulated', 'direct', 'commentary']);
    expect(finetuneItems(file)).toHaveLength(108);
    expect(FINETUNE_SIDES).toEqual(['tax', 'spending']);
  });

  it('is clean, and names every lever plainly', () => {
    expect(validateDataset(ds)).toEqual([]);
    const names = finetuneNames(file);
    expect(names.get('itbr')).toBe('The basic rate of income tax');
    expect(names.get('hscl')).toBe('Bring back the health and social care levy');
    expect(names.get('dhsc')).toBe('Health and social care');
    expect(names.get('rvwfp')).toBe('Limit winter fuel payments to pensioners on pension credit');
  });

  it('puts each lever on its own side of the Budget, and each tax with the people who pay it', () => {
    for (const item of finetuneItems(file)) {
      expect(finetuneSideOf(lever(item.code)), item.code).toBe(item.side);
      if (item.side === 'tax') {
        expect(WHO_PAYS[item.group.id], item.code).toContain(ds.incidence.levers[item.code]);
      }
    }
  });

  it('offers policies whose sizes each lever can reach, one way each (Phase 26)', () => {
    for (const item of finetuneItems(file)) {
      const { min, max, default: rest, kind } = lever(item.code).control;
      // A toggle is one policy, switched on; a lever that moves both ways offers one policy each way.
      if (kind === 'toggle') {
        expect(
          item.policies.map((p) => p.sizes),
          item.code,
        ).toEqual([[1]]);
        expect(item.name, item.code).toBeUndefined();
      } else {
        expect(item.name, item.code).toBeTruthy();
      }
      const ways = item.policies.map((policy) => {
        const moves = policy.sizes.map((size) => size - rest);
        for (const size of policy.sizes) {
          expect(size, policy.title).toBeGreaterThanOrEqual(min);
          expect(size, policy.title).toBeLessThanOrEqual(max);
        }
        // All one way, and growing away from where the lever rests.
        expect(new Set(moves.map(Math.sign)).size, policy.title).toBe(1);
        const reach = moves.map(Math.abs);
        expect(reach, policy.title).toEqual([...reach].sort((a, b) => a - b));
        expect(new Set(reach).size, policy.title).toBe(reach.length);
        expect(policy.advice.badge).toBe('simulated');
        expect(policy.advice.sources.length, policy.title).toBeGreaterThan(0);
        return Math.sign(moves[0] ?? 0);
      });
      if (ways.length === 2) expect(ways[0], item.code).toBe(-(ways[1] ?? 0));
      // The spending screen leads with a cut, where the sums are made to add up.
      if (item.side === 'spending' && kind !== 'toggle') expect(ways[0], item.code).toBe(-1);
    }
  });

  it('sizes a policy at its usual step, twice it and five times it, capped at the lever’s range', () => {
    // Where HMRC publishes points the sizes sit on them, and the additional rate stops short of
    // the 50% rate, which is its own policy (ADR-0027).
    const ON_POINTS = new Set(['itpa', 'itbrl', 'cgth', 'cgtl', 'badr', 'iht', 'itar']);
    for (const item of finetuneItems(file)) {
      const { min, max, default: rest, kind } = lever(item.code).control;
      if (kind === 'toggle' || ON_POINTS.has(item.code)) continue;
      for (const policy of item.policies) {
        const way = Math.sign((policy.sizes[0] ?? rest) - rest);
        const edge = way > 0 ? max - rest : rest - min;
        const step = Math.abs((policy.sizes[0] ?? rest) - rest);
        const rule = [...new Set([step, 2 * step, 5 * step].map((m) => Math.min(m, edge)))];
        expect(
          policy.sizes.map((size) => Math.abs(size - rest)),
          policy.title,
        ).toEqual(rule);
      }
    }
    // The user's own example: VAT at 21%, 22% and 25%.
    const vat = finetuneItems(file).find((i) => i.code === 'vats');
    expect(vat?.policies[0]?.sizes).toEqual([1, 2, 5]);
    expect(sizeLabels(3)).toEqual(['Small', 'Medium', 'Large']);
    expect(sizeLabels(2)).toEqual(['Small', 'Large']);
    expect(sizeLabels(1)).toEqual([]);
  });

  it('reads which policy, and which size, a lever’s setting is', () => {
    const vat = finetuneItems(file).find((i) => i.code === 'vats');
    if (!vat) throw new Error('no VAT');
    const vats = lever('vats');
    expect(leadPolicy(vat, vats, 0).title).toBe('Put up VAT');
    expect(leadPolicy(vat, vats, 2).title).toBe('Put up VAT');
    expect(leadPolicy(vat, vats, -1).title).toBe('Cut VAT');
    expect(sizeIndex(vat.policies[0]!, 2)).toBe(1);
    expect(sizeIndex(vat.policies[0]!, 3)).toBeUndefined();
    expect(sizeIndex(vat.policies[1]!, -5)).toBe(2);
  });

  it('holds a lever for a flagship only at the flagship’s own value', () => {
    const prisons = ds.options.deliver.find((o) => o.id === 'prisons');
    if (!prisons) throw new Error('no prisons option');
    const status = { priorities: [{ rank: 1, options: [{ option: prisons }] }] } as Parameters<
      typeof setByFlagship
    >[0];
    expect(setByFlagship(status, { moj: 10 }, ds.levers).get('moj')?.rank).toBe(1);
    // Past it or short of it is a step-4 choice, shown as one.
    expect(setByFlagship(status, { moj: 5 }, ds.levers).has('moj')).toBe(false);
    expect(setByFlagship(status, {}, ds.levers).size).toBe(0);
  });

  it('refuses a lever offered twice and two groups under one name', () => {
    const twice: FinetuneFile = structuredClone(file);
    twice.spending.groups[0]!.items.push({ ...twice.tax.groups[0]!.items[1]! });
    expect(finetuneFileSchema.safeParse(twice).success).toBe(false);
    const named: FinetuneFile = structuredClone(file);
    named.tax.groups[1]!.id = named.tax.groups[0]!.id;
    expect(finetuneFileSchema.safeParse(named).success).toBe(false);
    expect(finetuneFileSchema.safeParse(file).success).toBe(true);
  });

  it('validate:data names each way a screen can be wrong', () => {
    const tamper = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      return validateDataset({ ...ds, finetune: copy }).join('\n');
    };
    const first = (f: FinetuneFile) => f.tax.groups[0]!.items[1]!;
    expect(tamper((f) => (first(f).code = 'nosuch'))).toMatch(/offers unknown lever "nosuch"/);
    expect(tamper((f) => f.spending.groups[0]!.items.push({ ...first(f), code: 'water' }))).toMatch(
      /offers shelved lever water/,
    );
    expect(tamper((f) => f.tax.groups[0]!.items.push({ ...first(f), code: 'dhsc' }))).toMatch(
      /the tax screen offers dhsc, a spend lever/,
    );
    const up = (f: FinetuneFile) => first(f).policies[0]!;
    expect(tamper((f) => (up(f).sizes = [9]))).toMatch(/offers 9, outside the lever's range/);
    expect(tamper((f) => (up(f).sizes = [0]))).toMatch(/offers 0, where the lever rests/);
    expect(tamper((f) => (up(f).sizes = [0.5]))).toMatch(/offers 0.5, off the control's steps/);
    expect(tamper((f) => (up(f).sizes = [2, 1]))).toMatch(/sizes that do not grow/);
    expect(tamper((f) => (up(f).sizes = [1, -2]))).toMatch(/goes both ways/);
    expect(tamper((f) => (first(f).policies[1]!.sizes = [1]))).toMatch(
      /lever itbr has two policies the same way/,
    );
    expect(tamper((f) => delete first(f).name)).toMatch(/lever itbr needs a plain name/);
    expect(tamper((f) => (f.tax.groups[0]!.items[0]!.policies[0]!.sizes = [1, 1]))).toMatch(
      /is a toggle: it is switched on, in one size/,
    );
    // A lever not on the table comes after the rest of its group, as the desk sorted them.
    expect(
      tamper((f) =>
        f.tax.groups[0]!.items.unshift({
          code: 'vatfood',
          policies: [{ ...f.tax.groups[0]!.items[0]!.policies[0]!, title: 'Charge VAT on food' }],
        }),
      ),
    ).toMatch(/hscl comes after vatfood, which is not on the table/);
    expect(tamper((f) => f.tax.groups[1]!.items.push(first(f)))).toMatch(
      /tax lever itbr falls on broad-base, not on group best-off/,
    );
    expect(tamper((f) => (f.tax.groups[0]!.id = 'nobody'))).toMatch(
      /tax group nobody is not one of the who-pays groups/,
    );
    expect(tamper((f) => (f.spending.adviser = 'nobody'))).toMatch(
      /the spending screen names unknown adviser nobody/,
    );
    expect(tamper((f) => (f.tax.adviser = 'permanent-secretary'))).toMatch(
      /adviser permanent-secretary does not speak on finetune/,
    );
  });
});

/**
 * The advisers' shortlist (Phase 27, ADR-0028): each screen's adviser picks the few best ideas
 * basic mode shows. "Best" is a judgement, badged as one on the screen; these pins and rules keep
 * it checkable. Each pick's reason is its own adviser line, already on its card.
 */
const TAX_PICKS = [
  ['everyone', 'hscl', 'Bring back the health and social care levy'],
  ['everyone', 'vatelec', 'Keep VAT off electricity after March 2027'],
  ['best-off', 'cgtalign', 'Tax capital gains at the same rates as income'],
  ['best-off', 'pens30', 'Give everyone the same 30% pension tax relief'],
  ['business', 'nicpen', 'Charge employer National Insurance on pension contributions'],
  ['savers-owners', 'ctgh', 'Double council tax on the biggest homes (bands G and H)'],
  ['savers-owners', 'rnrb', 'End the extra inheritance tax allowance for family homes'],
  ['duties', 'gam2', 'Put gambling duties up again'],
];

const SPENDING_PICKS = [
  ['services', 'dhsc', 'Spend more on health and social care'],
  ['services', 'dfe', 'Spend more on schools and education'],
  ['investment', 'cdel', 'Spend more on public investment'],
  ['investment', 'socrent', 'More council and social rent homes'],
  ['benefits', 'lha30', 'Raise housing benefit to match local rents'],
  ['decisions', 'rvpip', 'Go ahead with the 2025 cuts to PIP'],
  ['decisions', 'rvwfp', 'Limit winter fuel payments to pensioners on pension credit'],
];

describe('the advisers’ shortlist (Phase 27, ADR-0028)', () => {
  const context = ds.contexts[ds.contexts.length - 1];
  if (!context) throw new Error('no context');
  const item = (code: string) => {
    const found = finetuneItems(file).find((i) => i.code === code);
    if (!found) throw new Error(`no step-4 lever ${code}`);
    return found;
  };

  it('picks eight taxes of ninety-five and seven spending policies of forty-six', () => {
    const picked = (side: 'tax' | 'spending') =>
      shortlistOf(file, side).map((p) => [p.group.id, p.code, p.pick.title]);
    expect(picked('tax')).toEqual(TAX_PICKS);
    expect(picked('spending')).toEqual(SPENDING_PICKS);
    expect(policyCount(file, 'tax')).toBe(95);
    expect(policyCount(file, 'spending')).toBe(46);
    // One way per lever, and on the spending side the top-ups, not the trims, of the services.
    for (const entry of shortlistOf(file)) {
      expect(
        entry.policies.filter((p) => p.shortlist),
        entry.code,
      ).toHaveLength(1);
      expect(shortlistPolicy(entry)).toBe(entry.pick);
    }
    expect(item('dhsc').policies[1]?.shortlist).toBe(true);
    // Every group has a pick, so basic mode never shows an empty group on arrival.
    for (const side of FINETUNE_SIDES) {
      for (const group of file[side].groups) {
        expect(
          shortlistOf(file, side).some((p) => p.group.id === group.id),
          group.id,
        ).toBe(true);
      }
    }
    expect(file.tax.shortlistLead).toBe(
      'Your Director of Tax’s best ideas. Watch your headroom move.',
    );
    expect(file.spending.shortlistLead).toBe(
      'Your Director of Public Spending’s best ideas. A top-up costs what a trim saves.',
    );
  });

  it('holds every pick to £1bn of headroom in 2029-30 at its smallest size, on today’s estimate', () => {
    // The price a card already shows (priceMove): interest included, and an all-investment move
    // priced on the debt rule, which it touches. Under the web's own settings.
    const estimate = suggestedSettings(context.readings, ds.levers);
    const outcomeOf = outcomeOfFor(ds, {
      implementationYear: ds.vintage.years.forecast[1],
      debtInterestFeedback: true,
      assessAsOf: 'vintage',
    });
    const priceOf = (code: string, size: number) =>
      priceMove({
        outcomeOf,
        levers: ds.levers,
        from: estimate,
        to: { ...estimate, [code]: size },
      });
    const onTheDebtRule: string[] = [];
    for (const { code, pick } of shortlistOf(file)) {
      const price = priceOf(code, pick.sizes[0] ?? 1);
      expect(price.year).toBe('2029-30');
      expect(Math.abs(price.headroomChangeGbpm), pick.title).toBeGreaterThanOrEqual(1000);
      if (price.rule === 'stockFalling') onTheDebtRule.push(code);
    }
    expect(onTheDebtRule).toEqual(['cdel', 'socrent']);
    // Left out on purpose: last year's cancelled fuel duty rise is under the bar. The defence
    // plan's gap is too, and shows only because the briefing puts it on the desk: not a pick.
    expect(Math.abs(priceOf('rvfuel', 1).headroomChangeGbpm)).toBeLessThan(1000);
    expect(Math.abs(priceOf('dip47', 1).headroomChangeGbpm)).toBeLessThan(1000);
  });

  it('shows in basic mode what was chosen, else the pick, else what is already on the desk', () => {
    const desk = deskLevers(context);
    expect([...desk].sort()).toEqual(['dip47', 'vatelec']);
    const dhsc = item('dhsc');
    expect(basicPolicy(dhsc, lever('dhsc'), undefined, false)?.title).toBe(
      'Spend more on health and social care',
    );
    // A trim chosen before the screen opened shows the way it was chosen.
    expect(basicPolicy(dhsc, lever('dhsc'), -1, false)?.title).toBe('Cut health and social care');
    // Neither a pick nor on the desk: nothing, until it is chosen elsewhere.
    expect(basicPolicy(item('itbr'), lever('itbr'), undefined, false)).toBeUndefined();
    expect(basicPolicy(item('itbr'), lever('itbr'), 2, false)?.title).toBe(
      'Put up the basic rate of income tax',
    );
    // The briefing names the defence plan's gap, so basic mode shows it though it is no pick.
    expect(basicPolicy(item('dip47'), lever('dip47'), undefined, desk.has('dip47'))?.title).toBe(
      'Fund the defence plan’s gap',
    );
  });

  it('validate:data names each way a pick can break the shortlist’s rules', () => {
    const tamper = (patch: (f: FinetuneFile) => void, contexts?: ContextFile[]) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      return validateDataset({ ...ds, finetune: copy, contexts: contexts ?? ds.contexts }).join(
        '\n',
      );
    };
    const find = (f: FinetuneFile, code: string) => {
      const found = [...f.tax.groups, ...f.spending.groups]
        .flatMap((g) => g.items)
        .find((i) => i.code === code);
      if (!found) throw new Error(`no step-4 lever ${code}`);
      return found;
    };
    const pick =
      (code: string, way = 0) =>
      (f: FinetuneFile) => {
        find(f, code).policies[way]!.shortlist = true;
      };
    const unpick =
      (...codes: string[]) =>
      (f: FinetuneFile) => {
        for (const code of codes) for (const p of find(f, code).policies) delete p.shortlist;
      };
    expect(tamper(pick('dhsc'))).toMatch(/the spending screen picks both ways of lever dhsc/);
    expect(tamper(unpick('dfe', 'socrent'))).toMatch(
      /the spending screen picks 5 policies, not six to ten/,
    );
    expect(tamper((f) => ['sugsalt', 'hmrc2', 'ipt'].forEach((code) => pick(code)(f)))).toMatch(
      /the tax screen picks 11 policies, not six to ten/,
    );
    expect(tamper(unpick('gam2'))).toMatch(/tax group duties has no pick/);
    expect(tamper(pick('cgtprr'))).toMatch(
      /picks “Charge capital gains tax on main homes”, which is not on the table/,
    );
    expect(tamper(pick('uitime'))).toMatch(
      /picks “Time-limit the new unemployment insurance to six months”, which starts in 2030-31, after 2029-30/,
    );
    expect(tamper(pick('itbr'))).toMatch(
      /picks “Put up the basic rate of income tax”, which breaks The tax lock/,
    );
    expect(tamper(pick('rvcgt'))).toMatch(
      /“Tax capital gains at the same rates as income” and “Undo the 2024 rise in capital gains tax” count the same money/,
    );
    // A pick may not count the same money as a lever already on the desk.
    expect(tamper(pick('def3'))).toMatch(
      /“Defence at 3% of GDP now, not in 2030-31” and “Fund the defence plan’s gap” \(on the desk\) count the same money/,
    );
    const moved = structuredClone(ds.contexts);
    moved[moved.length - 1]!.inTray[0]!.leverCode = 'nosuch';
    expect(tamper(() => undefined, moved)).toMatch(/the desk's lever nosuch is not on step 4/);
  });
});
