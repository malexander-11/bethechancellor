import { useState } from 'react';
import { useModeSwitch, type Mode } from '../journey/mode';
import { LabelBadge } from './LabelBadge';

/**
 * The words of basic and advanced mode (Phase 27, ADR-0028): the line on a trimmed screen and the
 * footer's switch. Exported so the readability test reads what the player reads.
 */
export const MODE_WORDS = {
  /** Before the button on a screen of ideas in basic mode, beside its Game judgement badge. */
  shortlist: 'A shortlist.',
  ideas: { basic: 'See every idea', advanced: 'Show only the best ideas' },
  briefing: { basic: 'Read the full briefing', advanced: 'Show the short briefing' },
  /** Said once the button is pressed, by the mode the screen is now in. */
  said: {
    ideas: { basic: 'Only the best ideas are on show.', advanced: 'Every idea is on show.' },
    briefing: {
      basic: 'The short briefing is on show.',
      advanced: 'The full briefing is on show.',
    },
  },
  switch: 'Advanced mode',
  note: 'Shows every policy and the full briefing, not only your advisers’ best ideas.',
} as const;

/**
 * The line on a screen basic mode trims (Phase 27): in basic mode it says the ideas are a
 * shortlist, a judgement badged as one, and offers every idea; in advanced mode it offers the
 * shortlist back. It is one button in the same place in both modes, so the focus stays on it when
 * the screen changes around it, and a quiet status says what changed. The footer's switch does the
 * same from every page. `every` names what advanced mode shows ("95 tax policies"), for a screen
 * reader.
 */
export function ModeLine({ kind, every }: { kind: 'ideas' | 'briefing'; every?: string }) {
  const { mode, setMode } = useModeSwitch();
  // What was said, and for which mode: a change made elsewhere, by the footer's switch, leaves
  // nothing stale behind.
  const [said, setSaid] = useState<{ mode: Mode; text: string } | null>(null);
  const basic = mode === 'basic';
  const next: Mode = basic ? 'advanced' : 'basic';
  return (
    <p className="mode-line">
      {basic && kind === 'ideas' ? (
        <>
          <LabelBadge badge="simulated" /> {MODE_WORDS.shortlist}{' '}
        </>
      ) : null}
      <button
        type="button"
        className="linklike"
        onClick={() => {
          setMode(next);
          setSaid({ mode: next, text: MODE_WORDS.said[kind][next] });
        }}
      >
        {MODE_WORDS[kind][mode]}
        {basic && every ? <span className="sr-only"> (all {every})</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {said?.mode === mode ? said.text : ''}
      </span>
    </p>
  );
}
