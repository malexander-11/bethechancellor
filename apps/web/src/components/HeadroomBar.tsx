import { formatGbpBn, type AmbitionStatus, type GamePermalink, type Outcome } from '@btc/engine';

/**
 * The score while you build, in one slim strip that stays in view: headroom in the target year
 * against the margin you set out to keep, how many priorities are delivered, whether the promises
 * hold and whether the rules are met. Every figure is the engine's; the target and the counts are
 * the player's own choices read back. It sits under the header and never covers a control.
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
  const kept = status.promises.length - status.broken;
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
  return (
    <section className="bar" aria-label="Your Budget so far">
      <p className="bar__headroom">
        <span className="bar__label">Headroom, {year}</span>
        <span className={`bar__figure${tone}`}>{formatGbpBn(headroom, 1, headroom < 0)}</span>
        <span className="bar__target">{against}</span>
      </p>
      <dl className="bar__facts">
        <div>
          <dt>Priorities</dt>
          <dd>
            {status.priorities.length === 0
              ? 'none agreed yet'
              : `${status.delivered} of ${status.priorities.length} delivered`}
          </dd>
        </div>
        <div>
          <dt>Promises</dt>
          <dd>
            {status.promises.length === 0
              ? 'none'
              : status.broken === 0
                ? `all ${kept} kept`
                : `${status.broken} broken, ${kept} kept`}
          </dd>
        </div>
        <div>
          <dt>Rules</dt>
          <dd className={missed.length > 0 ? 'bar__missed' : undefined}>
            {missed.length === 0 ? 'all met' : `${missed.map((v) => v.ruleName).join(', ')} missed`}
          </dd>
        </div>
      </dl>
    </section>
  );
}
