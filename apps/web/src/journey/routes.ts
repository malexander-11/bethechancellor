import type { JourneyStep } from '@btc/engine';

/** Where each step of the journey lives; the retired steps' old addresses redirect in App.tsx. */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  finetune: '/finetune/tax',
  review: '/review',
  'budget-day': '/budget-day',
};
