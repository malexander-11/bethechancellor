import type { SimulatedLine } from '@btc/engine';
import { SourceList } from './SourceLink';

/**
 * One adviser's line on a card: who says it, the line and, with the workings on, what it rests
 * on. The option cards carry one (Phase 23), and so does every lever on the fine-tuning screens
 * (Phase 24): a judgement in a role's voice, never a figure of its own, and since ADR-0034 without
 * a badge. The role ends in a colon (Phase 25); a screen that names its adviser once in its lead
 * leaves `who` out.
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
      {line.text}{' '}
      <SourceList as="span" className="choice__sources briefing__sources" refs={line.sources} />
    </p>
  );
}
