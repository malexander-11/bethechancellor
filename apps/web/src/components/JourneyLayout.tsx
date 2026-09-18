import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { Dateline } from './Dateline';
import { Guide, type GuidePart } from './Guide';
import { ProgressRail } from './ProgressRail';
import { dateFor } from '../data';

/** The dateline, the road and the guide shared by every page of the journey. */
export function JourneyLayout({
  step,
  part,
  children,
}: {
  step: JourneyStep;
  part?: GuidePart;
  children: ReactNode;
}) {
  return (
    <div className="journey">
      <Dateline now={dateFor(step)} />
      <ProgressRail step={step} />
      <Guide step={step} part={part} />
      {children}
    </div>
  );
}
