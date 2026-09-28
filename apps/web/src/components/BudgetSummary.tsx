import { formatGbpBn, type AmbitionStatus } from '@btc/engine';
import { priorityCount } from './HeadroomBar';

/**
 * The running score of the game, in one strip: headroom, priorities delivered against the number
 * agreed with the Prime Minister, promises kept. Every figure is the engine's; the counts are the
 * player's own choices read back.
 */
export function BudgetSummary({
  status,
  headroomGbpm,
  targetYear,
  showHeadroom = true,
}: {
  status: AmbitionStatus;
  headroomGbpm: number;
  targetYear: string;
  /** Off where a scorecard on the same screen already carries the headroom. */
  showHeadroom?: boolean;
}) {
  // The fiscal rules are counted where the rules are shown, not here (Phase 25).
  const watched = status.promises.filter((p) => p.promise.judgedBy !== 'fiscalRules');
  const kept = watched.length - status.broken;
  return (
    <section className="summary" aria-label="Your Budget so far">
      {showHeadroom ? (
        <div className="summary__cell">
          <span className="summary__label">Headroom, {targetYear}</span>
          <span className="summary__value">{formatGbpBn(headroomGbpm, 1, true)}</span>
        </div>
      ) : null}
      <div className="summary__cell">
        <span className="summary__label">Priorities</span>
        <span className="summary__value">
          {status.priorities.length === 0 ? 'none agreed yet' : priorityCount(status)}
        </span>
      </div>
      <div className="summary__cell">
        <span className="summary__label">Promises</span>
        <span className="summary__value">
          {watched.length === 0
            ? 'none yet'
            : status.broken === 0
              ? `all ${kept} kept`
              : `${status.broken} broken, ${kept} kept`}
        </span>
      </div>
    </section>
  );
}
