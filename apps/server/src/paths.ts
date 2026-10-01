/**
 * The paths the server answers beside the static site (ADR-0044), and the function that answers
 * each. Vercel sends a path the app function answers to it by a rewrite in vercel.json, ahead of
 * the rewrite that hands every other path to the single-page app; a function's own path needs none.
 * A test holds vercel.json to this list.
 */

/** An entry's address on the leaderboard. */
const ID = '([A-Za-z0-9_-]{8})';

export const SERVER_PATHS = {
  health: /^\/api\/health$/,
  card: /^\/api\/card$/,
  /** A shared Budget's page: the site's own, with the Budget's preview tags. */
  shared: /^\/shared$/,
  /** A leaderboard entry's page: the site's own, with the entry's preview tags. */
  entryPage: new RegExp(`^/leaderboard/${ID}$`),
  /** The leaderboard: its entries, one entry, and a device's vote and report on it. */
  budgets: /^\/api\/budgets$/,
  budget: new RegExp(`^/api/budgets/${ID}$`),
  vote: new RegExp(`^/api/budgets/${ID}/vote$`),
  report: new RegExp(`^/api/budgets/${ID}/report$`),
  /** The owner's moderation. */
  adminBudgets: /^\/api\/admin\/budgets$/,
  adminBudget: new RegExp(`^/api/admin/budgets/${ID}$`),
  adminAction: new RegExp(`^/api/admin/budgets/${ID}/(show|hide)$`),
} as const;

export type ServerPath = keyof typeof SERVER_PATHS;

export const SERVED_BY: Record<ServerPath, 'app' | 'card'> = {
  health: 'app',
  card: 'card',
  shared: 'app',
  entryPage: 'app',
  budgets: 'app',
  budget: 'app',
  vote: 'app',
  report: 'app',
  adminBudgets: 'app',
  adminBudget: 'app',
  adminAction: 'app',
};
