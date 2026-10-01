/**
 * The leaderboard's fixed lines (ADR-0044): its page, an entry's page, the votes and reports, and
 * the ways in from the cover and the footer. Each Budget's own words are the engine's.
 */
export const BOARD_TEXT = {
  title: 'The leaderboard',
  lead: 'Budgets other players have made. Vote for the ones you would back.',
  order: 'Order',
  top: 'Most votes',
  newest: 'Newest',
  loading: 'Loading the leaderboard…',
  closed: 'The leaderboard is not open yet. You can still make your own Budget and share it.',
  down: 'The leaderboard cannot be reached just now. Try again in a minute.',
  empty: 'No Budgets here yet. Finish yours and be the first.',
  more: 'Show more',
  voteFor: 'Vote for',
  voteAgainst: 'Vote against',
  /** "12 for, 3 against" */
  counts: '{ups} for, {downs} against',
  voteFailed: 'Your vote could not be counted just now.',
  voteLimited: 'Too many votes from your network. Try again later.',
  report: 'Report the title',
  reported: 'Title reported',
  reportThanks: 'Thank you. The owner will look at it.',
  reportFailed: 'The report could not be sent just now.',
  /** An entry's page. */
  kicker: 'On the leaderboard',
  missing: 'This Budget is not on the leaderboard',
  missingLead: 'It may have been taken down. The others are still there.',
  back: 'Back to your Budget',
  see: 'See the leaderboard',
  copy: 'Copy the link',
  copied: 'Link copied',
  /** The way in from the footer. */
  footer: 'Leaderboard',
  /** Budget day's form, shown once the leaderboard is open. */
  postHeading: 'Put it on the leaderboard',
  postLabel: 'Give your Budget a title',
  postHint: 'Up to 60 characters. No swearing, links or @names.',
  postButton: 'Post it',
  posting: 'Posting…',
  posted: 'Your Budget is on the leaderboard.',
  /** "This Budget is already on the leaderboard as “Defence first”." */
  already: 'This Budget is already on the leaderboard as “{title}”.',
  seeEntry: 'See it on the leaderboard',
  takenDown: 'This Budget was taken down from the leaderboard.',
  postLimited: 'Too many Budgets from your network today. Try again later.',
} as const;

/** Why a title was refused, as the player is told it (apps/server/src/board/titles.ts). */
export const TITLE_REFUSED: Record<string, string> = {
  empty: 'Give your Budget a title first.',
  long: 'Keep the title to 60 characters or fewer.',
  handle: 'Take out the @name.',
  link: 'Take out the web address.',
  swearing: 'Choose a title without swearing.',
};

/** The longest title the leaderboard keeps. */
export const TITLE_MAX = 60;

/** "12 for, 3 against" */
export function countsWords({ ups, downs }: { ups: number; downs: number }): string {
  return BOARD_TEXT.counts.replace('{ups}', String(ups)).replace('{downs}', String(downs));
}
