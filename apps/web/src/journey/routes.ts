import type { JourneyStep } from '@btc/engine';
import { budget } from '../data';

/** The walk's last page, after the themes: the measures no card asks about (ADR-0046). */
export const SMALL_PRINT = 'other';

/** The walk's pages, in order: one a theme, then the small print. */
export const WALK: readonly string[] = [...budget.themes.map((t) => t.id), SMALL_PRINT];

/** Where a page of the walk lives. */
export function measuresPath(page: string): string {
  return `/measures/${page}`;
}

/** Where each step of the journey lives; the retired steps' old addresses redirect in App.tsx. */
export const STAGE_ROUTES: Record<JourneyStep, string> = {
  start: '/',
  measures: measuresPath(WALK[0] ?? SMALL_PRINT),
  balance: '/balance',
  // Fine-tuning retired with the walk (ADR-0046): its name reads as the walk's first page.
  finetune: measuresPath(WALK[0] ?? SMALL_PRINT),
  review: '/review',
  'budget-day': '/budget-day',
};
