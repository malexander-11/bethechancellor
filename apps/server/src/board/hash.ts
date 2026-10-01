import { createHmac } from 'node:crypto';

/**
 * The key every hash is made with: `HASH_SECRET` when the owner sets one, otherwise one made from
 * the database's own address, which is secret already, so there is one variable fewer to set.
 */
export function hashKeyFrom(env: { HASH_SECRET?: string; DATABASE_URL?: string }): string {
  if (env.HASH_SECRET) return env.HASH_SECRET;
  return createHmac('sha256', 'btc-leaderboard')
    .update(env.DATABASE_URL ?? '')
    .digest('hex');
}

/**
 * What the leaderboard keeps of a device or a network (ADR-0044): a keyed hash, which tells two
 * apart without saying what either was.
 */
export function hasher(key: string): (kind: 'device' | 'network', value: string) => string {
  return (kind, value) =>
    createHmac('sha256', key).update(`${kind}:${value}`).digest('base64url').slice(0, 32);
}

/**
 * The network an address belongs to: an IPv4 address as it is, an IPv6 address by its first 64
 * bits, which one household or phone is usually given whole. Anything else is one network.
 */
export function networkOf(ip: string): string {
  const address = ip.trim().replace(/%.*$/, '');
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mapped?.[1]) return mapped[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return address;
  if (!address.includes(':')) return 'unknown';
  const [head = '', tail] = address.split('::');
  const before = head ? head.split(':') : [];
  const after = tail === undefined ? null : tail ? tail.split(':') : [];
  const groups =
    after === null
      ? before
      : [...before, ...Array(8 - before.length - after.length).fill('0'), ...after];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return 'unknown';
  return `${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(':')}::/64`;
}
