import { SHARE_WORDS, summaryWords, type BudgetSummary } from '@btc/engine';
import { ChangeList } from './ChangeList';

/**
 * A finished Budget in words, as its picture draws it but in full (ADR-0044): every tax and every
 * budget it moved, the headroom it leaves and the rules, and how the three audiences rated it.
 * Its headings sit under the page's own.
 */
export function BudgetFacts({
  summary,
  headings,
}: {
  summary: BudgetSummary;
  headings: { sides: string; verdict: string };
}) {
  const words = summaryWords(summary);
  const side = (id: string, title: string, rows: BudgetSummary['tax'], none: string) => (
    <section className="facts__side" aria-labelledby={id}>
      <h3 id={id} className="section-label">
        {title}
      </h3>
      {rows.length > 0 ? <ChangeList rows={rows} /> : <p className="panel__hint">{none}</p>}
    </section>
  );
  return (
    <div className="facts">
      <h2 className="facts__heading">{headings.sides}</h2>
      <div className="facts__sides">
        {side('facts-tax', SHARE_WORDS.tax, summary.tax, SHARE_WORDS.noTax)}
        {side('facts-spending', SHARE_WORDS.spending, summary.spending, SHARE_WORDS.noSpending)}
      </div>
      <h2 className="facts__heading">{headings.verdict}</h2>
      <p className="facts__rules">
        {summary.headroomLine}{' '}
        <span className={summary.rules.met ? 'facts__met' : 'facts__missed'}>{words.rules}</span>
      </p>
      <ul className="facts__ratings">
        {summary.ratings.map((r) => (
          <li key={r.audience}>
            <span className="facts__audience">{r.title}:</span>{' '}
            {SHARE_WORDS.rating.replace('{label}', r.label).replace('{rating}', String(r.rating))}
          </li>
        ))}
      </ul>
    </div>
  );
}
