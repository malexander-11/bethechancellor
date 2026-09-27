import { formatGbpBn, formatPct, type Outcome, type RuleVerdict } from '@btc/engine';
import { HeadroomGauge } from './HeadroomGauge';

type Tone = 'good' | 'warning' | 'critical' | 'muted';

const STATUS: Record<RuleVerdict['status'], { tone: Tone; icon: string; text: string }> = {
  met: { tone: 'good', icon: '✓', text: 'met' },
  notMet: { tone: 'critical', icon: '✕', text: 'not met' },
  withinCap: { tone: 'good', icon: '✓', text: 'within cap' },
  aboveCapWithinMargin: { tone: 'warning', icon: '!', text: 'within margin' },
  aboveMargin: { tone: 'critical', icon: '✕', text: 'breached' },
  unavailable: { tone: 'muted', icon: '?', text: 'n/a' },
};

const SHORT: Record<RuleVerdict['kind'], string> = {
  currentBudget: 'Stability',
  stockFalling: 'Investment',
  welfareCap: 'Welfare cap',
};

/** A change in headroom said the way a reader thinks: "£9.5bn more", "£0.7bn less", "no change". */
function moreOrLess(delta: number): string {
  if (Math.abs(delta) < 50) return 'no change';
  return `${formatGbpBn(Math.abs(delta), 1)} ${delta > 0 ? 'more' : 'less'}`;
}

/**
 * The running score: headroom against the stability rule as the big number, the three rule
 * verdicts and four fiscal aggregates in the rules' target year, each as OBR March → yours.
 */
export function Scorecard({
  outcome,
  typicalErrorGbpm,
  sticky = false,
  economy,
}: {
  outcome: Outcome;
  typicalErrorGbpm: number;
  sticky?: boolean;
  /**
   * What the economy in play is called ("today’s estimate"). When it has moved the headroom from
   * March, the hero shows it as a figure of its own, so the move is not credited to the player's
   * measures: "OBR in March · today’s estimate · your measures".
   */
  economy?: string;
}) {
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year =
    stability?.targetYear ?? outcome.paths.policyYears[outcome.paths.policyYears.length - 1] ?? '';
  const b = outcome.paths.baseline;
  const p = outcome.paths.policy;
  const headroom = stability?.headroomGbpm ?? 0;
  const baseHeadroom = stability?.baseline.headroomGbpm ?? 0;
  const delta = headroom - baseHeadroom;
  // What the economy did on its own: the March baseline plus the macro sliders' attribution.
  const macroMove = outcome.attribution
    .filter((r) => r.kind === 'macro')
    .reduce((acc, r) => acc + r.currentBudgetGbpm, 0);
  const economyHeadroom = baseHeadroom - macroMove;
  const showEconomy = economy !== undefined && Math.abs(macroMove) >= 50;
  const cells = [
    {
      label: 'Budget balance',
      hint: 'current budget surplus',
      from: -(b.currentBudgetDeficit[year] ?? 0),
      to: -(p.currentBudgetDeficit[year] ?? 0),
      fmt: (v: number) => formatGbpBn(v, 1, true),
    },
    {
      label: 'Borrowing',
      hint: 'PSNB',
      from: b.psnb[year] ?? 0,
      to: p.psnb[year] ?? 0,
      fmt: (v: number) => formatGbpBn(v, 1),
    },
    {
      label: 'Debt',
      hint: 'net financial liabilities, % of GDP',
      from: b.psnflPctGdp[year] ?? 0,
      to: p.psnflPctGdp[year] ?? 0,
      fmt: (v: number) => formatPct(v, 1),
    },
    {
      label: 'Deficit',
      hint: 'borrowing, % of GDP',
      from: b.psnbPctGdp[year] ?? 0,
      to: p.psnbPctGdp[year] ?? 0,
      fmt: (v: number) => formatPct(v, 1),
    },
  ];
  return (
    <section
      className={`scorecard${sticky ? ' scorecard--sticky' : ''}`}
      aria-label={`Scorecard for ${year}`}
    >
      <div className="scorecard__hero">
        <div className="scorecard__label">Headroom, {year}</div>
        <div
          className={`scorecard__big ${headroom < 0 ? 'amount--worse' : delta > 0.5 ? 'amount--better' : ''}`}
        >
          {formatGbpBn(headroom, 1, headroom < 0)}
        </div>
        <div className="scorecard__from">
          {showEconomy ? (
            <>
              OBR in March {formatGbpBn(baseHeadroom, 1)} · {economy}{' '}
              {formatGbpBn(economyHeadroom, 1, economyHeadroom < 0)} · your measures{' '}
              {moreOrLess(headroom - economyHeadroom)}
            </>
          ) : (
            <>
              OBR in March {formatGbpBn(baseHeadroom, 1)} · your changes {moreOrLess(delta)}
            </>
          )}
        </div>
        <HeadroomGauge
          headroomGbpm={headroom}
          baselineGbpm={baseHeadroom}
          typicalErrorGbpm={typicalErrorGbpm}
        />
        <p className="scorecard__caption">
          Typical forecast error over five years: ±{formatGbpBn(typicalErrorGbpm, 0)}.
        </p>
      </div>
      <div className="scorecard__cell scorecard__rules">
        <div className="scorecard__label">Fiscal rules</div>
        <ul className="pills">
          {outcome.verdicts.map((v) => {
            const s = STATUS[v.status];
            return (
              <li key={v.ruleId} className={`pill pill--${s.tone}`}>
                <span aria-hidden="true">{s.icon}</span> {SHORT[v.kind]}: {s.text}
              </li>
            );
          })}
        </ul>
      </div>
      {cells.map((c) => (
        <div key={c.label} className="scorecard__cell">
          <div className="scorecard__label">
            {c.label} <span className="scorecard__hint">{c.hint}</span>
          </div>
          <div className="scorecard__value">{c.fmt(c.to)}</div>
          <div className="scorecard__from">March: {c.fmt(c.from)}</div>
        </div>
      ))}
    </section>
  );
}
