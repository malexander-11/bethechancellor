import { formatGbpBn, type AmbitionStatus, type GamePermalink, type Outcome } from '@btc/engine';

/**
 * The score while you build, in one slim line that stays in view: headroom in the target year
 * against the margin you set out to keep, how many priorities are delivered, and, only when one
 * is, a promise broken or a rule missed. Every figure is the engine's; the target and the counts
 * are the player's own choices read back. It sits under the header and never covers a control,
 * and nothing on it is said again on the screen below.
 */
export function HeadroomBar({
  outcome,
  game,
  status,
}: {
  outcome: Outcome;
  game: GamePermalink;
  status: AmbitionStatus;
}) {
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const target = game.headroomTargetBn * 1000;
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const tone =
    headroom < 0
      ? ' bar__figure--worse'
      : target > 0 && headroom < target
        ? ' bar__figure--short'
        : '';
  const against =
    target > 0
      ? headroom >= target
        ? `${formatGbpBn(headroom - target, 1)} over your ${formatGbpBn(target, 0)} target`
        : `${formatGbpBn(target - headroom, 1)} short of your ${formatGbpBn(target, 0)} target`
      : 'no target beyond the rules';
  const facts: { id: string; text: string; warn?: boolean }[] = [];
  if (status.priorities.length > 0) {
    facts.push({
      id: 'delivered',
      text: `${status.delivered} of ${status.priorities.length} delivered`,
    });
  }
  if (status.broken > 0) {
    facts.push({
      id: 'promises',
      text: `${status.broken} ${status.broken === 1 ? 'promise' : 'promises'} broken`,
      warn: true,
    });
  }
  if (missed.length > 0) {
    facts.push({
      id: 'rules',
      text: `${missed.map((v) => v.ruleName).join(', ')} missed`,
      warn: true,
    });
  }
  return (
    <section className="bar" aria-label="Your Budget so far">
      <p className="bar__headroom">
        <span className="bar__label">Headroom, {year}</span>
        <span className={`bar__figure${tone}`}>{formatGbpBn(headroom, 1, headroom < 0)}</span>
        <span className="bar__target">{against}</span>
        {facts.map((f) => (
          <span key={f.id} className={`bar__fact${f.warn ? ' bar__missed' : ''}`}>
            {f.text}
          </span>
        ))}
      </p>
    </section>
  );
}
