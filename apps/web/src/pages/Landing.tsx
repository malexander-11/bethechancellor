import { fillStory, formatGbpBn } from '@btc/engine';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { JourneyLayout } from '../components/JourneyLayout';
import { budget, scorecard } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { STAGE_ROUTES } from '../journey/routes';
import { usePageTitle } from '../journey/title';
import { useBudget } from '../state/budget';

/** The landing page's own words (ADR-0048): what is not the data's or the engine's. */
export const LANDING_TEXT = {
  headline: '{name} has delivered the Budget. What would you change?',
  standfirst:
    'Go through the Chancellor’s main measures and approve or remove each one. Then balance the books, and see how your Budget lands.',
  start: 'Start your Budget',
  figures: 'The Budget in three numbers',
  headroom: 'of headroom left against the fiscal rules in {year}',
  tax: 'a year more in tax by {year}, from the Budget’s measures',
  measures: 'measures you can approve or remove',
  how: 'How it works',
  step1: 'Approve or remove',
  step1Text: 'Go through the main measures, a few at a time.',
  step2: 'Balance the books',
  step2Text: 'Spend what you save, or find what you give up.',
  step3: 'See how it lands',
  step3Text: 'MPs, the markets and five households react.',
  chart: 'How the headroom changed since March',
  chartUnit: '£ billion, against the stability rule in {year}',
  march: 'March forecast',
  interest: 'Higher debt interest',
  other: 'Other changes',
  before: 'Before the measures',
  measuresRow: 'Budget measures',
  now: 'Headroom now',
  source: 'Source: HM Treasury, Budget 2026; OBR, Economic and fiscal outlook, October 2026.',
  story: 'Read what the Budget did',
} as const;

const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);
const signed = (gbpm: number) => `${gbpm < 0 ? '−' : '+'}${money(gbpm)}`;

interface Row {
  label: string;
  /** Where the bar starts and ends, £ million. */
  from: number;
  to: number;
  kind: 'total' | 'up' | 'down';
}

/**
 * How the headroom got from March to now, as the Budget's own chart has it (ADR-0048): the
 * published steps, then the headroom the engine works out on the forecast. A list a screen reader
 * reads as label and figure; the bars are a picture of the same numbers.
 */
function Waterfall({ rows, year }: { rows: readonly Row[]; year: string }) {
  const top = Math.max(...rows.flatMap((r) => [r.from, r.to]));
  const pct = (gbpm: number) => `${(Math.max(0, gbpm) / top) * 100}%`;
  return (
    <figure className="chart">
      <figcaption>
        <span className="chart__title">{LANDING_TEXT.chart}</span>
        <span className="chart__unit">{LANDING_TEXT.chartUnit.replace('{year}', year)}</span>
      </figcaption>
      <ol className="wf">
        {rows.map((r) => {
          const low = Math.min(r.from, r.to);
          const high = Math.max(r.from, r.to);
          return (
            <li key={r.label} className={`wf__row wf__row--${r.kind}`}>
              <span className="wf__label">{r.label}</span>
              <span className="wf__track" aria-hidden="true">
                <span
                  className={`wf__bar wf__bar--${r.kind}`}
                  style={{ insetInlineStart: pct(low), inlineSize: pct(high - low) }}
                />
              </span>
              <span className="wf__value">
                {r.kind === 'total' ? money(r.to) : signed(r.to - r.from)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="chart__source">{LANDING_TEXT.source}</p>
    </figure>
  );
}

/**
 * The landing page (ADR-0048): who delivered the Budget and the question the game asks, three
 * numbers that say what the Budget did, how the game works, and the one button that starts it.
 * Under them, the Budget's own chart of the headroom since March, and the story in a fold. Every
 * figure is a quoted fact or worked out by the engine on the OBR's forecast with nothing moved;
 * nothing on the page is typed.
 */
export function LandingPage() {
  const { query } = useBudget();
  const navigate = useNavigate();
  const outcomeOf = useOutcomeOf();
  usePageTitle(budget.title);
  // The Chancellor's Budget is the forecast with nothing moved: the engine's own verdicts on it.
  const base = useMemo(() => outcomeOf({}), [outcomeOf]);
  const stability = base.verdicts.find((v) => v.kind === 'currentBudget');
  const welfare = base.verdicts.find((v) => v.kind === 'welfareCap');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  // What the measures do by the target year, from the scorecard's own lines: positive reduces
  // borrowing, so a tax total above nought is money raised and a spending total below it money spent.
  const totals = scorecard.measures.reduce(
    (acc, m) => {
      const v = m.values[year] ?? 0;
      if (m.type === 'Tax') acc.tax += v;
      else acc.spending += v;
      return acc;
    },
    { tax: 0, spending: 0 },
  );
  const cards = budget.themes.reduce((n, t) => n + t.cards.length, 0);
  const f = budget.facts;
  const fills = {
    march: money(f.headroomInMarchGbpm.gbpm),
    debtInterest: money(f.debtInterestSinceMarchGbpm.gbpm),
    other: money(f.otherChangesSinceMarchGbpm.gbpm),
    before: money(f.headroomBeforeMeasuresGbpm.gbpm),
    measures: money(f.measuresOnCurrentBudgetGbpm.gbpm),
    headroom: money(headroom),
    year,
    welfareGap: money(welfare?.headroomGbpm ?? 0),
    tax: money(totals.tax),
    spending: money(totals.spending),
  };
  const march = f.headroomInMarchGbpm.gbpm;
  const afterInterest = march + f.debtInterestSinceMarchGbpm.gbpm;
  const before = f.headroomBeforeMeasuresGbpm.gbpm;
  const rows: Row[] = [
    { label: LANDING_TEXT.march, from: 0, to: march, kind: 'total' },
    { label: LANDING_TEXT.interest, from: march, to: afterInterest, kind: 'down' },
    {
      label: LANDING_TEXT.other,
      from: afterInterest,
      to: before,
      kind: before >= afterInterest ? 'up' : 'down',
    },
    { label: LANDING_TEXT.before, from: 0, to: before, kind: 'total' },
    {
      label: LANDING_TEXT.measuresRow,
      from: before,
      to: headroom,
      kind: headroom >= before ? 'up' : 'down',
    },
    { label: LANDING_TEXT.now, from: 0, to: headroom, kind: 'total' },
  ];
  const at = (text: string) => text.replace('{year}', year);
  const start = () => navigate({ pathname: STAGE_ROUTES.measures, search: `?${query}` });

  return (
    <JourneyLayout step="start" intro={false}>
      <article className="landing">
        <header className="landing__head">
          <p className="landing__kicker">{budget.title}</p>
          <h1 className="landing__headline">
            {LANDING_TEXT.headline.replace('{name}', budget.chancellor.name)}
          </h1>
          <p className="landing__standfirst">{LANDING_TEXT.standfirst}</p>
          <p className="landing__cta">
            <button type="button" className="btn btn--primary btn--big" onClick={start}>
              {LANDING_TEXT.start}
              <svg className="btn__arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M4 10h11M11 5l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </p>
        </header>

        <section className="figures" aria-label={LANDING_TEXT.figures}>
          <p className="figure">
            <span className="figure__value">{money(headroom)}</span>
            <span className="figure__label">{at(LANDING_TEXT.headroom)}</span>
          </p>
          <p className="figure">
            <span className="figure__value">{money(totals.tax)}</span>
            <span className="figure__label">{at(LANDING_TEXT.tax)}</span>
          </p>
          <p className="figure">
            <span className="figure__value">{cards}</span>
            <span className="figure__label">{LANDING_TEXT.measures}</span>
          </p>
        </section>

        <section className="how" aria-labelledby="how-heading">
          <h2 id="how-heading" className="landing__section">
            {LANDING_TEXT.how}
          </h2>
          <ol className="how__steps">
            {(
              [
                [LANDING_TEXT.step1, LANDING_TEXT.step1Text],
                [LANDING_TEXT.step2, LANDING_TEXT.step2Text],
                [LANDING_TEXT.step3, LANDING_TEXT.step3Text],
              ] as const
            ).map(([title, text], i) => (
              <li key={title} className="how__step">
                <span className="how__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="how__title">{title}</span>
                <span className="how__text">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing__chart" aria-label={LANDING_TEXT.chart}>
          <Waterfall rows={rows} year={year} />
          <details className="more landing__story">
            <summary>{LANDING_TEXT.story}</summary>
            <div className="more__body">
              {budget.story.map((line) => (
                <p key={line.text}>{fillStory(line.text, fills)}</p>
              ))}
            </div>
          </details>
        </section>
      </article>
    </JourneyLayout>
  );
}
