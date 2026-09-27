import type { FinetuneFile, FinetuneGroup, FinetuneItem, Lever } from '../types/data.js';

/**
 * Step 4's curated levers (Phase 24, ADR-0025): the tax and spending levers a Chancellor fine-tunes
 * the Budget with, hand-picked from the desk, grouped, each under a plain title with one adviser's
 * line (data/journey/finetune.json). They are the desk's own levers: nothing here prices anything,
 * and moving one moves the lever itself, so the desk and these screens always agree.
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
  'best-off': ['top'],
  business: ['business'],
  'savers-owners': ['savers-owners'],
  duties: ['duties', 'motorists', 'flyers', 'disabled-motorists'],
};

/** One curated lever with the screen and the group it sits in. */
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

/** The curated title of each curated lever, by code: what the review calls it, too. */
export function finetuneTitles(file: FinetuneFile): Map<string, string> {
  return new Map(finetuneItems(file).map((item) => [item.code, item.title] as const));
}

/** Which screen a lever belongs on: taxes on the first, spending and welfare on the second. */
export function finetuneSideOf(lever: Pick<Lever, 'category'>): FinetuneSideId | undefined {
  if (lever.category === 'tax') return 'tax';
  if (lever.category === 'spend' || lever.category === 'welfare') return 'spending';
  return undefined;
}
