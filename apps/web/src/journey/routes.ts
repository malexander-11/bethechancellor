import type { JourneyStep } from '@btc/engine';

/**
 * Where each step of the journey lives. The old step name resolves to a route too, so a redirect
 * to "the furthest open stage" always has somewhere to go.
 */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  outlook: '/outlook',
  assumptions: '/outlook',
  pm: '/pm',
  deliver: '/budget/deliver',
  finetune: '/finetune/tax',
  review: '/review',
  'budget-day': '/budget-day',
};
