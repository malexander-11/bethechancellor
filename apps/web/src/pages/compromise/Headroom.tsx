import { formatGbpBn, type GamePermalink, type Outcome, type resilienceRows } from '@btc/engine';
import { Spoken } from '../../components/Conversation';
import { LabelBadge } from '../../components/LabelBadge';
import { SourceList } from '../../components/SourceLink';
import { compromise, rules } from '../../data';
import { TARGETS } from '../Outlook';
import type { Moves } from './shared';

type StressRow = ReturnType<typeof resilienceRows>[number];

/**
 * The third screen in either mood: the four targets (accept less headroom, or keep more) with
 * the Chief Economic Adviser's case folded under their name; with a rule missed, "Or borrow, and
 * say so": the Charter's escape clause one fold away and the written acknowledgement, which
 * stands, with a way to withdraw it, once the rules are met again. The package under every other
 * forecast is one fold away on this screen and no other.
 */
export function KeepHeadroom({
  surplus,
  game,
  missed,
  stress,
  spend,
  moves,
}: {
  surplus: boolean;
  game: GamePermalink;
  missed: Outcome['verdicts'];
  stress: readonly StressRow[];
  spend: (patch: Partial<GamePermalink>) => void;
  moves: Moves;
}) {
  const route = surplus ? compromise.routes.bank : compromise.routes.target;
  return (
    <>
      <section
        className="route doc"
        aria-label={surplus ? 'Keep the extra headroom' : 'Accept less headroom'}
      >
        <Spoken line={route.line} who={moves.role(route.adviser)} tone="adviser" folded />
        <div className="targets__options" role="radiogroup" aria-label="Headroom target">
          {TARGETS.map((t) => (
            <label
              key={t.bn}
              className={`target${game.headroomTargetBn === t.bn ? ' target--picked' : ''}`}
            >
              <input
                type="radio"
                name="headroom-target"
                value={t.bn}
                checked={game.headroomTargetBn === t.bn}
                onChange={() => spend({ headroomTargetBn: t.bn })}
              />
              <span className="target__body">
                <strong>{t.label}</strong>
                <span>{t.say}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {!surplus && missed.length > 0 ? (
        <section className="route doc route--breach" aria-labelledby="route-breach">
          <h2 id="route-breach" className="section-label">
            Or borrow, and say so
          </h2>
          <Spoken
            line={compromise.routes.breach.line}
            who={moves.role(compromise.routes.breach.adviser)}
            tone="adviser"
            folded
          />
          <details className="charter">
            <summary>What the Charter says</summary>
            <blockquote>
              <p>{rules.escapeClause.text}</p>
              <SourceList refs={[rules.escapeClause.source]} />
            </blockquote>
          </details>
          <label className="breach">
            <input
              type="checkbox"
              checked={game.breachAccepted}
              onChange={(e) => spend({ breachAccepted: e.target.checked })}
            />
            <span>
              I understand that{' '}
              {missed
                .map(
                  (v) =>
                    `the ${v.ruleName.toLowerCase()} will be missed by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`,
                )
                .join(' and ')}{' '}
              on these numbers, and I am choosing to proceed.
            </span>
          </label>
        </section>
      ) : game.breachAccepted ? (
        <aside className="route doc route--quiet" aria-label="Your acknowledgement">
          <p className="panel__hint">No rule is missed now. Your written acknowledgement stands.</p>
          <button type="button" className="btn" onClick={() => spend({ breachAccepted: false })}>
            Withdraw the acknowledgement
          </button>
        </aside>
      ) : null}

      <details className="more">
        <summary>How would this hold up under the other forecasts?</summary>
        <div className="more__body">
          <p className="panel__hint">
            Your Budget as it stands, re-run under every outcome the draw could have produced. The
            one that arrived is marked. <LabelBadge badge="mechanical" />
          </p>
          <ul className="fates resilience">
            {stress.map((r) => (
              <li key={r.outcome.id} className={r.drawn ? 'resilience--drawn' : undefined}>
                <strong>{r.outcome.title}</strong>
                {r.drawn ? <span className="tag--treasury">what arrived</span> : null} ·{' '}
                <span className={`amount ${r.headroomGbpm < 0 ? 'amount--worse' : ''}`}>
                  {formatGbpBn(r.headroomGbpm, 1, r.headroomGbpm < 0)}
                </span>
                {r.rulesMissed.length > 0 ? (
                  <span className="source"> · {r.rulesMissed.join(' and ')} missed</span>
                ) : (
                  <span className="source"> · rules met</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </>
  );
}
