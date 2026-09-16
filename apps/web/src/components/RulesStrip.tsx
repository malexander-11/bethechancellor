import { formatGbpBn, type Outcome, type ReactionSignal } from '@btc/engine';
import { HeadroomGauge } from './HeadroomGauge';
import { LabelBadge } from './LabelBadge';

/**
 * Your rules, in one strip above the three audiences: the four rules signals and the headroom
 * gauge. The rules are the one audience that is arithmetic rather than judgement, so the strip
 * carries the mechanical badge and the bands sit beneath it.
 */
export function RulesStrip({
  outcome,
  signals,
  typicalErrorGbpm,
}: {
  outcome: Outcome;
  signals: ReactionSignal[];
  typicalErrorGbpm: number;
}) {
  const rules = signals.filter((s) => s.audience === 'rules');
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const headroom = stability?.headroomGbpm ?? 0;
  return (
    <section className="rules-strip doc" aria-labelledby="rules-strip-heading">
      <div className="rules-strip__head">
        <h3 id="rules-strip-heading" className="reaction__title">
          Your own rules <LabelBadge badge="mechanical" />
        </h3>
        <div className="rules-strip__headroom">
          <span className="scorecard__label">Headroom, {stability?.targetYear ?? ''}</span>
          <strong className={headroom < 0 ? 'amount--worse' : ''}>
            {formatGbpBn(headroom, 1, headroom < 0)}
          </strong>
        </div>
        <HeadroomGauge
          headroomGbpm={headroom}
          baselineGbpm={stability?.baseline.headroomGbpm ?? 0}
          typicalErrorGbpm={typicalErrorGbpm}
        />
      </div>
      <ul className="rules-strip__list">
        {rules.map((s) => (
          <li key={s.id} className={`signal signal--${s.level}`}>
            <p className="signal__headline">{s.headline}</p>
            <p className="signal__detail">{s.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
