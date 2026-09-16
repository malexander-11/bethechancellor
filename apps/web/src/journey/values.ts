/**
 * Two sets of lever values are the same budget when every code they mention agrees, treating a
 * missing code as nought. Presets and assumption scenarios both need this to work out which of
 * their offerings, if any, the player is currently on.
 */
export function sameValues(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

/** The subset of a budget that a given set of codes covers, with defaults dropped. */
export function pick(
  values: Record<string, number>,
  codes: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of codes) if (values[code] !== undefined) out[code] = values[code] as number;
  return out;
}
