import { formatGbpBn, type AmbitionStatus, type GamePermalink } from '@btc/engine';

/**
 * The red box on the desk: the running score of the game. Headroom against the target the player
 * set at stage 1, priorities funded against the number agreed with the Prime Minister, promises
 * kept. Every figure is the engine's; the target and the counts are the player's own choices.
 */
export function DespatchBox({
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
    <div className="despatch" role="status" aria-label="The despatch box">
      <div className="despatch__cell">
        <span className="despatch__label">Headroom, {targetYear}</span>
        <span className="despatch__value">
          {formatGbpBn(headroomGbpm, 1, true)}
          <span className="despatch__sub">
            {target > 0
              ? ` against your ${formatGbpBn(target, 0)} target`
              : ' · target: whatever the rules leave'}
          </span>
        </span>
      </div>
      <div className="despatch__cell">
        <span className="despatch__label">Priorities</span>
        <span className="despatch__value">
          {status.priorities.length === 0
            ? 'none agreed yet'
            : `${status.funded} of ${status.priorities.length} funded`}
        </span>
      </div>
      <div className="despatch__cell">
        <span className="despatch__label">Promises</span>
        <span className="despatch__value">
          {status.promises.length === 0
            ? 'none yet'
            : status.broken === 0
              ? `all ${kept} kept`
              : `${status.broken} broken, ${kept} kept`}
        </span>
      </div>
    </div>
  );
}
