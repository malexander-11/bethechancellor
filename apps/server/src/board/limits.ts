/**
 * What one network may do (ADR-0044): enough for a household or an office to play freely, too
 * little to flood the leaderboard. The dev server relaxes them, since every test there is one
 * network.
 */
export interface Limits {
  postsPerHour: number;
  postsPerDay: number;
  /** Votes made, changed or taken back. */
  voteChangesPerHour: number;
  /** Devices voting for the first time on any one entry. */
  newVotersPerEntryPerDay: number;
  reportsPerDay: number;
}

export const LIMITS: Limits = {
  postsPerHour: 5,
  postsPerDay: 20,
  voteChangesPerHour: 300,
  newVotersPerEntryPerDay: 20,
  reportsPerDay: 30,
};

/** Reports from this many networks hide a title until the owner looks. */
export const REPORTS_TO_HIDE = 3;

/** Networks' hashes are forgotten after this many days. */
export const NETWORK_DAYS = 30;
