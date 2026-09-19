import type { JourneyStep } from '@btc/engine';

/**
 * Where each step of the journey lives. The package's two screens and the old names all resolve
 * to a route, so a redirect to "the furthest open stage" always has somewhere to go. The letters'
 * screen has gone (ADR-0017); its levers sit on the spending.
 */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  outlook: '/outlook',
  assumptions: '/outlook',
  pm: '/pm',
  taxes: '/budget/taxes',
  spending: '/budget/spending',
  policies: '/budget/spending',
  recommendations: '/budget/spending',
  forecast: '/forecast',
  compromise: '/compromise',
  rabbit: '/rabbit',
  'budget-day': '/budget-day',
};
