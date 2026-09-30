import type { Lever } from '../types/data.js';

/**
 * Two measures that count the same money, or set the same rate (Phase 25): the 1% and the 2%
 * wealth tax, say, or undoing the 2024 rise in capital gains tax and moving today's rates. The pair
 * is authored once, on either lever, as an interaction whose severity is `excludes`; this reads it
 * from both sides. On step 4 only one of a pair can be in the Budget: ticks that contradict in one
 * decision are one choice, and anywhere else choosing one takes the others out, saying so first
 * (ADR-0036). An old link that carries both warns. Nothing here prices anything or nets one figure
 * against the other.
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
 * What choosing this lever would take out (ADR-0036): every partner that counts the same money and
 * has moved, while this one rests. A lever already moved takes nothing out; it can always be put
 * back.
 */
export function movedPartners(
  lever: Lever,
  levers: readonly Lever[],
  values: Record<string, number>,
): ExcludesPartner[] {
  const at = (l: Lever) => values[l.code] ?? l.control.default;
  if (at(lever) !== lever.control.default) return [];
  return excludesPartners(lever, levers).filter((p) => at(p.lever) !== p.lever.control.default);
}

/** The first of those: the partner a card names when only one is in the way. */
export function excludedBy(
  lever: Lever,
  levers: readonly Lever[],
  values: Record<string, number>,
): ExcludesPartner | undefined {
  return movedPartners(lever, levers, values)[0];
}
