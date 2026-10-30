import { fillStory, formatGbpBn } from '@btc/engine';
import { useMemo } from 'react';
import { budget, guide, scorecard } from '../data';
import { useOutcomeOf } from '../journey/outcome';

/** The welcome's own words (ADR-0047): what is not the data's or the engine's. */
export const WELCOME_TEXT = {
  story: 'What did the Budget do?',
} as const;

/**
 * The game opens on the walk (ADR-0047), with one line of welcome above the first theme: the
 * Budget's name and date, who delivered it, and what to do. What the Budget did, the story of the
 * headroom (ADR-0045), waits in one closed fold for whoever wants it. Every figure in it is read
 * from the Treasury's own scorecard or worked out by the engine on the OBR's forecast, with nothing
 * moved; nothing in it is typed.
 */
export function Welcome() {
  const outcomeOf = useOutcomeOf();
  // The Chancellor's Budget is the forecast with nothing moved: the engine's own verdicts on it.
  const base = useMemo(() => outcomeOf({}), [outcomeOf]);
  const stability = base.verdicts.find((v) => v.kind === 'currentBudget');
  const welfare = base.verdicts.find((v) => v.kind === 'welfareCap');
  const year = stability?.targetYear ?? '';
  const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);
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
  const f = budget.facts;
  const fills = {
    march: money(f.headroomInMarchGbpm.gbpm),
    debtInterest: money(f.debtInterestSinceMarchGbpm.gbpm),
    other: money(f.otherChangesSinceMarchGbpm.gbpm),
    before: money(f.headroomBeforeMeasuresGbpm.gbpm),
    measures: money(f.measuresOnCurrentBudgetGbpm.gbpm),
    headroom: money(stability?.headroomGbpm ?? 0),
    year,
    welfareGap: money(welfare?.headroomGbpm ?? 0),
    tax: money(totals.tax),
    spending: money(totals.spending),
  };
  const start = guide.stages.find((s) => s.step === 'start');

  return (
    <section className="welcome" aria-label={budget.title}>
      <p className="welcome__title">
        <strong>{budget.title}</strong> · {budget.chancellor.name}, Chancellor
      </p>
      {start ? <p className="welcome__now">{start.now}</p> : null}
      <details className="welcome__story">
        <summary>{WELCOME_TEXT.story}</summary>
        {budget.story.map((line) => (
          <p key={line.text}>{fillStory(line.text, fills)}</p>
        ))}
      </details>
    </section>
  );
}
