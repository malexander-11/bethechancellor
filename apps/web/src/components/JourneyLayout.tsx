import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { useBudget } from '../state/budget';
import { PageIntro } from './PageIntro';
import { Progress, type SubStep } from './Progress';

/**
 * What a shared link could not carry, or carries into a game not yet started, said once on
 * whatever screen it opens (Phase 26): the desk, which used to say it, has gone. A note, not a
 * status, so it never talks over the bar's announcements; dismissed, it is gone for the visit.
 */
function LinkNote() {
  const { state, dispatch } = useBudget();
  const lines = state.warnings;
  if (lines.length === 0) return null;
  return (
    <div className="warnings warnings--link" role="note" aria-label="About this link">
      {lines.length === 1 ? (
        <p className="warnings__line">{lines[0]}</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="linklike"
        onClick={() => dispatch({ type: 'dismissWarnings' })}
      >
        Dismiss<span className="sr-only"> the note about this link</span>
      </button>
    </div>
  );
}

/**
 * The road and the head of the screen, shared by every page of the journey. The cover is the
 * invitation to play, not a step, so the road starts on the screen its button opens (ADR-0033).
 */
export function JourneyLayout({
  step,
  part,
  title,
  lead,
  tabTitle,
  intro = true,
  children,
}: {
  step: JourneyStep;
  /** Which screen of a multi-screen step this is. */
  part?: SubStep;
  /** A heading and line of the page's own, in place of the guide's. */
  title?: ReactNode;
  lead?: ReactNode;
  tabTitle?: string;
  /** Off when the page draws its own head, as the opening does. */
  intro?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="journey">
      {step === 'start' ? null : <Progress step={step} part={part} />}
      {intro ? (
        <PageIntro step={step} part={part} title={title} lead={lead} tabTitle={tabTitle} />
      ) : null}
      <LinkNote />
      {children}
    </div>
  );
}
