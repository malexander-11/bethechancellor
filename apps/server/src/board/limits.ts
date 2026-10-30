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
  /** Votes on the Chancellor's measures made, changed or taken back (ADR-0045). */
  measureVotesPerHour: number;
  /** Devices voting for the first time on any one measure. */
  newVotersPerMeasurePerDay: number;
}

export const LIMITS: Limits = {
  postsPerHour: 5,
  postsPerDay: 20,
  voteChangesPerHour: 300,
  newVotersPerEntryPerDay: 20,
  reportsPerDay: 30,
  measureVotesPerHour: 600,
  newVotersPerMeasurePerDay: 30,
};

/** Reports from this many networks hide a title until the owner looks. */
export const REPORTS_TO_HIDE = 3;

/** Networks' hashes are forgotten after this many days. */
export const NETWORK_DAYS = 30;
