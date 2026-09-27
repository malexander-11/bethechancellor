import type { SimulatedLine } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * One adviser's line on a card: who says it, the Game judgement badge, the line, and, with the
 * workings on, what it rests on. The option cards carry one (Phase 23), and so does every lever on
 * the fine-tuning screens (Phase 24): a judgement in a role's voice, never a figure of its own.
 */
export function AdviceLine({ who, line }: { who: string; line: SimulatedLine }) {
  return (
    <p className="choice__advice">
      <span className="kicker">{who}</span> <LabelBadge badge={line.badge} /> {line.text}
      <SourceList as="span" className="choice__sources briefing__sources" refs={line.sources} />
    </p>
  );
}
