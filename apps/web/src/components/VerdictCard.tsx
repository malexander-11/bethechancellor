import { formatGbp, formatGbpBn, formatPct, perHousehold, type RuleVerdict } from '@btc/engine';
import { rules } from '../data';
import { HeadroomGauge } from './HeadroomGauge';
import { LabelBadge } from './LabelBadge';

type Tone = 'good' | 'warning' | 'critical' | 'muted';

const STATUS: Record<RuleVerdict['status'], { text: string; tone: Tone; icon: string }> = {
  met: { text: 'Rule met', tone: 'good', icon: '✓' },
  notMet: { text: 'Rule not met', tone: 'critical', icon: '✕' },
  withinCap: { text: 'Within the cap', tone: 'good', icon: '✓' },
  aboveCapWithinMargin: { text: 'Above cap, within margin', tone: 'warning', icon: '!' },
  aboveMargin: { text: 'Cap breached', tone: 'critical', icon: '✕' },
  unavailable: { text: 'Not assessable', tone: 'muted', icon: '?' },
};

export function VerdictCard({
  verdict,
  householdCount,
  typicalErrorGbpm,
}: {
  verdict: RuleVerdict;
  householdCount: number;
  typicalErrorGbpm: number;
}) {
  const status = STATUS[verdict.status];
  const rule = rules.rules.find((r) => r.id === verdict.ruleId);
  const delta = verdict.headroomGbpm - verdict.baseline.headroomGbpm;
  const headroomLabel =
    verdict.kind === 'welfareCap'
      ? 'Room below the margin ceiling'
      : verdict.kind === 'stockFalling'
        ? 'Headroom (how much more debt could rise)'
        : 'Headroom';
  return (
    <article className="verdict" aria-label={`${verdict.ruleName}: ${status.text}`}>
      <h3 className="verdict__name">
        {verdict.ruleName}
        <span className="verdict__year">
          {verdict.targetYear}
          {verdict.rolling ? ', rolling' : ''}
        </span>
      </h3>
      {/* Never colour alone: the icon and the words carry the verdict, the colour repeats it. */}
      <p className={`status status--${status.tone}`}>
        <span className="status__icon" aria-hidden="true">
          {status.icon}
        </span>
        {status.text}
      </p>
      {Number.isFinite(verdict.headroomGbpm) ? (
        <>
          <div className="hero">
            {formatGbpBn(verdict.headroomGbpm, 1, verdict.headroomGbpm < 0)}
            <small>
              {headroomLabel}
              {verdict.kind !== 'stockFalling'
                ? ` · ${formatPct(verdict.headroomPctGdp, 1)} of GDP · about ${formatGbp(perHousehold(verdict.headroomGbpm, householdCount))} per household`
                : ` · ${formatPct(verdict.headroomPctGdp, 2, false, 'pp')} of GDP`}
            </small>
          </div>
          <HeadroomGauge
            headroomGbpm={verdict.headroomGbpm}
            baselineGbpm={verdict.baseline.headroomGbpm}
            typicalErrorGbpm={typicalErrorGbpm}
          />
          <dl className="kv">
            <dt>OBR March 2026 baseline</dt>
            <dd>
              {formatGbpBn(verdict.baseline.headroomGbpm, 1, verdict.baseline.headroomGbpm < 0)}
            </dd>
            <dt>Your changes</dt>
            <dd className={delta < -0.5 ? 'amount--worse' : delta > 0.5 ? 'amount--better' : ''}>
              {formatGbpBn(delta, 1, true)}
            </dd>
            {verdict.rolling && verdict.headroomToToleranceGbpm !== undefined ? (
              <>
                <dt>Against the 0.5% of GDP tolerance</dt>
                <dd>{formatGbpBn(verdict.headroomToToleranceGbpm, 1, true)}</dd>
              </>
            ) : null}
            <dt>OBR typical 5-year forecast error</dt>
            <dd>{formatGbpBn(typicalErrorGbpm, 0)}</dd>
          </dl>
        </>
      ) : null}
      <p className="verdict__explain">
        {verdict.explanation} <LabelBadge badge="mechanical" />
      </p>
      <details className="charter">
        <summary>What the rule says</summary>
        <p className="verdict__explain">{verdict.requirement}</p>
        {rule ? (
          <>
            <blockquote>{rule.charterText}</blockquote>
            {rule.kind === 'currentBudget' && rule.toleranceText ? (
              <blockquote>{rule.toleranceText}</blockquote>
            ) : null}
            <p className="source">{rule.plainEnglish}</p>
          </>
        ) : null}
      </details>
    </article>
  );
}
