/**
 * The fixed lines of sharing a Budget (ADR-0044): Budget day's way to share it, and the page a
 * shared link opens. The picture's own words, and the Budget's in words, are the engine's
 * (`SHARE_WORDS`, `summaryWords`).
 */
export const SHARE_TEXT = {
  heading: 'Your Budget in a picture',
  share: 'Share your Budget',
  copy: 'Copy the link',
  copied: 'Link copied',
  download: 'Download the picture',
  networks: 'Or share it on',
  newTab: '(opens in a new tab)',
  /** The shared page. */
  kicker: 'A shared Budget',
  lead: 'Someone played the Chancellor and made this Budget. Can you do better?',
  play: 'Make your own Budget',
  open: 'Open it in the game',
  sides: 'What it changed',
  verdict: 'What it means',
  /** A link that is not a finished Budget. */
  missing: 'This Budget could not be opened',
  missingLead: 'The link may have been cut short. You can still make your own.',
} as const;
