import { formatGbpBn, type AmbitionStatus, type Outcome } from '@btc/engine';

/**
 * The score while you build, in one slim line that stays in view: headroom in the target year,
 * whether the rules are met (and which are missed when one is), how many priorities are delivered,
 * and, only when one is, a promise broken. Every figure is the engine's; the counts are the
 * player's own choices read back. It sits under the header and never covers a control, and
 * nothing on it is said again on the screen below. There is no target: the rules are the line
 * (Phase 24).
 */
export function HeadroomBar({ outcome, status }: { outcome: Outcome; status: AmbitionStatus }) {
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const missed = outcome.verdicts.filter(
    (v) => v.status === 'notMet' || v.status === 'aboveMargin',
  );
  const tone = headroom < 0 ? ' bar__figure--worse' : '';
  const rules =
    missed.length === 0 ? 'rules met' : `${missed.map((v) => v.ruleName).join(', ')} missed`;
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
  return (
    <section className="bar" aria-label="Your Budget so far">
      <p className="bar__headroom">
        <span className="bar__label">Headroom, {year}</span>
        <span className={`bar__figure${tone}`}>{formatGbpBn(headroom, 1, headroom < 0)}</span>
        <span className={`bar__target${missed.length > 0 ? ' bar__missed' : ''}`}>{rules}</span>
        {facts.map((f) => (
          <span key={f.id} className={`bar__fact${f.warn ? ' bar__missed' : ''}`}>
            {f.text}
          </span>
        ))}
      </p>
    </section>
  );
}
