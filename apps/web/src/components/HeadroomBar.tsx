import { formatGbpBn, type AmbitionStatus, type Outcome } from '@btc/engine';
import { isMissed, ruleTitle } from '../journey/rules';

/**
 * The score while you build, in one slim line that stays in view: headroom in the target year,
 * whether the rules are met (and which are missed when one is), how many priorities are delivered
 * in full and how many only started (settled lower counts as started: Phase 25), amber while any
 * is short, and, only when one is, a promise broken. Every figure is the engine's; the counts are the
 * player's own choices read back. It sits under the header and never covers a control, and
 * nothing on it is said again on the screen below. There is no target: the rules are the line
 * (Phase 24).
 */
export function HeadroomBar({ outcome, status }: { outcome: Outcome; status: AmbitionStatus }) {
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const missed = outcome.verdicts.filter(isMissed);
  const tone = headroom < 0 ? ' bar__figure--worse' : '';
  // A missed rule by its plain name and the engine's own margin (Phase 25): a player can see
  // which rule to fix, and by how much.
  const rules =
    missed.length === 0
      ? 'rules met'
      : missed
          .map((v) => `${ruleTitle(v)} missed by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`)
          .join(' · ');
  const facts: { id: string; text: string; warn?: boolean; short?: boolean }[] = [];
  if (status.priorities.length > 0) {
    facts.push({
      id: 'delivered',
      text: priorityCount(status),
      short: status.delivered < status.priorities.length,
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
          <span
            key={f.id}
            className={`bar__fact${f.warn ? ' bar__missed' : f.short ? ' bar__short' : ''}`}
          >
            {f.text}
          </span>
        ))}
      </p>
    </section>
  );
}

/**
 * "1 of 2 priorities delivered · 1 started": delivered in full against the number agreed, then
 * the ones with only a start behind them, a settled-lower ask among them (Phase 25).
 */
export function priorityCount(status: AmbitionStatus): string {
  const started = status.started + status.settledLower;
  const delivered = `${status.delivered} of ${status.priorities.length} ${
    status.priorities.length === 1 ? 'priority' : 'priorities'
  } delivered`;
  return started > 0 ? `${delivered} · ${started} started` : delivered;
}
