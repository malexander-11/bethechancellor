import { formatGbpBn, type AmbitionStatus, type GamePermalink } from '@btc/engine';

/**
 * The running score of the game, in one strip: headroom against the target the player set at
 * stage 1, priorities funded against the number agreed with the Prime Minister, promises kept.
 * Every figure is the engine's; the target and the counts are the player's own choices.
 */
export function BudgetSummary({
  game,
  status,
  headroomGbpm,
  targetYear,
}: {
  game: GamePermalink;
  status: AmbitionStatus;
  headroomGbpm: number;
  targetYear: string;
}) {
  const target = game.headroomTargetBn * 1000;
  const kept = status.promises.length - status.broken;
  return (
    <section className="summary" aria-label="Your Budget so far">
      <div className="summary__cell">
        <span className="summary__label">Headroom, {targetYear}</span>
        <span className="summary__value">
          {formatGbpBn(headroomGbpm, 1, true)}
          <span className="summary__sub">
            {target > 0
              ? ` against your ${formatGbpBn(target, 0)} target`
              : ' · target: whatever the rules leave'}
          </span>
        </span>
      </div>
      <div className="summary__cell">
        <span className="summary__label">Priorities</span>
        <span className="summary__value">
          {status.priorities.length === 0
            ? 'none agreed yet'
            : `${status.funded} of ${status.priorities.length} funded`}
        </span>
      </div>
      <div className="summary__cell">
        <span className="summary__label">Promises</span>
        <span className="summary__value">
          {status.promises.length === 0
            ? 'none yet'
            : status.broken === 0
              ? `all ${kept} kept`
              : `${status.broken} broken, ${kept} kept`}
        </span>
      </div>
    </section>
  );
}
