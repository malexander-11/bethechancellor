import type { Lever } from '../types/data.js';

/**
 * Two measures that count the same money (Phase 25): aligning capital gains with income already
 * ends the write-off at death, so the death card's figure would be banked twice. The pair is
 * authored once, on either lever, as an interaction whose severity is `excludes`; this reads it
 * from both sides. On the step-3 and step-4 screens only one of a pair can be chosen at a time; an
 * old link that carries both warns. Nothing here prices anything or nets one figure against the
 * other.
 */

export interface ExcludesPartner {
  /** The other lever of the pair. */
  lever: Lever;
  /** Why the two count the same money, as authored. */
  text: string;
}

/** The levers authored to count the same money as this one, from either side of the pair. */
export function excludesPartners(lever: Lever, levers: readonly Lever[]): ExcludesPartner[] {
  const byId = new Map(levers.map((l) => [l.id, l] as const));
  const out = new Map<string, ExcludesPartner>();
  for (const i of lever.interactions ?? []) {
    if (i.severity !== 'excludes') continue;
    const other = byId.get(i.withLever);
    if (other && other.code !== lever.code) out.set(other.code, { lever: other, text: i.text });
  }
  for (const other of levers) {
    if (other.code === lever.code || out.has(other.code)) continue;
    const i = (other.interactions ?? []).find(
      (x) => x.severity === 'excludes' && x.withLever === lever.id,
    );
    if (i) out.set(other.code, { lever: other, text: i.text });
  }
  return [...out.values()];
}

/**
 * The lever that blocks this one: a partner that counts the same money has moved and this one
 * has not. A lever already moved is never blocked; it can always be put back.
 */
export function excludedBy(
  lever: Lever,
  levers: readonly Lever[],
  values: Record<string, number>,
): ExcludesPartner | undefined {
  const at = (l: Lever) => values[l.code] ?? l.control.default;
  if (at(lever) !== lever.control.default) return undefined;
  return excludesPartners(lever, levers).find((p) => at(p.lever) !== p.lever.control.default);
}
