import { useState } from 'react';
import { useModeSwitch, type Mode } from '../journey/mode';
import { LabelBadge } from './LabelBadge';

/**
 * The words of basic and advanced mode (Phase 27, ADR-0028): the line on a trimmed screen, the way
 * between the modes now the footer's switch is withdrawn (ADR-0032). Exported so the readability
 * test reads what the player reads.
 */
export const MODE_WORDS = {
  /** Before the button on a screen of ideas in basic mode, beside its Game judgement badge. */
  shortlist: 'A shortlist.',
  ideas: { basic: 'See every idea', advanced: 'Show only the best ideas' },
  /** Said once the button is pressed, by the mode the screen is now in. */
  said: {
    ideas: { basic: 'Only the best ideas are on show.', advanced: 'Every idea is on show.' },
  },
} as const;

/**
 * The line on a screen of ideas basic mode trims (Phase 27): in basic mode it says the ideas are a
 * shortlist, a judgement badged as one, and offers every idea; in advanced mode it offers the
 * shortlist back. It is one button in the same place in both modes, so the focus stays on it when
 * the screen changes around it, and a quiet status says what changed. `every` names what advanced
 * mode shows ("95 tax policies"), for a screen reader. The briefing had its own line until it
 * became the same in both modes (ADR-0031), and the footer had a switch doing the same until
 * ADR-0032.
 */
export function ModeLine({ every }: { every?: string }) {
  const { mode, setMode } = useModeSwitch();
  // What was said, and for which mode: a change made elsewhere leaves nothing stale behind.
  const [said, setSaid] = useState<{ mode: Mode; text: string } | null>(null);
  const basic = mode === 'basic';
  const next: Mode = basic ? 'advanced' : 'basic';
  return (
    <p className="mode-line">
      {basic ? (
        <>
          <LabelBadge badge="simulated" /> {MODE_WORDS.shortlist}{' '}
        </>
      ) : null}
      <button
        type="button"
        className="linklike"
        onClick={() => {
          setMode(next);
          setSaid({ mode: next, text: MODE_WORDS.said.ideas[next] });
        }}
      >
        {MODE_WORDS.ideas[mode]}
        {basic && every ? <span className="sr-only"> (all {every})</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {said?.mode === mode ? said.text : ''}
      </span>
    </p>
  );
}
