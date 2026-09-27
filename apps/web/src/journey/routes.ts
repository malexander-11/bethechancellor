import type { JourneyStep } from '@btc/engine';

/**
 * Where each step of the journey lives. The desk's two screens and the old step names all resolve
 * to a route, so a redirect to "the furthest open stage" always has somewhere to go.
 */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  outlook: '/outlook',
  assumptions: '/outlook',
  pm: '/pm',
  deliver: '/budget/deliver',
  finetune: '/finetune/tax',
  taxes: '/budget/taxes',
  spending: '/budget/spending',
  review: '/review',
  'budget-day': '/budget-day',
};
