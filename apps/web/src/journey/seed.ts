import { SEED_MAX, SEED_MIN } from '@btc/engine';

/**
 * A seed for the in-game OBR draw: a small integer a link can carry and a person can read back.
 * Minted only when the player confirms an outlook, so a fresh page has no game in its URL.
 */
export function mintSeed(): number {
  return SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
}
