import type {
  DeliverOption,
  FinetuneFile,
  FinetuneGroup,
  FinetuneItem,
  FinetunePolicy,
  Lever,
} from '../types/data.js';
import type { AmbitionStatus } from './ambitions.js';

/**
 * Step 4's levers (Phase 24, ADR-0025), chosen as policies since Phase 26 (ADR-0027): the tax and
 * spending levers a Chancellor fine-tunes the Budget with, grouped, each offering one or two
 * policies (one each way) in one to three sizes, with one adviser's line on each
 * (data/journey/finetune.json). Nothing here prices anything: choosing a size sets the lever
 * itself, so every screen that reads the lever agrees.
 */

export type FinetuneSideId = 'tax' | 'spending';

/** The two screens, in the order they are walked: tax first, then spending. */
export const FINETUNE_SIDES: readonly FinetuneSideId[] = ['tax', 'spending'];

/**
 * Who pays, on the tax screen: each group's id and the incidence pays-groups
 * (data/journey/incidence.json) whose taxes may sit in it. Small groups join the nearest large
 * one. The labels are the data's; which tax sits where is checked against this.
 */
export const WHO_PAYS: Readonly<Record<string, readonly string[]>> = {
  everyone: ['broad-base', 'tax-gap', 'working-pensioners'],
  'best-off': ['top', 'higher-earners'],
  business: ['business'],
  'savers-owners': ['savers-owners'],
  duties: ['duties', 'motorists', 'flyers', 'disabled-motorists'],
};

/** How many of a group's levers are on show before its fold: the hand-picked ones. */
export const FINETUNE_SHOWN = 3;

/** One lever on step 4 with the screen and the group it sits in. */
export interface FinetuneEntry extends FinetuneItem {
  side: FinetuneSideId;
  group: FinetuneGroup;
}

/** Every curated lever on one screen, or on both, in the order the screens show them. */
export function finetuneItems(file: FinetuneFile, side?: FinetuneSideId): FinetuneEntry[] {
  const sides = side ? [side] : FINETUNE_SIDES;
  return sides.flatMap((s) =>
    file[s].groups.flatMap((group) => group.items.map((item) => ({ ...item, side: s, group }))),
  );
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

/** Which screen a lever belongs on: taxes on the first, spending and welfare on the second. */
export function finetuneSideOf(lever: Pick<Lever, 'category'>): FinetuneSideId | undefined {
  if (lever.category === 'tax') return 'tax';
  if (lever.category === 'spend' || lever.category === 'welfare') return 'spending';
  return undefined;
}
