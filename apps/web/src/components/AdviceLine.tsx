import type { SimulatedLine } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

/**
 * One adviser's line on a card: who says it, the line, the Game judgement badge after it, and,
 * with the workings on, what it rests on. The option cards carry one (Phase 23), and so does every
 * lever on the fine-tuning screens (Phase 24): a judgement in a role's voice, never a figure of its
 * own. The role ends in a colon and the badge follows the words (Phase 25), so the two no longer
 * run together as one title; a screen that names its adviser once in its lead leaves `who` out.
 */
export function AdviceLine({ who, line }: { who?: string | undefined; line: SimulatedLine }) {
  return (
    <p className="choice__advice">
      {who ? (
        <>
          <span className="kicker">{who}</span>
          {': '}
        </>
      ) : null}
      {line.text} <LabelBadge badge={line.badge} />
      <SourceList as="span" className="choice__sources briefing__sources" refs={line.sources} />
    </p>
  );
}
