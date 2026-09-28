import { formatGbpBn, type BudgetVerdict } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { TableScroll } from './TableScroll';
import { SourceList } from './SourceLink';

const PRIORITY: Record<BudgetVerdict['ambitions']['priorities'][number]['fate'], string> = {
  delivered: 'delivered',
  settledLower: 'settled lower',
  started: 'started',
  unfunded: 'not funded',
};

const PROMISE: Record<BudgetVerdict['ambitions']['promises'][number]['fate'], string> = {
  kept: 'kept',
  strained: 'kept, in the words',
  'broken-by-choice': 'broken by choice',
  'broken-by-arithmetic': 'broken by the arithmetic',
};

/**
 * The close: what the playthrough came to. The kind of Budget is a judgement from data and wears
 * the badge, in one sentence with the rest a tap away; everything beneath it, folded under "The
 * close in full", is the engine's figures totalled and ranked.
 */
export function Verdict({ verdict }: { verdict: BudgetVerdict }) {
  const { ambitions, paid, benefited, kind, targetYear } = verdict;
  return (
    <section className="verdict-close doc" aria-labelledby="verdict-heading">
      <p className="doc__head">
        <span className="kicker">The close</span>
        <span className="doc__ref">
          Headroom, {targetYear}: {formatGbpBn(verdict.headroomGbpm, 1, verdict.headroomGbpm < 0)}
        </span>
      </p>
      <h2 id="verdict-heading" className="verdict-close__kind">
        {kind.title} <LabelBadge badge={kind.line.badge} />
      </h2>
      <p className="verdict-close__line">{kind.line.short ?? kind.line.text}</p>
      {kind.line.short ? (
        <details className="spoken__more">
          <summary>More</summary>
          <p>{kind.line.text}</p>
        </details>
      ) : null}
      <SourceList refs={kind.line.sources} />

      <details className="more">
        <summary>The close in full</summary>
        <div className="more__body verdict-close__grid">
          <section aria-labelledby="ambitions-heading">
            <h3 id="ambitions-heading" className="section-label">
              Which ambitions survived
            </h3>
            {ambitions.priorities.length === 0 ? (
              <p className="panel__hint">No priorities were agreed in Downing Street.</p>
            ) : (
              <ul className="fates">
                {ambitions.priorities.map((p) => (
                  <li key={p.title} className={`fate fate--${p.fate}`}>
                    <strong>{p.title}</strong> · {PRIORITY[p.fate]}
                    {p.fate !== 'unfunded'
                      ? ` · ${formatGbpBn(Math.abs(p.spendingGbpm), 1)} in ${targetYear}`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
            <ul className="fates">
              {ambitions.promises.map((p) => (
                <li key={p.title} className={`fate fate--${p.fate}`}>
                  <strong>{p.title}</strong> · {PROMISE[p.fate]}
                  {p.by?.length ? ` (${p.by.join(', ')})` : ''}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="incidence-heading">
            <h3 id="incidence-heading" className="section-label">
              Who paid, who benefited <LabelBadge badge="mechanical" />
            </h3>
            {paid.length === 0 && benefited.length === 0 ? (
              <p className="panel__hint">Nothing moved money in {targetYear}.</p>
            ) : (
              <TableScroll label="Who paid, who benefited">
                <table className="measures incidence">
                  <tbody>
                    {paid.map((r) => (
                      <tr key={r.group}>
                        <td>
                          {r.label} <span className="source">{r.levers.join(', ')}</span>
                        </td>
                        <td className="amount">
                          {r.gbpm >= 0 ? 'pays ' : 'gains '}
                          {formatGbpBn(Math.abs(r.gbpm), 1)}
                        </td>
                      </tr>
                    ))}
                    {benefited.map((r) => (
                      <tr key={r.group}>
                        <td>
                          {r.label} <span className="source">{r.levers.join(', ')}</span>
                        </td>
                        <td className="amount">
                          {r.gbpm >= 0 ? 'receives ' : 'loses '}
                          {formatGbpBn(Math.abs(r.gbpm), 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}
