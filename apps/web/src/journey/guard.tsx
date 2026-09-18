import { enterable, furthestStep, type JourneyStep } from '@btc/engine';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useBudget } from '../state/budget';
import { STAGE_ROUTES } from './routes';

/**
 * The road runs one way. A page calls this with its hooks and returns what it gets back: a
 * redirect to the furthest open stage when the URL is ahead of the game, or nothing. The rail at
 * the top of the page reads the same `enterable` rule, so it never offers a link that would only
 * bounce here. The budget travels with the redirect, as it does with every step link.
 */
export function useStageGuard(step: JourneyStep): ReactElement | null {
  const { state, query } = useBudget();
  if (enterable(step, state.game)) return null;
  return (
    <Navigate
      to={{ pathname: STAGE_ROUTES[furthestStep(state.game)], search: query ? `?${query}` : '' }}
      replace
    />
  );
}
