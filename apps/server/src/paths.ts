/**
 * The paths the server answers beside the static site (ADR-0044), and the function that answers
 * each. Vercel sends a path the app function answers to it by a rewrite in vercel.json, ahead of
 * the rewrite that hands every other path to the single-page app; a function's own path needs none.
 * A test holds vercel.json to this list.
 */
export const SERVER_PATHS = {
  health: /^\/api\/health$/,
  card: /^\/api\/card$/,
  /** A shared Budget's page: the site's own, with the Budget's preview tags. */
  shared: /^\/shared$/,
} as const;

export type ServerPath = keyof typeof SERVER_PATHS;

export const SERVED_BY: Record<ServerPath, 'app' | 'card'> = {
  health: 'app',
  card: 'card',
  shared: 'app',
};
