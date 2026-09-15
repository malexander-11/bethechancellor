import type { Consideration, Lever } from '@btc/engine';

/**
 * Considerations that apply at the current setting: a note with `appliesWhen.above` shows only
 * when the value is above that threshold, `below` only when under it. With no setting (the lever
 * at its default) every note is shown.
 */
export function applicableConsiderations(lever: Lever, value: number | undefined): Consideration[] {
  return lever.considerations.filter((c) => {
    if (!c.appliesWhen || value === undefined) return true;
    if (c.appliesWhen.above !== undefined && !(value > c.appliesWhen.above)) return false;
    if (c.appliesWhen.below !== undefined && !(value < c.appliesWhen.below)) return false;
    return true;
  });
}
