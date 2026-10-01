import { describe, expect, it } from 'vitest';
import {
  FINETUNE_SIDES,
  choiceName,
  computeOutcome,
  decisionUnits,
  deskLevers,
  excludedBy,
  excludesPartners,
  finetuneFileSchema,
  finetuneItems,
  finetuneNames,
  finetuneSideOf,
  groupItems,
  movedPartners,
  scaleLevels,
  setByFlagship,
  sizeIndex,
  sizeLabels,
  validateDataset,
  type ContextFile,
  type FinetuneDecision,
  type FinetuneFile,
  type FinetuneItem,
  type FinetunePolicy,
  type FinetuneSideId,
  type LeverControl,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

/**
 * Step 4 (Phase 24, ADR-0025): the tax screen tax by tax (ADR-0035), the spending screen by what
 * the money is for (ADR-0037), each in decisions of levers offered as policies (ADR-0027). These
 * tests hold the screens to their rules, read from the data and the validator; which lever sits
 * where, and how many there are, is the data's to say.
 */
const ds = loadDataset();
const file = ds.finetune;

/** The value, or a failure that says what the data no longer has for a test to use. */
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`the data has no ${what} to test with`);
  return value;
}
const lever = (code: string) =>
  must(
    ds.levers.find((l) => l.code === code),
    `lever ${code}`,
  );
const isTick = (code: string) => lever(code).control.kind === 'toggle';
/** Every decision on one screen, or on both, in the order the screens show them. */
const decisionsOf = (f: FinetuneFile, side?: FinetuneSideId): FinetuneDecision[] =>
  (side ? [side] : FINETUNE_SIDES).flatMap((s) => f[s].groups.flatMap((g) => g.decisions));
const decisionIn = (f: FinetuneFile, id: string) =>
  must(
    decisionsOf(f).find((d) => d.id === id),
    `decision ${id}`,
  );
const itemIn = (f: FinetuneFile, code: string): FinetuneItem =>
  must(
    decisionsOf(f)
      .flatMap((d) => d.items)
      .find((i) => i.code === code),
    `step-4 lever ${code}`,
  );
/** The smallest size of a lever's usual way: what choosing it on step 4 first sets. */
const sizeOf = (code: string) => itemIn(file, code).policies[0]?.sizes[0] ?? Number.NaN;
/** The levers still in play that count the same money as this one. */
const partnersOf = (code: string) =>
  excludesPartners(lever(code), ds.levers)
    .filter((p) => !p.lever.deprecated)
    .map((p) => p.lever.code);
/** Every pair of levers on one screen that count the same money, each once, as [a, b]. */
function pairsOn(side: FinetuneSideId): [string, string][] {
  const pairs = new Map<string, [string, string]>();
  for (const entry of finetuneItems(file, side)) {
    for (const other of partnersOf(entry.code)) {
      const pair = [entry.code, other].sort() as [string, string];
      pairs.set(pair.join(' × '), pair);
    }
  }
  return [...pairs.values()];
}
/** The levers the flagships set, which a screen shows as a line once one is chosen. */
const flagshipLevers = new Set(ds.options.deliver.flatMap((o) => Object.keys(o.values)));

/** What the schema says of a copy of the file changed by `patch`. */
function refusal(patch: (f: FinetuneFile) => void): string {
  const copy: FinetuneFile = structuredClone(file);
  patch(copy);
  const parsed = finetuneFileSchema.safeParse(copy);
  return parsed.success ? '' : parsed.error.issues.map((i) => i.message).join('\n');
}

/** What validate:data says of a copy of the file changed by `patch`, with the rest of the data. */
function tamper(patch: (f: FinetuneFile) => void, contexts: ContextFile[] = ds.contexts): string {
  const copy: FinetuneFile = structuredClone(file);
  patch(copy);
  return validateDataset({ ...ds, finetune: copy, contexts }).join('\n');
}

describe('the fine-tuning screens (Phase 24, ADR-0025)', () => {
  it('offers every live policy lever once, on its own screen, and nothing else', () => {
    expect(validateDataset(ds)).toEqual([]);
    expect(FINETUNE_SIDES).toEqual(['tax', 'spending']);
    const offered = finetuneItems(file).map((i) => i.code);
    const live = ds.levers.filter((l) => !l.deprecated && finetuneSideOf(l)).map((l) => l.code);
    expect([...offered].sort()).toEqual([...live].sort());
    expect(new Set(offered).size).toBe(offered.length);
    for (const entry of finetuneItems(file)) {
      expect(finetuneSideOf(lever(entry.code)), entry.code).toBe(entry.side);
      expect(entry.decision.items.map((i) => i.code)).toContain(entry.code);
      expect(entry.group.decisions).toContain(entry.decision);
    }
    // A section's levers are its decisions' levers, in turn, on either screen.
    for (const side of FINETUNE_SIDES) {
      for (const group of file[side].groups) {
        expect(groupItems(group).map((i) => i.code)).toEqual(
          finetuneItems(file, side)
            .filter((i) => i.group === group)
            .map((i) => i.code),
        );
      }
    }
    // The spending screen says what its lead cannot hold, such as how long the settlements run
    // (Phase 25).
    expect(file.spending.notes.length).toBeGreaterThan(0);
  });

  it('sorts the taxes tax by tax: a section is its levers’ family, and every family a section (ADR-0035)', () => {
    // A tax's family, the lever file's own group, is the one record of which tax it is.
    for (const entry of finetuneItems(file, 'tax')) {
      expect(lever(entry.code).group, entry.code).toBe(entry.group.label);
    }
    const families = new Set(
      ds.levers.filter((l) => !l.deprecated && l.category === 'tax').map((l) => l.group),
    );
    expect([...families].sort()).toEqual(file.tax.groups.map((g) => g.label).sort());
  });

  it('keeps a decision short: six words or fewer, eight levers at most, anything not on the table last', () => {
    for (const decision of decisionsOf(file)) {
      expect(decision.title.split(/\s+/).length, decision.title).toBeLessThanOrEqual(6);
      expect(decision.items.length, decision.id).toBeLessThanOrEqual(8);
      // Realistic choices come before any not on the table.
      const off = decision.items.map((i) => lever(i.code).notOnTheTable !== undefined);
      expect(off, decision.id).toEqual([...off].sort((a, b) => Number(a) - Number(b)));
    }
  });

  it('names each lever plainly, and each choice in its decision’s own terms (ADR-0037)', () => {
    const names = finetuneNames(file);
    for (const entry of finetuneItems(file)) {
      // The review and the notes call a toggle by its one policy, any other lever by its name.
      const plain = isTick(entry.code) ? entry.policies[0]?.title : entry.name;
      expect(plain, entry.code).toBeTruthy();
      expect(names.get(entry.code), entry.code).toBe(plain);
      // Inside its decision a lever goes by its short name, where it has one.
      expect(choiceName(entry), entry.code).toBe(entry.label ?? plain);
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
    }
  });

  it('leads with the way that improves the public finances: taxes up, spending down (ADR-0027)', () => {
    /** What a setting does to receipts less spending, over every policy year. */
    const improves = (code: string, value: number) => {
      const effect = computeOutcome({
        vintage: ds.vintage,
        rules: ds.rules,
        levers: ds.levers,
        settings: { leverValues: { [code]: value } },
      }).leverEffects[0];
      const total = (values: Record<string, number> = {}) =>
        Object.values(values).reduce((a, b) => a + b, 0);
      return (
        total(effect?.receipts) - total(effect?.currentSpending) - total(effect?.capitalSpending)
      );
    };
    for (const item of finetuneItems(file)) {
      const [first, second] = item.policies;
      if (!first || !second) continue;
      expect(improves(item.code, first.sizes[0] ?? 0), first.title).toBeGreaterThan(0);
      expect(improves(item.code, second.sizes[0] ?? 0), second.title).toBeLessThan(0);
    }
    // The personal allowance and Class 4 National Insurance come down as well as up (ADR-0035).
    for (const code of ['itpa', 'nic4']) expect(itemIn(file, code).policies, code).toHaveLength(2);
  });

  it('sizes a policy at its usual step, twice it and five times it, capped at the lever’s range (ADR-0027)', () => {
    // Raising the additional rate stops short of 50%, which is its own policy: the two cannot both
    // be chosen.
    expect(partnersOf('itar')).toContain('it50');
    const fifty = 50 - (lever('itar').control.level?.baseline ?? Number.NaN);
    for (const item of finetuneItems(file)) {
      const l = lever(item.code);
      const { min, max, default: rest, kind } = l.control;
      if (kind === 'toggle') continue;
      for (const policy of item.policies) {
        // Where HMRC publishes points the sizes sit on them, or at the edge of the lever's range.
        if (l.costing.kind === 'lookupTable') {
          const points = new Set(l.costing.points.map((p) => p.input));
          for (const size of policy.sizes) {
            expect(
              points.has(size) || size === min || size === max,
              `${policy.title}: ${size}`,
            ).toBe(true);
          }
          continue;
        }
        const way = Math.sign((policy.sizes[0] ?? rest) - rest);
        const edge = way > 0 ? max - rest : rest - min;
        const step = Math.abs((policy.sizes[0] ?? rest) - rest);
        let rule = [...new Set([step, 2 * step, 5 * step].map((m) => Math.min(m, edge)))];
        if (item.code === 'itar' && way > 0) rule = rule.filter((reach) => reach < fifty);
        expect(
          policy.sizes.map((size) => Math.abs(size - rest)),
          policy.title,
        ).toEqual(rule);
      }
    }
    expect(sizeLabels(3)).toEqual(['Small', 'Medium', 'Large']);
    expect(sizeLabels(2)).toEqual(['Small', 'Large']);
    expect(sizeLabels(1)).toEqual([]);
  });

  it('reads which size a lever’s setting is', () => {
    for (const item of finetuneItems(file)) {
      const l = lever(item.code);
      for (const policy of item.policies) {
        policy.sizes.forEach((size, k) => {
          expect(sizeIndex(policy, size), policy.title).toBe(k);
        });
        // Between its sizes a lever is at none of them.
        expect(sizeIndex(policy, (policy.sizes[0] ?? 0) + l.control.step / 2)).toBeUndefined();
      }
    }
  });

  it('has every lever already on the desk on step 4, where it can be dealt with', () => {
    const names = finetuneNames(file);
    for (const code of deskLevers(must(ds.contexts[ds.contexts.length - 1], 'context'))) {
      expect(names.has(code), code).toBe(true);
    }
    // A lever that is not on step 4, a retired one, put on the desk is refused.
    const shelved = must(
      ds.levers.find((l) => l.deprecated),
      'retired lever',
    ).code;
    const desked = structuredClone(ds.contexts);
    desked[desked.length - 1]!.inTray[0]!.leverCode = shelved;
    expect(tamper(() => undefined, desked)).toContain(
      `the desk's lever ${shelved} is not on step 4`,
    );
  });

  it('lays a tax’s ways out as one scale, the plan among its levels (ADR-0035)', () => {
    const control: LeverControl = {
      kind: 'slider',
      unit: 'pp',
      min: -5,
      max: 5,
      step: 1,
      default: 0,
    };
    const advice = { text: 'A line.', sources: [{ sourceId: 'obr-efo-2026-03' }] };
    const way = (sizes: number[]): FinetunePolicy => ({
      title: 'A way',
      sizes,
      advice: { ...advice, badge: 'simulated' },
    });
    // The user's own VAT: 15%, 18%, 19%, 20% as planned, 21%, 22% and 25%.
    expect(scaleLevels({ control }, [way([1, 2, 5]), way([-1, -2, -5])])).toEqual([
      -5, -2, -1, 0, 1, 2, 5,
    ]);
    // A tax that moves one way starts from the plan; basic mode's one way is a scale of its own.
    expect(scaleLevels({ control }, [way([1, 2, 5])])).toEqual([0, 1, 2, 5]);
    // No scale runs past seven levels, so none takes more than two rows on a phone.
    for (const item of finetuneItems(file, 'tax')) {
      const l = lever(item.code);
      if (l.control.kind === 'toggle') continue;
      const levels = scaleLevels(l, item.policies);
      expect(levels, item.code).toContain(l.control.default);
      expect(levels.length, item.code).toBeLessThanOrEqual(7);
    }
  });

  it('holds a lever for a flagship only at the flagship’s own value', () => {
    for (const option of ds.options.deliver) {
      const status = { priorities: [{ rank: 1, options: [{ option }] }] } as Parameters<
        typeof setByFlagship
      >[0];
      const held = setByFlagship(status, option.values, ds.levers);
      expect([...held.keys()].sort(), option.id).toEqual(Object.keys(option.values).sort());
      for (const hold of held.values()) expect(hold).toEqual({ option, rank: 1 });
      // Past it or short of it is a step-4 choice, shown as one.
      for (const [code, value] of Object.entries(option.values)) {
        const past = { ...option.values, [code]: value + lever(code).control.step };
        expect(setByFlagship(status, past, ds.levers).size, `${option.id} ${code}`).toBe(0);
      }
      expect(setByFlagship(status, {}, ds.levers).size, option.id).toBe(0);
    }
  });

  it('refuses a lever offered twice, two taxes or decisions under one name, and a crowded decision', () => {
    const [firstTax] = file.tax.groups;
    const [firstDecision] = decisionsOf(file, 'tax');
    const firstCode = must(firstDecision?.items[0], 'tax lever').code;
    expect(
      refusal((f) =>
        decisionsOf(f, 'spending')[0]!.items.push({ ...decisionsOf(f, 'tax')[0]!.items[0]! }),
      ),
    ).toContain(`lever ${firstCode} is offered twice`);
    expect(refusal((f) => (f.tax.groups[1]!.id = f.tax.groups[0]!.id))).toContain(
      `two tax groups are called ${firstTax?.id}`,
    );
    expect(refusal((f) => (f.tax.groups[1]!.label = f.tax.groups[0]!.label))).toContain(
      `two tax sections are called ${firstTax?.label}`,
    );
    expect(refusal((f) => (decisionsOf(f, 'tax')[1]!.id = decisionsOf(f, 'tax')[0]!.id))).toContain(
      `two decisions are called ${firstDecision?.id}`,
    );
    // A decision's id names its panel, so it is one in the file, whichever screen it is on.
    expect(
      refusal((f) => (decisionsOf(f, 'spending')[0]!.id = decisionsOf(f, 'tax')[0]!.id)),
    ).toContain(`two decisions are called ${firstDecision?.id}`);
    expect(refusal((f) => (f.spending.groups[1]!.label = f.spending.groups[0]!.label))).toContain(
      `two spending sections are called ${file.spending.groups[0]?.label}`,
    );
    // Two choices in one decision under one name would read as one.
    const pair = must(
      decisionsOf(file).find((d) => d.items.length >= 2),
      'decision of two levers',
    );
    const name = choiceName(pair.items[0]!);
    expect(refusal((f) => (decisionIn(f, pair.id).items[1]!.label = name))).toContain(
      `two choices in decision ${pair.id} are called “${name}”`,
    );
    // Nine levers in one decision: the fullest decision takes levers from the others.
    expect(
      refusal((f) => {
        const [fullest, ...rest] = decisionsOf(f).sort((a, b) => b.items.length - a.items.length);
        for (const other of rest) {
          while (fullest!.items.length < 9 && other.items.length > 1) {
            fullest!.items.push(other.items.shift()!);
          }
        }
      }),
    ).toMatch(/expected array to have <=8 items/);
    expect(refusal(() => undefined)).toBe('');
  });

  it('validate:data names each way a screen can be wrong', () => {
    const first = must(finetuneItems(file, 'tax')[0], 'tax lever');
    expect(tamper((f) => (itemIn(f, first.code).code = 'nosuch'))).toContain(
      'the tax screen offers unknown lever "nosuch"',
    );
    const shelved = must(
      ds.levers.find((l) => l.deprecated && finetuneSideOf(l)),
      'retired policy lever',
    );
    const shelvedSide = must(finetuneSideOf(shelved), 'screen');
    expect(
      tamper((f) =>
        decisionsOf(f, shelvedSide)[0]!.items.push({
          ...itemIn(f, first.code),
          code: shelved.code,
          label: 'Shelved',
        }),
      ),
    ).toContain(`the ${shelvedSide} screen offers shelved lever ${shelved.code}`);
    const spend = must(finetuneItems(file, 'spending')[0], 'spending lever');
    expect(
      tamper((f) => decisionsOf(f, 'tax')[0]!.items.push({ ...itemIn(f, spend.code) })),
    ).toContain(`the tax screen offers ${spend.code}, a ${lever(spend.code).category} lever`);

    // A lever's sizes: each one it can reach, off where it rests, on its steps, growing one way.
    const slider = must(
      finetuneItems(file).find((i) => !isTick(i.code) && i.policies.length === 2),
      'lever that moves both ways',
    );
    const { max, step, default: rest } = lever(slider.code).control;
    const usual = (f: FinetuneFile) => itemIn(f, slider.code).policies[0]!;
    const said = `policy “${slider.policies[0]?.title}”`;
    expect(tamper((f) => (usual(f).sizes = [max + step]))).toContain(
      `${said} offers ${max + step}, outside the lever's range`,
    );
    expect(tamper((f) => (usual(f).sizes = [rest]))).toContain(
      `${said} offers ${rest}, where the lever rests`,
    );
    expect(tamper((f) => (usual(f).sizes = [rest + step / 2]))).toContain(
      `${said} offers ${rest + step / 2}, off the control's steps`,
    );
    expect(tamper((f) => (usual(f).sizes = [rest + 2 * step, rest + step]))).toContain(
      `${said} has sizes that do not grow`,
    );
    expect(tamper((f) => (usual(f).sizes = [rest + step, rest - 2 * step]))).toContain(
      `${said} goes both ways`,
    );
    expect(
      tamper((f) => (itemIn(f, slider.code).policies[1]!.sizes = [...usual(f).sizes])),
    ).toContain(`lever ${slider.code} has two policies the same way`);
    expect(tamper((f) => delete itemIn(f, slider.code).name)).toContain(
      `lever ${slider.code} needs a plain name`,
    );
    const tick = must(
      finetuneItems(file).find((i) => isTick(i.code)),
      'tick',
    );
    expect(tamper((f) => (itemIn(f, tick.code).policies[0]!.sizes = [1, 1]))).toContain(
      `policy “${tick.policies[0]?.title}” is a toggle: it is switched on, in one size`,
    );

    // A lever not on the table comes after the rest of its decision, as the desk sorted them.
    const mixed = must(
      decisionsOf(file).find(
        (d) =>
          d.items.some((i) => lever(i.code).notOnTheTable) &&
          !lever(d.items[0]!.code).notOnTheTable,
      ),
      'decision with a lever not on the table',
    );
    const lead = mixed.items[0]!.code;
    const firstOff = must(
      mixed.items.find((i) => lever(i.code).notOnTheTable),
      'lever not on the table',
    ).code;
    expect(
      tamper((f) => {
        const d = decisionIn(f, mixed.id);
        d.items.push(d.items.shift()!);
      }),
    ).toContain(`${lead} comes after ${firstOff}, which is not on the table`);

    // A tax sits in the section for its family, whichever decision it is in.
    const [home, abroad] = file.tax.groups;
    const mover = must(home?.decisions[0]?.items[0], 'tax lever').code;
    expect(
      tamper((f) => {
        const moved = f.tax.groups[0]!.decisions[0]!.items.shift()!;
        f.tax.groups[1]!.decisions[0]!.items.push(moved);
      }),
    ).toContain(`tax lever ${mover} is in the ${home?.label} family, not ${abroad?.label}`);
    expect(tamper((f) => (f.tax.groups[0]!.label = 'Taxes on income'))).toContain(
      `tax lever ${mover} is in the ${home?.label} family, not Taxes on income`,
    );

    // The screen's adviser exists and speaks on step 4.
    expect(tamper((f) => (f.spending.adviser = 'nobody'))).toContain(
      'the spending screen names unknown adviser nobody',
    );
    const silent = must(
      ds.advisers.advisers.find((a) => !a.steps.includes('finetune')),
      'adviser who does not speak on step 4',
    );
    expect(tamper((f) => (f.tax.adviser = silent.id))).toContain(
      `the tax screen's adviser ${silent.id} does not speak on finetune`,
    );
    expect(tamper(() => undefined)).toBe('');
  });
});

/**
 * Contradictions come under one decision (ADR-0036): ticks there that contradict each other may be
 * one choice, radios under one name, where the data declares them a set (ADR-0038); wherever else a
 * choice contradicts a tick, a scale, several choices, or a choice in another decision, choosing it
 * takes the others out, and says so first.
 */
describe('contradictions come under one decision (ADR-0036)', () => {
  const where = new Map(finetuneItems(file).map((e) => [e.code, e.decision] as const));
  const oneChoice = (a: string, b: string) =>
    (where.get(a)?.alternatives ?? []).some(
      (alt) => alt.codes.includes(a) && alt.codes.includes(b),
    );

  it('draws the ticks that contradict in one decision as one choice, where the first of them sits', () => {
    for (const decision of decisionsOf(file)) {
      const units = decisionUnits(decision);
      // Every lever is drawn once, in the decision's order.
      expect(units.flatMap((u) => (u.kind === 'item' ? [u.item] : u.items))).toEqual(
        decision.items,
      );
      // Each set is one choice under its name, holding exactly its levers.
      const at = (codes: readonly string[]) => decision.items.findIndex((i) => i.code === codes[0]);
      const drawn = units.flatMap((u) =>
        u.kind === 'alternatives' ? [[u.name, u.items.map((i) => i.code)] as const] : [],
      );
      const authored = [...(decision.alternatives ?? [])]
        .sort((a, b) => at(a.codes) - at(b.codes))
        .map((alt) => [alt.name, alt.codes] as const);
      expect(drawn, decision.id).toEqual(authored);
    }
    // A set is drawn where its first lever sits, and a card for every other lever.
    const cards = must(
      decisionsOf(file).find((d) => d.items.length >= 3),
      'decision of three',
    );
    const [a, b, c] = cards.items as [FinetuneItem, FinetuneItem, FinetuneItem];
    const decision = {
      ...cards,
      items: [a, b, c],
      alternatives: [{ name: 'Two', codes: [b.code, c.code] }],
    };
    expect(decisionUnits(decision)).toEqual([
      { kind: 'item', item: a },
      { kind: 'alternatives', name: 'Two', items: [b, c] },
    ]);
  });

  it('takes the others out wherever the choice is not one set of ticks, and keeps each pair in one decision', () => {
    for (const [a, b] of FINETUNE_SIDES.flatMap(pairsOn)) {
      if (oneChoice(a, b)) continue;
      // Choosing either names the other as what it takes out, once the other is in the Budget.
      expect(
        movedPartners(lever(a), ds.levers, { [b]: sizeOf(b) }).map((p) => p.lever.code),
        `${a} × ${b}`,
      ).toContain(b);
      expect(excludedBy(lever(b), ds.levers, { [a]: sizeOf(a) })?.lever.code, `${a} × ${b}`).toBe(
        a,
      );
    }
    // Every pair sits in one decision but one: the user put VAT off gas among the small changes
    // and VAT on home energy among the exemptions.
    const apart = FINETUNE_SIDES.flatMap(pairsOn)
      .filter(([a, b]) => where.get(a) !== where.get(b))
      .map((pair) => pair.join(' × '));
    expect(apart).toEqual(['vatgas × vatnrg']);
  });

  it('leaves each of the spending screen’s contradictions as two ticks, one taking the other out (ADR-0037)', () => {
    // Each pair has a lever a flagship sets, which the screen shows as a line, never a radio; so
    // choosing one takes the other out, and the spending screen has no set of alternatives.
    for (const [a, b] of pairsOn('spending')) {
      expect(where.get(a), `${a} × ${b}`).toBe(where.get(b));
      expect(flagshipLevers.has(a) || flagshipLevers.has(b), `${a} × ${b}`).toBe(true);
    }
    expect(decisionsOf(file, 'spending').flatMap((d) => d.alternatives ?? [])).toEqual([]);
  });

  it('names everything choosing a lever would take out, and nothing once it has moved', () => {
    const crowded = must(
      finetuneItems(file).find((i) => partnersOf(i.code).length >= 2),
      'lever that counts the same money as two others',
    );
    const [p, q] = partnersOf(crowded.code) as [string, string];
    const values = { [p]: sizeOf(p), [q]: sizeOf(q) };
    const l = lever(crowded.code);
    expect(movedPartners(l, ds.levers, values).map((x) => x.lever.code)).toEqual([p, q]);
    expect(excludedBy(l, ds.levers, values)?.lever.code).toBe(p);
    // A lever already chosen takes nothing out: it can always be put back.
    expect(
      movedPartners(l, ds.levers, { ...values, [crowded.code]: sizeOf(crowded.code) }),
    ).toEqual([]);
    expect(movedPartners(l, ds.levers, {})).toEqual([]);
  });

  it('refuses a set of alternatives outside its decision, in two sets, or apart', () => {
    const decision = must(
      decisionsOf(file).find((d) => d.alternatives?.[0] !== undefined),
      'set of alternatives',
    );
    const alt = must(decision.alternatives?.[0], 'set of alternatives');
    const outsider = must(
      finetuneItems(file).find((i) => i.decision !== decision),
      'lever in another decision',
    ).code;
    const setIn = (f: FinetuneFile) => decisionIn(f, decision.id).alternatives![0]!;
    expect(refusal((f) => setIn(f).codes.push(outsider))).toContain(
      `the alternatives “${alt.name}” name ${outsider}, which is not in decision ${decision.id}`,
    );
    expect(
      refusal((f) =>
        decisionIn(f, decision.id).alternatives!.push({ name: 'Again', codes: [...alt.codes] }),
      ),
    ).toContain(`${alt.codes[0]} is in two sets of alternatives`);
    // Another lever between the first two of the set.
    expect(
      refusal((f) => {
        const d = decisionIn(f, decision.id);
        const after = d.items.findIndex((i) => i.code === alt.codes[0]) + 1;
        const other = structuredClone(itemIn(f, outsider));
        d.items = [...d.items.slice(0, after), other, ...d.items.slice(after)];
      }),
    ).toContain(
      `the alternatives “${alt.name}” are not side by side, in decision ${decision.id}’s order`,
    );
    expect(refusal(() => undefined)).toBe('');
  });

  it('validate:data holds a set to ticks that exclude only each other, and no pair to a set', () => {
    const setOf = (id: string, name: string, codes: string[]) => (f: FinetuneFile) => {
      decisionIn(f, id).alternatives = [{ name, codes }];
    };
    // A scale is no tick.
    const scaled = must(
      decisionsOf(file).find((d) => d.items.length >= 2 && d.items.some((i) => !isTick(i.code))),
      'decision with a scale',
    );
    const scale = scaled.items.find((i) => !isTick(i.code))!.code;
    const beside = scaled.items.find((i) => i.code !== scale)!.code;
    expect(tamper(setOf(scaled.id, 'Top', [scale, beside]))).toContain(
      `the alternatives “Top” hold ${scale}, not a tick`,
    );
    // Two ticks that do not contradict each other are no choice between them.
    const [id, x, y] = must(
      decisionsOf(file).flatMap((d) => {
        const ticks = d.items.filter((i) => isTick(i.code)).map((i) => i.code);
        return ticks.flatMap((a, k) =>
          ticks
            .slice(k + 1)
            .filter((b) => !partnersOf(a).includes(b))
            .map((b) => [d.id, a, b] as const),
        );
      })[0],
      'two ticks in one decision that do not contradict',
    );
    expect(tamper(setOf(id, 'Relief', [x, y]))).toContain(
      `the alternatives “Relief” hold ${x} and ${y}, which do not exclude each other`,
    );
    // A tick that also excludes a lever outside the set.
    const reaching = must(
      finetuneItems(file).find(
        (i) =>
          isTick(i.code) &&
          partnersOf(i.code).length > 0 &&
          i.decision.items.some((o) => o.code !== i.code && !partnersOf(i.code).includes(o.code)),
      ),
      'tick that contradicts a lever and sits beside one it does not',
    );
    const companion = reaching.decision.items.find(
      (o) => o.code !== reaching.code && !partnersOf(reaching.code).includes(o.code),
    )!.code;
    expect(tamper(setOf(reaching.decision.id, 'Reach', [reaching.code, companion]))).toContain(
      `the alternatives “Reach” hold ${reaching.code}, which also excludes ${partnersOf(reaching.code)[0]}`,
    );
    // Which pairs are a set is the data's to say (ADR-0038): a pair left as ticks is no problem.
    const pairSet = must(
      decisionsOf(file).find((d) => (d.alternatives ?? []).some((a) => a.codes.length === 2)),
      'set of two',
    );
    expect(tamper((f) => delete decisionIn(f, pairSet.id).alternatives)).toBe('');
    // A lever a flagship sets is a line on the screen, never a radio, so it is in no set.
    const pair = must(
      FINETUNE_SIDES.flatMap(pairsOn).find(
        ([p, q]) =>
          where.get(p) === where.get(q) &&
          isTick(p) &&
          isTick(q) &&
          (flagshipLevers.has(p) || flagshipLevers.has(q)),
      ),
      'pair of contradicting ticks, one a flagship sets',
    );
    const held = pair.find((code) => flagshipLevers.has(code))!;
    const decision = where.get(held)!;
    expect(tamper(setOf(decision.id, 'Held', [...pair]))).toContain(
      `the alternatives “Held” hold ${held}, which a flagship sets`,
    );
    expect(tamper(() => undefined)).toBe('');
  });
});
