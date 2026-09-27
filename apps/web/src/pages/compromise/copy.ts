/**
 * The words of the three compromise screens (Phase 23): one question a screen, in the two moods
 * the headroom decides, with the line under it and the button that follows. No figure appears
 * here: the bar above every screen says the gap. The readability test reads these.
 */
export type Mood = 'sums' | 'room';

/** How many screens the compromises take; the forecast is the step's first. */
export const SCREENS = 3;

type Three = readonly [string, string, string];

export const QUESTIONS: Record<Mood, Three> = {
  sums: [
    'Will you raise more tax?',
    'Will you spend less, or later?',
    'Will you keep less headroom?',
  ],
  room: [
    'Will you do more for your priorities?',
    'Will you ease off a tax rise?',
    'Will you keep the extra headroom?',
  ],
};

export const LEADS: Record<Mood, Three> = {
  sums: [
    'Start with taxes. Spending comes next.',
    'You can start something later, make it smaller, or drop it.',
    'Your target is yours to change. The rules are not.',
  ],
  room: [
    'You have room to spare. Start with what you promised.',
    'Any tax rise you chose can come out again.',
    'Keep the margin, or raise your target so it holds you to it.',
  ],
};

/** The last screen's line when a rule is missed: the target is not the only question. */
export const LEAD_MISSED =
  'A rule is missed on these numbers. Change your target, or borrow and say so.';

/** What the primary button says on the first two screens; the third goes to the final choices. */
export const NEXT: Record<Mood, readonly [string, string]> = {
  sums: ['Next: spending', 'Next: headroom'],
  room: ['Next: tax', 'Next: headroom'],
};

/** What each screen is about, for the browser tab. */
export const PARTS: Record<Mood, Three> = {
  sums: ['Taxes', 'Spending', 'Headroom'],
  room: ['Your priorities', 'Taxes', 'Headroom'],
};
