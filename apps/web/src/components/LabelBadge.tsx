import type { Badge } from '@btc/engine';

/** The five badges and what each means; the guide lists them on every screen. */
export const BADGE_LABELS: Record<Badge, { text: string; title: string }> = {
  direct: {
    text: 'Direct costing',
    title:
      'An official estimate (HMRC, HM Treasury or OBR) of the direct effect of a policy, with its derivation shown.',
  },
  mechanical: {
    text: 'Mechanical',
    title:
      'Arithmetic that follows from the costings and the baseline, with no behavioural judgement.',
  },
  assumption: {
    text: 'Assumption',
    title:
      'A chosen number, using published sensitivities where they exist. Not an official forecast.',
  },
  commentary: {
    text: 'Second-round commentary',
    title:
      'Behavioural or economic effects described in words and direction only, with sources. Never a number of our own.',
  },
  simulated: {
    text: 'Simulated',
    title:
      'A game judgement. Nobody published it; it quotes sources but produces no number of its own (ADR-0011).',
  },
};

export function LabelBadge({ badge }: { badge: Badge }) {
  const { text, title } = BADGE_LABELS[badge];
  return (
    <span className={`badge badge--${badge}`} title={title}>
      {text}
    </span>
  );
}
