import { formatGbpBn, type BudgetVerdict } from '@btc/engine';
import { formatLeverValue } from './LeverControl';
import { LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';

const PRIORITY: Record<BudgetVerdict['ambitions']['priorities'][number]['fate'], string> = {
  delivered: 'delivered',
  narrowed: 'narrowed',
  delayed: 'delayed',
  unfunded: 'not funded',
};

const PROMISE: Record<BudgetVerdict['ambitions']['promises'][number]['fate'], string> = {
  kept: 'kept',
  'broken-by-choice': 'broken by choice',
  'broken-by-arithmetic': 'broken by the arithmetic',
};

/**
 * The close: what the playthrough came to. The kind of Budget is a judgement from data and wears
 * the badge; everything beneath it is the engine's figures totalled, ranked or re-run.
 */
export function Verdict({ verdict, replayHref }: { verdict: BudgetVerdict; replayHref: string }) {
  const { ambitions, paid, benefited, compromises, resilience, kind, targetYear } = verdict;
  const drawn = resilience.find((r) => r.drawn);
  const worst = [...resilience].sort((a, b) => a.headroomGbpm - b.headroomGbpm)[0];
  const best = [...resilience].sort((a, b) => b.headroomGbpm - a.headroomGbpm)[0];
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
      <p className="verdict-close__line">{kind.line.text}</p>
      <SourceList refs={kind.line.sources} />

      <div className="verdict-close__grid">
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
                  {p.fate === 'delivered' || p.fate === 'narrowed' || p.fate === 'delayed'
                    ? ` · ${formatGbpBn(Math.abs(p.costGbpm), 1)} in ${targetYear}`
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
            <div className="table-scroll">
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
            </div>
          )}
        </section>

        <section aria-labelledby="compromises-heading">
          <h3 id="compromises-heading" className="section-label">
            The compromises that mattered <LabelBadge badge="mechanical" />
          </h3>
          {compromises.length === 0 ? (
            <p className="panel__hint">
              Nothing moved after the forecast: the package you delivered is the one the OBR saw.
            </p>
          ) : (
            <ul className="fates">
              {compromises.slice(0, 6).map((c) => (
                <li key={c.lever.code}>
                  <strong>{c.lever.shortTitle}</strong> · {formatLeverValue(c.lever, c.from)} →{' '}
                  {formatLeverValue(c.lever, c.to)} ·{' '}
                  <span
                    className={`amount ${c.deltaGbpm < 0 ? 'amount--better' : 'amount--worse'}`}
                  >
                    {formatGbpBn(c.deltaGbpm, 1, true)}
                  </span>{' '}
                  to borrowing in {targetYear}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="resilience-heading">
          <h3 id="resilience-heading" className="section-label">
            How it would have fared under the other forecasts <LabelBadge badge="mechanical" />
          </h3>
          <p className="panel__hint">
            Your final package, re-run under every outcome the draw could have produced. The one
            that arrived is marked.
          </p>
          <ul className="fates resilience">
            {resilience.map((r) => (
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
          {worst && best ? (
            <p className="panel__hint">
              Under the gloomiest published outcome you would have had{' '}
              {formatGbpBn(worst.headroomGbpm, 1, worst.headroomGbpm < 0)}
              {worst.rulesMissed.length > 0 ? ' and missed a rule' : ''}; under the kindest,{' '}
              {formatGbpBn(best.headroomGbpm, 1, best.headroomGbpm < 0)} to spare.
              {drawn ? ` You drew ${drawn.outcome.title.toLowerCase()}.` : ''}
            </p>
          ) : null}
        </section>
      </div>
      <p className="verdict-close__replay">
        <a href={replayHref}>Replay under the same conditions</a>: the same seed, a fresh Budget.
      </p>
    </section>
  );
}
