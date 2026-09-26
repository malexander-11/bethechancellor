import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { PageIntro } from './PageIntro';
import { Progress, type SubStep } from './Progress';

/** The road and the head of the screen, shared by every page of the journey. */
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
      <Progress step={step} part={part} />
      {intro ? (
        <PageIntro step={step} part={part} title={title} lead={lead} tabTitle={tabTitle} />
      ) : null}
      {children}
    </div>
  );
}
