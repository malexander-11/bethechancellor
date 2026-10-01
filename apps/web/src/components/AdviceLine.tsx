import type { SimulatedLine } from '@btc/engine';

/**
 * One adviser's line on a card: who says it and the line. The option cards carry one (Phase 23), and so does every lever on the fine-tuning screens
 * (Phase 24): a judgement in a role's voice, never a figure of its own, and since ADR-0034 without
 * a badge. The role ends in a colon (Phase 25), and every line names it.
 */
export function AdviceLine({ who, line }: { who: string; line: SimulatedLine }) {
  return (
    <p className="choice__advice">
      <span className="kicker">{who}</span>
      {': '}
      {line.text}{' '}
    </p>
  );
}
