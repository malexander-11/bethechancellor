/**
 * The paths the server answers beside the static site (ADR-0044). Vercel sends each to the app
 * function by a rewrite in vercel.json, ahead of the rewrite that hands every other path to the
 * single-page app; a test holds the two lists together.
 */
export const SERVER_PATHS = {
  health: /^\/api\/health$/,
} as const;
