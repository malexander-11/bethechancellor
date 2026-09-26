import type { JourneyStep } from '@btc/engine';

/**
 * Where each step of the journey lives. The package's two screens and the old outlook name all
 * resolve to a route, so a redirect to "the furthest open stage" always has somewhere to go.
 */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  outlook: '/outlook',
  assumptions: '/outlook',
  pm: '/pm',
  deliver: '/budget/deliver',
  afford: '/budget/afford',
  taxes: '/budget/taxes',
  spending: '/budget/spending',
  forecast: '/forecast',
  compromise: '/compromise',
  rabbit: '/rabbit',
  review: '/review',
  'budget-day': '/budget-day',
};
