import type { Lever } from '@btc/engine';

/** What the screens are handed: the Budget as it stands, and the ways to move it. */
export interface Moves {
  /** Every lever's value as it stands. */
  values: Record<string, number>;
  /** The later starts the player has chosen, by lever code. */
  delays: Record<string, string>;
  setAll: (values: Record<string, number>) => void;
  set: (code: string, value: number) => void;
  setDelay: (code: string, year: string) => void;
  /** What one move would do to headroom in the target year, £ million. */
  effectOf: (values: Record<string, number>, delays?: Record<string, string>) => number;
  byCode: ReadonlyMap<string, Lever>;
  valueOf: (lever: Lever) => number;
  /** An adviser's role, from their id. */
  role: (id: string) => string;
}
