import type { Badge } from '@btc/engine';

const LABELS: Record<Badge, { text: string; title: string }> = {
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
};

export function LabelBadge({ badge }: { badge: Badge }) {
  const { text, title } = LABELS[badge];
  return (
    <span className={`badge badge--${badge}`} title={title}>
      {text}
    </span>
  );
}
