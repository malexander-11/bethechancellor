import type {
  ContextFile,
  DeliverOption,
  FinetuneAlternatives,
  FinetuneDecision,
  FinetuneFile,
  FinetuneGroup,
  FinetuneItem,
  FinetunePolicy,
  FinetuneTaxGroup,
  Lever,
} from '../types/data.js';
import type { AmbitionStatus } from './ambitions.js';

/**
 * Step 4's levers (Phase 24, ADR-0025), chosen as policies since Phase 26 (ADR-0027): the tax and
 * spending levers a Chancellor fine-tunes the Budget with, each offering one or two policies (one
 * each way) in one to three sizes, with one adviser's line on each (data/journey/finetune.json).
 * The tax screen is laid out tax by tax, each tax's levers in the decisions about it (ADR-0035),
 * ticks that contradict each other in one decision as one choice (ADR-0036); the spending screen by
 * what the money is for. Nothing here prices anything: choosing a size sets the lever itself, so
 * every screen that reads the lever agrees.
 */

export type FinetuneSideId = 'tax' | 'spending';

/** The two screens, in the order they are walked: tax first, then spending. */
export const FINETUNE_SIDES: readonly FinetuneSideId[] = ['tax', 'spending'];

/**
 * How many of a spending group's levers are on show before its fold in advanced mode: the
 * hand-picked ones. Basic mode has no fold; it shows the adviser's shortlist (Phase 27, ADR-0028).
 * The tax screen has no fold: each tax lists its decisions, closed until opened (ADR-0035).
 */
export const FINETUNE_SHOWN = 3;

/** A section of either screen: a tax and its decisions, or a group of spending levers. */
export type FinetuneSection = FinetuneTaxGroup | FinetuneGroup;

/** One lever on step 4 with the screen, the section and, on the tax screen, the decision it is in. */
export interface FinetuneEntry extends FinetuneItem {
  side: FinetuneSideId;
  group: FinetuneSection;
  decision?: FinetuneDecision;
}

/** A section's levers in the order it shows them: a tax's across its decisions, in turn. */
export function groupItems(group: FinetuneSection): FinetuneItem[] {
  return 'decisions' in group ? group.decisions.flatMap((d) => d.items) : group.items;
}

/**
 * What an open decision draws, in its order (ADR-0036): a card for each lever, except that ticks
 * which contradict each other are one choice, drawn once, where the first of them sits.
 */
export type DecisionUnit =
  | { kind: 'item'; item: FinetuneItem }
  | { kind: 'alternatives'; name: string; items: FinetuneItem[] };

export function decisionUnits(decision: FinetuneDecision): DecisionUnit[] {
  const sets = decision.alternatives ?? [];
  const setOf = new Map(sets.flatMap((alt) => alt.codes.map((code) => [code, alt] as const)));
  const drawn = new Set<FinetuneAlternatives>();
  const units: DecisionUnit[] = [];
  for (const item of decision.items) {
    const alt = setOf.get(item.code);
    if (!alt) {
      units.push({ kind: 'item', item });
      continue;
    }
    if (drawn.has(alt)) continue;
    drawn.add(alt);
    units.push({
      kind: 'alternatives',
      name: alt.name,
      items: decision.items.filter((i) => alt.codes.includes(i.code)),
    });
  }
  return units;
}

/** Every curated lever on one screen, or on both, in the order the screens show them. */
export function finetuneItems(file: FinetuneFile, side?: FinetuneSideId): FinetuneEntry[] {
  const tax = (): FinetuneEntry[] =>
    file.tax.groups.flatMap((group) =>
      group.decisions.flatMap((decision) =>
        decision.items.map((item) => ({ ...item, side: 'tax' as const, group, decision })),
      ),
    );
  const spending = (): FinetuneEntry[] =>
    file.spending.groups.flatMap((group) =>
      group.items.map((item) => ({ ...item, side: 'spending' as const, group })),
    );
  const sides = side ? [side] : FINETUNE_SIDES;
  return sides.flatMap((s) => (s === 'tax' ? tax() : spending()));
}

/** A lever's plain name on these screens: its own, or a toggle's single policy's title. */
export function itemName(item: FinetuneItem): string {
  return item.name ?? item.policies[0]?.title ?? item.code;
}

/** The plain name of each lever on step 4, by code: what the review and the notes call it. */
export function finetuneNames(file: FinetuneFile): Map<string, string> {
  return new Map(finetuneItems(file).map((item) => [item.code, itemName(item)] as const));
}

/** The way a policy moves its lever: up (1) or down (−1) from where it rests. */
export function policyWay(policy: FinetunePolicy, lever: Pick<Lever, 'control'>): 1 | -1 {
  return (policy.sizes[0] ?? lever.control.default) >= lever.control.default ? 1 : -1;
}

/**
 * The policy a lever's setting belongs to: the one that moves it the way it has moved, or the
 * usual one while it rests (or when no policy goes that way, as an old link can leave it).
 */
export function leadPolicy(item: FinetuneItem, lever: Pick<Lever, 'control'>, value: number) {
  const moved = Math.sign(value - lever.control.default);
  const match = moved === 0 ? undefined : item.policies.find((p) => policyWay(p, lever) === moved);
  return match ?? (item.policies[0] as FinetunePolicy);
}

/** Which of a policy's sizes the lever is at, or undefined when it is at none of them. */
export function sizeIndex(policy: FinetunePolicy, value: number): number | undefined {
  const i = policy.sizes.findIndex((size) => Math.abs(size - value) < 1e-9);
  return i >= 0 ? i : undefined;
}

/** What the sizes are called: one is a tick (no name), two are Small and Large, three add Medium. */
export function sizeLabels(count: number): readonly string[] {
  if (count >= 3) return ['Small', 'Medium', 'Large'];
  return count === 2 ? ['Small', 'Large'] : [];
}

/**
 * The levels a tax's one scale offers (ADR-0035): where the lever is planned to be and every size
 * its ways come in, low to high, each once. VAT's headline rate: 5, 2 and 1 points down, as
 * planned, and 1, 2 and 5 points up.
 */
export function scaleLevels(
  lever: Pick<Lever, 'control'>,
  ways: readonly FinetunePolicy[],
): number[] {
  const levels = [lever.control.default, ...ways.flatMap((way) => way.sizes)];
  return [...new Set(levels)].sort((a, b) => a - b);
}

/** A flagship the player chose, holding a lever at its own value (Phase 26). */
export interface FlagshipHold {
  option: DeliverOption;
  /** The priority's rank: which flagship screen to go back to. */
  rank: number;
}

/**
 * The levers a flagship the player chose has set exactly (Phase 26, ADR-0027): an option of a
 * ranked priority with every one of its levers at the option's own value. Step 4 shows such a
 * lever as a line with a way back to its flagship, never as a card that could quietly undo it.
 * Exactly, not "at or past" as delivery counts it, so a step-4 size beyond a flagship's value is
 * never hidden behind the flagship's name.
 */
export function setByFlagship(
  status: Pick<AmbitionStatus, 'priorities'> | null,
  values: Record<string, number>,
  levers: readonly Pick<Lever, 'code' | 'control'>[],
): Map<string, FlagshipHold> {
  const rest = new Map(levers.map((l) => [l.code, l.control.default] as const));
  const held = new Map<string, FlagshipHold>();
  for (const p of status?.priorities ?? []) {
    for (const { option } of p.options) {
      const entries = Object.entries(option.values);
      const exact =
        entries.length > 0 &&
        entries.every(
          ([code, target]) => Math.abs((values[code] ?? rest.get(code) ?? 0) - target) < 1e-9,
        );
      if (!exact) continue;
      for (const [code] of entries) held.set(code, { option, rank: p.rank });
    }
  }
  return held;
}

/**
 * The way the screen's adviser picked for a lever (Phase 27, ADR-0028), if any: one of the few
 * best ideas basic mode shows. At most one way per lever, which the validator checks.
 */
export function shortlistPolicy(item: FinetuneItem): FinetunePolicy | undefined {
  return item.policies.find((p) => p.shortlist === true);
}

/** A lever on the shortlist, with the way that was picked. */
export interface ShortlistEntry extends FinetuneEntry {
  pick: FinetunePolicy;
}

/** The picks on one screen, or on both, in the order the screens show them. */
export function shortlistOf(file: FinetuneFile, side?: FinetuneSideId): ShortlistEntry[] {
  return finetuneItems(file, side).flatMap((item) => {
    const pick = shortlistPolicy(item);
    return pick ? [{ ...item, pick }] : [];
  });
}

/** How many policies a screen offers in advanced mode: every way of every lever on it. */
export function policyCount(file: FinetuneFile, side: FinetuneSideId): number {
  return finetuneItems(file, side).reduce((n, item) => n + item.policies.length, 0);
}

/**
 * The levers already on the Chancellor's desk: the ones the context's in-tray names (Phase 25),
 * which the review lists while a Budget leaves them as it found them. Basic mode always shows them,
 * wherever they appear, so the review never points at something the screens hide (Phase 27, the
 * desk rule; the briefing named them too until it became plain copy, ADR-0031). Not picks.
 */
export function deskLevers(context: Pick<ContextFile, 'inTray'> | undefined): ReadonlySet<string> {
  return new Set((context?.inTray ?? []).map((item) => item.leverCode));
}

/**
 * The policy a lever shows in basic mode (Phase 27, ADR-0028), when no chosen flagship holds it
 * (the screen shows a held lever as its line in either mode): the way it had been chosen when the
 * screen opened, so nothing chosen ever hides; else the adviser's pick; else, for a lever already
 * on the desk, its usual policy; else nothing. `arrivedAt` is the lever's value when the screen
 * opened, or when the mode last changed.
 */
export function basicPolicy(
  item: FinetuneItem,
  lever: Pick<Lever, 'control'>,
  arrivedAt: number | undefined,
  onDesk: boolean,
): FinetunePolicy | undefined {
  if (arrivedAt !== undefined && arrivedAt !== lever.control.default) {
    return leadPolicy(item, lever, arrivedAt);
  }
  return shortlistPolicy(item) ?? (onDesk ? item.policies[0] : undefined);
}

/** Which screen a lever belongs on: taxes on the first, spending and welfare on the second. */
export function finetuneSideOf(lever: Pick<Lever, 'category'>): FinetuneSideId | undefined {
  if (lever.category === 'tax') return 'tax';
  if (lever.category === 'spend' || lever.category === 'welfare') return 'spending';
  return undefined;
}
