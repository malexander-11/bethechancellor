import type { Badge } from '@btc/engine';

/**
 * The five kinds of number and line in the game (ADR-0002, ADR-0011), in the order the Methodology
 * page explains them. Every screen wore them as badges until ADR-0034; the data still records the
 * kind of every figure and line, and the About page says what each kind is, in a sentence each.
 */
export const KINDS: readonly Badge[] = [
  'direct',
  'mechanical',
  'assumption',
  'commentary',
  'simulated',
];

/** What each kind is, in plain words. */
export const KIND_WORDS: Record<Badge, string> = {
  direct:
    'An official figure is one HMRC, HM Treasury or the OBR published, shown with its working.',
  mechanical: 'A worked-out figure is arithmetic on official figures, with no judgement in it.',
  assumption: 'An assumption is a number we chose, using published sensitivities where they exist.',
  commentary: 'Commentary is words about an effect, with sources, and never a number of our own.',
  simulated:
    'A game judgement is the game’s opinion, in a role’s voice. It quotes sources and never makes a number.',
};
