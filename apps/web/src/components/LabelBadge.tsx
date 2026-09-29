import type { Badge } from '@btc/engine';

/**
 * The five badges and what each means, in plain words (Phase 23); the Methodology page lists them.
 * The ids and the classes are the honesty contract's (ADR-0002, ADR-0011) and do not move.
 */
export const BADGE_LABELS: Record<Badge, { text: string; title: string }> = {
  direct: {
    text: 'Official figure',
    title: 'A figure HMRC, HM Treasury or the OBR published, shown with its working.',
  },
  mechanical: {
    text: 'Worked out',
    title: 'Arithmetic on official figures, with no judgement in it.',
  },
  assumption: {
    text: 'Assumption',
    title: 'A number we chose, using published sensitivities where they exist.',
  },
  commentary: {
    text: 'Commentary',
    title: 'Words about an effect, with sources. Never a number of our own.',
  },
  simulated: {
    text: 'Game judgement',
    title: 'The game’s opinion, in a role’s voice. It quotes sources and never makes a number.',
  },
};

/**
 * A badge: a plain label, its meaning in its title for a mouse. It opened a key at the foot of the
 * page until the footer became one row of links (ADR-0032); the Methodology page, linked from
 * that row, says what each badge means.
 */
export function LabelBadge({ badge }: { badge: Badge }) {
  const { text, title } = BADGE_LABELS[badge];
  return (
    <span className={`badge badge--${badge}`} title={title}>
      {text}
    </span>
  );
}
