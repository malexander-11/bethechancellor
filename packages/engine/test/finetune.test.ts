import { describe, expect, it } from 'vitest';
import {
  FINETUNE_SIDES,
  basicPolicy,
  choiceName,
  decisionUnits,
  deskLevers,
  excludedBy,
  excludesPartners,
  finetuneFileSchema,
  finetuneItems,
  finetuneNames,
  finetuneSideOf,
  groupItems,
  leadPolicy,
  movedPartners,
  policyCount,
  priceMove,
  scaleLevels,
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
 * The taxes, in the order the tax screen shows them (ADR-0035): tax by tax, each section named for
 * its levers' family and holding the decisions a Chancellor takes about that tax, each decision its
 * levers, realistic choices before any not on the table. Until 30 September 2026 the screen grouped
 * taxes by who pays them (Phase 24, ADR-0025); that day nine went, kept for the record and offered
 * nowhere, and the rest were sorted by tax. Later that day 1% on everything now zero-rated joined
 * the exemptions it contradicts, so each contradiction but one sits in one decision (ADR-0036).
 */
type TaxTable = [section: string, label: string, decisions: [string, string, string[]][]][];
// prettier-ignore
const TAX: TaxTable = [
  ['income-tax', 'Income tax', [
    ['income-tax-rates', 'Change the rates', ['itbr', 'ithr', 'itar', 'it50']],
    ['income-tax-allowances', 'Change allowances and thresholds', ['itpa', 'itbrl', 'rvfrz', 'cta']],
    ['pension-relief', 'Change pension tax relief', ['pens30', 'pens20', 'pslump']],
    ['investment-income', 'Tax on dividends, savings and rent', ['iinc2', 'rvinv']],
  ]],
  ['national-insurance', 'National Insurance', [
    ['nics-employees', 'Change what employees pay', ['nicm', 'nica', 'nicpt', 'nicuel', 'nicspa']],
    ['nics-self-employed', 'Change what the self-employed pay', ['nic4', 'nicllp']],
    ['nics-employers', 'Change what employers pay', ['nicer', 'nicst', 'nicpen']],
  ]],
  ['vat', 'VAT', [
    ['vat-rate', 'Change the headline rate', ['vats']],
    ['vat-small-changes', 'Make small changes', ['vatgas', 'vatelec', 'vatr']],
    ['vat-exemptions', 'Remove an exemption',
      ['vatmot', 'vat1z', 'vatfood', 'vatnrg', 'vattrn', 'vatkids', 'vathome', 'vatbook']],
  ]],
  ['capital-gains-tax', 'Capital gains tax', [
    ['cgt-rates', 'Change the rates on gains', ['cgth', 'cgtl', 'rvcgt', 'carried']],
    ['cgt-untaxed-gains', 'Tax gains that go untaxed', ['cgtdth', 'cgtexit', 'cgtprr']],
  ]],
  ['inheritance-tax', 'Inheritance tax', [
    ['iht-rate', 'Change the rate', ['iht']],
    ['iht-reliefs', 'Change the reliefs', ['rnrb', 'rvapr']],
  ]],
  ['wealth-tax', 'Wealth tax', [
    ['wealth-above-10m', 'Tax wealth above £10 million', ['wealth', 'wealth2']],
  ]],
  ['council-tax', 'Council tax', [
    ['council-tax-top', 'Charge the biggest homes more', ['ctgh', 'hvcts15']],
  ]],
  ['stamp-duty', 'Stamp duty', [
    ['stamp-duty-band', 'Change the 5% band', ['sdlt5']],
    ['stamp-duty-cuts', 'Cut it for some buyers', ['sdltabol', 'rvhrad']],
  ]],
  ['business-taxes', 'Business taxes', [
    ['corporation-tax', 'Change corporation tax', ['ct']],
    ['business-rates', 'Change business rates', ['brates']],
    ['banks-energy', 'Tax banks and energy firms more', ['qelevy', 'banklevy', 'bank5', 'epl2']],
  ]],
  ['duties', 'Duties', [
    ['fuel-duty', 'Change fuel duty', ['fuelfrz', 'fuel']],
    ['drink-tobacco-gambling', 'Tax drink, tobacco and gambling', ['alc', 'tob', 'gam2']],
    ['cars-flights', 'Tax cars and flights more', ['ved', 'apd']],
    ['sugar-salt', 'Tax sugar and salt in food', ['sugsalt']],
  ]],
  ['tax-gap', 'The tax gap', [
    ['unpaid-tax', 'Chase more unpaid tax', ['hmrc2']],
  ]],
];

/**
 * The spending screen, in the order it shows it (ADR-0037): by what the money is for, each section
 * holding the decisions a Chancellor takes about it. Until 30 September 2026 a section was a group
 * of levers, its first three on show and the rest in a fold (Phase 26, ADR-0027); that day each
 * became decisions, as the taxes had, the PIP cuts moving beside the reset they contradict.
 */
// prettier-ignore
const SPENDING: TaxTable = [
  ['services', 'Public services', [
    ['services-protected', 'Change health, schools and defence', ['dhsc', 'dfe', 'mod']],
    ['services-other', 'Change the other budgets', ['home', 'moj', 'mhclg', 'dft', 'fcdo', 'otherd']],
    ['new-programmes', 'Fund a new programme', ['ufsm', 'bus2', 'airet']],
  ]],
  ['investment', 'Investment', [
    ['public-investment', 'Change public investment', ['cdel', 'socrent']],
    ['defence-plan', 'Fund the defence plan', ['dip47', 'def3']],
  ]],
  ['benefits', 'Benefits', [
    ['pensioner-benefits', 'Change benefits for pensioners', ['wpens', 'cpilock', 'pensmth']],
    ['working-age-benefits', 'Change working-age benefits', ['wuc', 'woth', 'ucfloor', 'lha30', 'uitime']],
    ['disability-benefits', 'Change disability benefits', ['wdis', 'csjmh', 'rvpip', 'dlakids']],
  ]],
  ['decisions', 'Last year’s decisions', [
    ['last-year', 'Reverse a decision', ['rveff', 'rv2ch', 'rvwfp', 'rvplan2']],
  ]],
];

/** A screen's sections as the tables above write them. */
const table = (side: 'tax' | 'spending') =>
  file[side].groups.map((g) => [
    g.id,
    g.label,
    g.decisions.map((d) => [d.id, d.title, d.items.map((i) => i.code)]),
  ]);

describe('the fine-tuning screens (Phase 24, ADR-0025)', () => {
  it('offers sixty-seven taxes in twenty-six decisions, and thirty-two spending levers in nine', () => {
    expect(table('tax')).toEqual(TAX);
    expect(file.tax.groups.flatMap((g) => g.decisions)).toHaveLength(26);
    expect(table('spending')).toEqual(SPENDING);
    expect(file.spending.groups.flatMap((g) => g.decisions)).toHaveLength(9);
    expect(finetuneItems(file, 'tax')).toHaveLength(67);
    expect(finetuneItems(file, 'spending')).toHaveLength(32);
    // The spending screen says how long the settlements run, the squeeze already after them, and
    // whose budgets most of these are (Phase 25).
    expect(file.spending.notes.map((n) => n.badge)).toEqual(['simulated', 'direct', 'commentary']);
    expect(finetuneItems(file)).toHaveLength(99);
    expect(FINETUNE_SIDES).toEqual(['tax', 'spending']);
  });

  it('is clean, and names every lever plainly', () => {
    expect(validateDataset(ds)).toEqual([]);
    const names = finetuneNames(file);
    expect(names.get('itbr')).toBe('The basic rate of income tax');
    expect(names.get('vatelec')).toBe('Keep VAT off electricity after March 2027');
    expect(names.get('dhsc')).toBe('Health and social care');
    expect(names.get('rvwfp')).toBe('Limit winter fuel payments to pensioners on pension credit');
  });

  it('names each choice in its decision’s own terms, else by its plain name (ADR-0037)', () => {
    const named = (code: string) => {
      const found = finetuneItems(file).find((i) => i.code === code);
      if (!found) throw new Error(`no step-4 lever ${code}`);
      return choiceName(found);
    };
    // The user's own example: "Remove an exemption", then food, home energy and the rest.
    expect(
      finetuneItems(file, 'tax')
        .filter((i) => i.decision.id === 'vat-exemptions')
        .map(choiceName),
    ).toEqual([
      'Motability cars',
      '1% on everything now zero-rated',
      'Food',
      'Home energy',
      'Public transport fares',
      'Children’s clothes',
      'New homes',
      'Books, newspapers and magazines',
    ]);
    expect(named('itbr')).toBe('Basic rate');
    expect(named('rvwfp')).toBe('Winter fuel for pension credit only');
    // Without a short name, the plain name: a budget's own, a tick's title.
    expect(named('dhsc')).toBe('Health and social care');
    expect(named('gam2')).toBe('Put gambling duties up again');
    // Only inside the decision: the review and the notes still say what the lever is.
    expect(finetuneNames(file).get('vatfood')).toBe('Charge VAT on food');
  });

  it('puts each lever on its own side of the Budget, and each tax in the section for its family', () => {
    for (const item of finetuneItems(file)) {
      expect(finetuneSideOf(lever(item.code)), item.code).toBe(item.side);
      expect(item.decision.items.map((i) => i.code)).toContain(item.code);
      expect(item.group.decisions).toContain(item.decision);
      // A tax's family, the lever file's own group, is the one record of which tax it is.
      if (item.side === 'tax') expect(lever(item.code).group, item.code).toBe(item.group.label);
    }
    // Every family a live tax lever has is a section, and every section is a family.
    const families = new Set(
      ds.levers.filter((l) => !l.deprecated && l.category === 'tax').map((l) => l.group),
    );
    expect([...families].sort()).toEqual(file.tax.groups.map((g) => g.label).sort());
    // A section's levers, across its decisions, on either screen.
    const vat = file.tax.groups.find((g) => g.id === 'vat');
    if (!vat) throw new Error('no VAT section');
    expect(groupItems(vat).map((i) => i.code)).toEqual(
      TAX.find(([id]) => id === 'vat')?.[2].flatMap(([, , codes]) => codes),
    );
    expect(groupItems(file.spending.groups[1]!).map((i) => i.code)).toEqual([
      'cdel',
      'socrent',
      'dip47',
      'def3',
    ]);
  });

  it('keeps each decision to eight levers, and a lever not on the table at the end of it', () => {
    for (const decision of FINETUNE_SIDES.flatMap((s) =>
      file[s].groups.flatMap((g) => g.decisions),
    )) {
      expect(decision.items.length, decision.id).toBeLessThanOrEqual(8);
      const off = decision.items.map((i) => lever(i.code).notOnTheTable !== undefined);
      expect(off, decision.id).toEqual([...off].sort((a, b) => Number(a) - Number(b)));
    }
    // The user's own list of exemptions: Motability first, the one a Chancellor might end, then
    // 1% on everything now zero-rated, which contradicts the rest (ADR-0036); the six nobody
    // proposes to tax after them, marked as not on the table, books among them.
    const exemptions = file.tax.groups
      .flatMap((g) => g.decisions)
      .find((d) => d.id === 'vat-exemptions');
    expect(exemptions?.items.map((i) => Boolean(lever(i.code).notOnTheTable))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
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
    const ON_POINTS = new Set(['itpa', 'itbrl', 'cgth', 'cgtl', 'iht', 'itar']);
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

  it('lays a tax’s ways out as one scale, the plan among its levels (ADR-0035)', () => {
    const levels = (code: string) => {
      const item = finetuneItems(file).find((i) => i.code === code);
      if (!item) throw new Error(`no step-4 lever ${code}`);
      return scaleLevels(lever(code), item.policies);
    };
    // The user's own VAT: 15%, 18%, 19%, 20% as planned, 21%, 22% and 25%.
    expect(levels('vats')).toEqual([-5, -2, -1, 0, 1, 2, 5]);
    expect(levels('iht')).toEqual([-40, -10, -5, 0, 5, 10]);
    // A tax that moves one way starts from the plan: car tax at £200, £210, £220 or £250.
    expect(levels('ved')).toEqual([0, 10, 20, 50]);
    // Basic mode's one way on show is a scale of its own.
    const nicer = finetuneItems(file).find((i) => i.code === 'nicer');
    expect(scaleLevels(lever('nicer'), nicer?.policies.slice(0, 1) ?? [])).toEqual([0, 1, 2, 3]);
    // No scale runs past seven levels, so none takes more than two rows on a phone.
    for (const item of finetuneItems(file, 'tax')) {
      if (lever(item.code).control.kind === 'toggle') continue;
      expect(levels(item.code).length, item.code).toBeLessThanOrEqual(7);
    }
  });

  it('cuts the personal allowance and self-employed National Insurance too (ADR-0035)', () => {
    const ways = (code: string) =>
      finetuneItems(file)
        .find((i) => i.code === code)
        ?.policies.map((p) => [p.title, p.sizes]);
    // The way that raises money leads: a lower allowance, £12,470 or £11,320.
    expect(ways('itpa')).toEqual([
      ['Cut the personal allowance', [-100, -1250]],
      ['Raise the personal allowance', [100, 1250]],
    ]);
    // Class 4 at 5%, 4% or 2%, below the employees' 8% by more.
    expect(ways('nic4')).toEqual([
      ['Put up National Insurance for the self-employed', [1, 2, 4]],
      ['Cut National Insurance for the self-employed', [-1, -2, -4]],
    ]);
    const levels = (code: string) =>
      scaleLevels(lever(code), finetuneItems(file).find((i) => i.code === code)?.policies ?? []);
    expect(levels('itpa')).toEqual([-1250, -100, 0, 100, 1250]);
    expect(levels('nic4')).toEqual([-4, -2, -1, 0, 1, 2, 4]);
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

  it('refuses a lever offered twice, two taxes or decisions under one name, and a crowded decision', () => {
    const refusal = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      const parsed = finetuneFileSchema.safeParse(copy);
      return parsed.success ? '' : parsed.error.issues.map((i) => i.message).join('\n');
    };
    const decisions = (f: FinetuneFile) => f.tax.groups.flatMap((g) => g.decisions);
    expect(
      refusal((f) =>
        f.spending.groups[0]!.decisions[0]!.items.push({ ...decisions(f)[0]!.items[1]! }),
      ),
    ).toMatch(/lever ithr is offered twice/);
    expect(refusal((f) => (f.tax.groups[1]!.id = f.tax.groups[0]!.id))).toMatch(
      /two tax groups are called income-tax/,
    );
    expect(refusal((f) => (f.tax.groups[1]!.label = f.tax.groups[0]!.label))).toMatch(
      /two tax sections are called Income tax/,
    );
    expect(refusal((f) => (decisions(f)[5]!.id = decisions(f)[0]!.id))).toMatch(
      /two decisions are called income-tax-rates/,
    );
    // A decision's id names its panel, so it is one in the file, whichever screen it is on.
    expect(refusal((f) => (f.spending.groups[3]!.decisions[0]!.id = decisions(f)[0]!.id))).toMatch(
      /two decisions are called income-tax-rates/,
    );
    expect(refusal((f) => (f.spending.groups[1]!.label = f.spending.groups[0]!.label))).toMatch(
      /two spending sections are called Public services/,
    );
    // Two choices in one decision under one name would read as one.
    expect(
      refusal((f) => (decisions(f)[0]!.items[1]!.label = decisions(f)[0]!.items[0]!.label)),
    ).toMatch(/two choices in decision income-tax-rates are called “Basic rate”/);
    // Nine levers in one decision: VAT's gas moved in among the exemptions.
    expect(
      refusal((f) => {
        const [small, exemptions] = [decisions(f)[8]!, decisions(f)[9]!];
        exemptions.items.push(small.items.shift()!);
      }),
    ).toMatch(/expected array to have <=8 items/);
    expect(refusal(() => undefined)).toBe('');
  });

  it('validate:data names each way a screen can be wrong', () => {
    const tamper = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      return validateDataset({ ...ds, finetune: copy }).join('\n');
    };
    const decisionOf = (f: FinetuneFile, id: string) =>
      f.tax.groups.flatMap((g) => g.decisions).find((d) => d.id === id)!;
    const byCode = (f: FinetuneFile, code: string) =>
      f.tax.groups
        .flatMap((g) => g.decisions)
        .flatMap((d) => d.items)
        .find((i) => i.code === code)!;
    const first = (f: FinetuneFile) => byCode(f, 'itbr');
    expect(tamper((f) => (first(f).code = 'nosuch'))).toMatch(/offers unknown lever "nosuch"/);
    expect(
      tamper((f) =>
        f.spending.groups[0]!.decisions[0]!.items.push({ ...first(f), code: 'water', label: 'W' }),
      ),
    ).toMatch(/offers shelved lever water/);
    expect(
      tamper((f) => decisionOf(f, 'income-tax-rates').items.push({ ...first(f), code: 'dhsc' })),
    ).toMatch(/the tax screen offers dhsc, a spend lever/);
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
    expect(tamper((f) => (byCode(f, 'vatelec').policies[0]!.sizes = [1, 1]))).toMatch(
      /is a toggle: it is switched on, in one size/,
    );
    // A lever not on the table comes after the rest of its decision, as the desk sorted them.
    expect(
      tamper((f) => {
        const exemptions = decisionOf(f, 'vat-exemptions');
        exemptions.items.push(exemptions.items.shift()!);
      }),
    ).toMatch(/vatmot comes after vatfood, which is not on the table/);
    // A tax sits in the section for its family, whichever decision it is in.
    expect(
      tamper((f) => {
        const rates = decisionOf(f, 'income-tax-rates');
        const itbr = first(f);
        rates.items = rates.items.filter((i) => i !== itbr);
        decisionOf(f, 'vat-rate').items.push(itbr);
      }),
    ).toMatch(/tax lever itbr is in the Income tax family, not VAT/);
    expect(tamper((f) => (f.tax.groups[0]!.label = 'Taxes on income'))).toMatch(
      /tax lever itbr is in the Income tax family, not Taxes on income/,
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
 * Contradictions come under one decision (ADR-0036): ticks there that contradict each other are one
 * choice, radios under one name; wherever a choice contradicts a scale, several choices, or a
 * choice in another decision, choosing it takes the others out, and says so first.
 */
// prettier-ignore
const ALTERNATIVES: [decision: string, name: string, codes: string[]][] = [
  ['pension-relief', 'The rate of pension tax relief', ['pens30', 'pens20']],
  ['investment-income', 'The rates on dividends, savings and rent', ['iinc2', 'rvinv']],
  ['cgt-untaxed-gains', 'Capital gains that go untaxed', ['cgtdth', 'cgtexit']],
  ['wealth-above-10m', 'The wealth tax', ['wealth', 'wealth2']],
];

describe('contradictions come under one decision (ADR-0036)', () => {
  const taxDecisions = file.tax.groups.flatMap((g) => g.decisions);
  const decision = (id: string) => {
    const d = taxDecisions.find((x) => x.id === id);
    if (!d) throw new Error(`no decision ${id}`);
    return d;
  };
  const live = (code: string) =>
    excludesPartners(lever(code), ds.levers)
      .filter((p) => !p.lever.deprecated)
      .map((p) => p.lever.code)
      .sort();

  it('draws the ticks that contradict in one decision as one choice', () => {
    expect(
      taxDecisions.flatMap((d) =>
        (d.alternatives ?? []).map((alt) => [d.id, alt.name, alt.codes] as const),
      ),
    ).toEqual(ALTERNATIVES);
    // One card for each set, where its first lever sits, and a card for every other lever.
    expect(decisionUnits(decision('pension-relief'))).toEqual([
      {
        kind: 'alternatives',
        name: 'The rate of pension tax relief',
        items: decision('pension-relief').items.slice(0, 2),
      },
      { kind: 'item', item: decision('pension-relief').items[2] },
    ]);
    expect(decisionUnits(decision('wealth-above-10m')).map((u) => u.kind)).toEqual([
      'alternatives',
    ]);
    expect(decisionUnits(decision('vat-exemptions')).map((u) => u.kind)).toEqual(
      decision('vat-exemptions').items.map(() => 'item'),
    );
  });

  it('takes the others out wherever the choice is not one set of ticks', () => {
    // Every contradiction on the tax screen, and how it is resolved.
    const pairs = new Map<string, string>();
    for (const item of finetuneItems(file, 'tax')) {
      for (const other of live(item.code)) {
        const key = [item.code, other].sort().join(' × ');
        const together = taxDecisions.some((d) =>
          (d.alternatives ?? []).some(
            (a) => a.codes.includes(item.code) && a.codes.includes(other),
          ),
        );
        pairs.set(key, together ? 'one choice' : 'takes out');
      }
    }
    expect(Object.fromEntries([...pairs].sort())).toEqual({
      'cgtdth × cgtexit': 'one choice',
      'cgth × rvcgt': 'takes out',
      'cgtl × rvcgt': 'takes out',
      'iinc2 × rvinv': 'one choice',
      'it50 × itar': 'takes out',
      'nica × nicuel': 'takes out',
      'pens20 × pens30': 'one choice',
      'vat1z × vatbook': 'takes out',
      'vat1z × vatfood': 'takes out',
      'vat1z × vathome': 'takes out',
      'vat1z × vatkids': 'takes out',
      'vat1z × vattrn': 'takes out',
      'vatgas × vatnrg': 'takes out',
      'wealth × wealth2': 'one choice',
    });
    // Undoing the 2024 rise sets both rates on gains back, so it contradicts moving either.
    expect(live('rvcgt')).toEqual(['cgth', 'cgtl']);
    expect(live('cgtl')).toEqual(['rvcgt']);
    // All but gas and home energy sit in one decision: the user put those two in different ones.
    const where = new Map(taxDecisions.flatMap((d) => d.items.map((i) => [i.code, d.id] as const)));
    const apart = [...pairs.keys()].filter((k) => {
      const [a, b] = k.split(' × ') as [string, string];
      return where.get(a) !== where.get(b);
    });
    expect(apart).toEqual(['vatgas × vatnrg']);
  });

  it('puts each of the spending screen’s contradictions in one decision, taken out (ADR-0037)', () => {
    const spendingDecisions = file.spending.groups.flatMap((g) => g.decisions);
    const where = new Map(
      spendingDecisions.flatMap((d) => d.items.map((i) => [i.code, d.id] as const)),
    );
    const pairs = new Map<string, string>();
    for (const item of finetuneItems(file, 'spending')) {
      for (const other of live(item.code)) {
        const key = [item.code, other].sort().join(' × ');
        pairs.set(key, where.get(item.code) === where.get(other) ? (where.get(other) ?? '') : '');
      }
    }
    expect(Object.fromEntries([...pairs].sort())).toEqual({
      'cpilock × pensmth': 'pensioner-benefits',
      'csjmh × rvpip': 'disability-benefits',
      'def3 × dip47': 'defence-plan',
    });
    // Each pair has a lever a flagship sets, which the screen shows as a line, never a radio; so
    // choosing one takes the other out, and the spending screen has no set of alternatives.
    const flagships = new Set(ds.options.deliver.flatMap((o) => Object.keys(o.values)));
    for (const key of pairs.keys()) {
      expect(
        key.split(' × ').some((code) => flagships.has(code)),
        key,
      ).toBe(true);
    }
    expect(spendingDecisions.flatMap((d) => d.alternatives ?? [])).toEqual([]);
  });

  it('names everything choosing a lever would take out, and nothing once it has moved', () => {
    const values = { vatfood: 1, vatkids: 1 };
    expect(movedPartners(lever('vat1z'), ds.levers, values).map((p) => p.lever.code)).toEqual([
      'vatfood',
      'vatkids',
    ]);
    expect(excludedBy(lever('vat1z'), ds.levers, values)?.lever.code).toBe('vatfood');
    expect(movedPartners(lever('vat1z'), ds.levers, { ...values, vat1z: 1 })).toEqual([]);
    expect(
      movedPartners(lever('rvcgt'), ds.levers, { cgth: 5, cgtl: 1 }).map((p) => p.lever.code),
    ).toEqual(['cgth', 'cgtl']);
    expect(movedPartners(lever('vat1z'), ds.levers, {})).toEqual([]);
  });

  it('refuses a set of alternatives outside its decision, in two sets, or apart', () => {
    const refusal = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      const parsed = finetuneFileSchema.safeParse(copy);
      return parsed.success ? '' : parsed.error.issues.map((i) => i.message).join('\n');
    };
    const of = (f: FinetuneFile, id: string) =>
      f.tax.groups.flatMap((g) => g.decisions).find((d) => d.id === id)!;
    expect(refusal((f) => of(f, 'pension-relief').alternatives![0]!.codes.push('itbr'))).toMatch(
      /the alternatives “The rate of pension tax relief” name itbr, which is not in decision pension-relief/,
    );
    expect(
      refusal((f) =>
        of(f, 'pension-relief').alternatives!.push({ name: 'Again', codes: ['pens20', 'pslump'] }),
      ),
    ).toMatch(/pens20 is in two sets of alternatives/);
    expect(
      refusal((f) => {
        const d = of(f, 'pension-relief');
        d.items = [d.items[0]!, d.items[2]!, d.items[1]!];
      }),
    ).toMatch(
      /the alternatives “The rate of pension tax relief” are not side by side, in decision pension-relief’s order/,
    );
    expect(refusal(() => undefined)).toBe('');
  });

  it('validate:data holds a set to ticks that exclude only each other, and every such pair to a set', () => {
    const tamper = (patch: (f: FinetuneFile) => void) => {
      const copy: FinetuneFile = structuredClone(file);
      patch(copy);
      return validateDataset({ ...ds, finetune: copy }).join('\n');
    };
    const of = (f: FinetuneFile, id: string) =>
      f.tax.groups.flatMap((g) => g.decisions).find((d) => d.id === id)!;
    // A scale is no tick, and the 50% rate contradicts it: choosing one takes the other out.
    const rates = tamper(
      (f) => (of(f, 'income-tax-rates').alternatives = [{ name: 'Top', codes: ['itar', 'it50'] }]),
    );
    expect(rates).toMatch(/the alternatives “Top” hold itar, not a tick/);
    // Two ticks that do not contradict each other are no choice between them.
    expect(
      tamper(
        (f) =>
          (of(f, 'pension-relief').alternatives = [
            { name: 'Relief', codes: ['pens30', 'pens20', 'pslump'] },
          ]),
      ),
    ).toMatch(/the alternatives “Relief” hold pens30 and pslump, which do not exclude each other/);
    // Gas off VAT: a flagship sets it, it contradicts home energy elsewhere, and not electricity.
    const gas = tamper(
      (f) =>
        (of(f, 'vat-small-changes').alternatives = [
          { name: 'Energy', codes: ['vatgas', 'vatelec'] },
        ]),
    );
    expect(gas).toMatch(/the alternatives “Energy” hold vatgas, which a flagship sets/);
    expect(gas).toMatch(
      /the alternatives “Energy” hold vatgas and vatelec, which do not exclude each other/,
    );
    expect(gas).toMatch(/the alternatives “Energy” hold vatgas, which also excludes vatnrg/);
    // Ticks that exclude only each other, in one decision, are a set.
    expect(tamper((f) => delete of(f, 'wealth-above-10m').alternatives)).toMatch(
      /wealth and wealth2 contradict each other in decision wealth-above-10m: make them alternatives/,
    );
    // Unless a flagship sets either: the PIP cuts and the reset stay two ticks, one taking the
    // other out, since a flagship's lever is a line on the screen, never a radio.
    const disability = (f: FinetuneFile) =>
      f.spending.groups.flatMap((g) => g.decisions).find((d) => d.id === 'disability-benefits')!;
    expect(
      tamper((f) => (disability(f).alternatives = [{ name: 'PIP', codes: ['csjmh', 'rvpip'] }])),
    ).toMatch(/the alternatives “PIP” hold csjmh, which a flagship sets/);
    expect(tamper(() => undefined)).toBe('');
  });
});

/**
 * The advisers' shortlist (Phase 27, ADR-0028): each screen's adviser picks the few best ideas
 * basic mode shows. "Best" is a judgement, badged as one on the screen; these pins and rules keep
 * it checkable. Each pick's reason is its own adviser line, already on its card.
 */
const TAX_PICKS = [
  ['income-tax', 'pens30', 'Give everyone the same 30% pension tax relief'],
  ['national-insurance', 'nicer', 'Put up employer National Insurance'],
  ['national-insurance', 'nicpen', 'Charge employer National Insurance on pension contributions'],
  ['vat', 'vatelec', 'Keep VAT off electricity after March 2027'],
  ['capital-gains-tax', 'cgtdth', 'Tax capital gains when someone dies'],
  ['inheritance-tax', 'rnrb', 'End the extra inheritance tax allowance for family homes'],
  ['council-tax', 'ctgh', 'Double council tax on the biggest homes (bands G and H)'],
  ['duties', 'gam2', 'Put gambling duties up again'],
];

const SPENDING_PICKS = [
  ['services', 'dhsc', 'Spend more on health and social care'],
  ['services', 'dfe', 'Spend more on schools and education'],
  ['investment', 'cdel', 'Spend more on public investment'],
  ['investment', 'socrent', 'More council and social rent homes'],
  ['benefits', 'lha30', 'Raise housing benefit to match local rents'],
  // Beside the reset it contradicts, among the disability benefits, since ADR-0037.
  ['benefits', 'rvpip', 'Go ahead with the 2025 cuts to PIP'],
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

  it('picks eight taxes of eighty-seven and seven spending policies of forty-six', () => {
    const picked = (side: 'tax' | 'spending') =>
      shortlistOf(file, side).map((p) => [p.group.id, p.code, p.pick.title]);
    expect(picked('tax')).toEqual(TAX_PICKS);
    expect(picked('spending')).toEqual(SPENDING_PICKS);
    expect(policyCount(file, 'tax')).toBe(87);
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
    // Every spending section has a pick, so basic mode never shows an empty one on arrival. Four
    // taxes have none, and basic mode leaves them out (ADR-0035).
    for (const group of file.spending.groups) {
      expect(
        shortlistOf(file, 'spending').some((p) => p.group.id === group.id),
        group.id,
      ).toBe(true);
    }
    expect(
      file.tax.groups
        .filter((g) => !shortlistOf(file, 'tax').some((p) => p.group.id === g.id))
        .map((g) => g.id),
    ).toEqual(['wealth-tax', 'stamp-duty', 'business-taxes', 'tax-gap']);
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
    // Left out on purpose: the defence plan's gap is under the bar, and shows only because the
    // briefing puts it on the desk: not a pick.
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
        .flatMap((g) => g.decisions)
        .flatMap((d) => d.items)
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
    expect(tamper((f) => ['sugsalt', 'hmrc2', 'apd'].forEach((code) => pick(code)(f)))).toMatch(
      /the tax screen picks 11 policies, not six to ten/,
    );
    // A spending section needs a pick; a tax does without, and basic mode leaves it out.
    expect(tamper(unpick('rvwfp'))).toMatch(/spending section decisions has no pick/);
    expect(tamper(unpick('gam2'))).toBe('');
    expect(tamper(pick('cgtprr'))).toMatch(
      /picks “Charge capital gains tax on main homes”, which is not on the table/,
    );
    expect(tamper(pick('uitime'))).toMatch(
      /picks “Time-limit the new unemployment insurance to six months”, which starts in 2030-31, after 2029-30/,
    );
    expect(tamper(pick('itbr'))).toMatch(
      /picks “Put up the basic rate of income tax”, which breaks The tax lock/,
    );
    expect(tamper(pick('cgtexit'))).toMatch(
      /“Tax capital gains when someone dies” and “Charge capital gains tax on people who leave the UK” count the same money/,
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
