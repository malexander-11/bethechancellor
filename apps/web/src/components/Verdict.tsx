import { formatGbpBn, type BudgetVerdict } from '@btc/engine';
import { TableScroll } from './TableScroll';

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
 * How your Budget went (the close): what the playthrough came to. The kind of Budget is a
 * judgement from data, in one sentence with the rest a tap away; when the kind rests on a
 * worked-out fact (Phase 25: the rules held without a broken promise, a priority would have
 * fitted), that fact sits beneath it. Everything in the fold is the engine's figures totalled and
 * ranked.
 */
export function Verdict({ verdict }: { verdict: BudgetVerdict }) {
  const { ambitions, paid, benefited, kind, targetYear } = verdict;
  return (
    <section className="verdict-close doc" aria-labelledby="verdict-heading">
      <p className="doc__head">
        <span className="kicker">How your Budget went</span>
        <span className="doc__ref">
          Headroom, {targetYear}: {formatGbpBn(verdict.headroomGbpm, 1, verdict.headroomGbpm < 0)}
        </span>
      </p>
      <h2 id="verdict-heading" className="verdict-close__kind">
        {kind.title}
      </h2>
      <p className="verdict-close__line">{kind.line.short ?? kind.line.text}</p>
      {kind.line.short ? (
        <details className="spoken__more">
          <summary>More</summary>
          <p>{kind.line.text}</p>
        </details>
      ) : null}

      {kind.fact ? <p className="verdict-close__fact">{kind.fact}</p> : null}

      <details className="more">
        <summary>Priorities, promises and who paid</summary>
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
                    {p.fate !== 'unfunded' && Math.abs(p.priceGbpm) >= 50
                      ? ` · ${p.priceGbpm < 0 ? 'costs' : 'saves'} ${formatGbpBn(Math.abs(p.priceGbpm), 1)} in ${targetYear}`
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
              Who paid, who benefited
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
