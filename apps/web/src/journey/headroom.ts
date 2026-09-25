import { useMemo } from 'react';
import { headroomOfOutcome, useOutcomeOf } from './outcome';

/**
 * "What would headroom be if…": the trial outcome's headroom alone, for the callers that need
 * only the number. Built on `useOutcomeOf`, so the two never disagree about the conditions.
 */
export function useHeadroomOf(): (
  values: Record<string, number>,
  delays?: Record<string, string>,
) => number {
  const outcomeOf = useOutcomeOf();
  return useMemo(
    () => (values: Record<string, number>, delays?: Record<string, string>) =>
      headroomOfOutcome(outcomeOf(values, delays)),
    [outcomeOf],
  );
}
