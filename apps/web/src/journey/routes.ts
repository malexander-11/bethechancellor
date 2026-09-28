import type { JourneyStep } from '@btc/engine';

/**
 * Where each step of the journey lives. The old step names all resolve to a route, so a redirect to
 * "the furthest open stage" always has somewhere to go; the desk's two, retired in Phase 26, to
 * the screens of step 4 that took their levers.
 */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  outlook: '/outlook',
  assumptions: '/outlook',
  pm: '/pm',
  deliver: '/budget/deliver',
  finetune: '/finetune/tax',
  taxes: '/finetune/tax',
  spending: '/finetune/spending',
  review: '/review',
  'budget-day': '/budget-day',
};
