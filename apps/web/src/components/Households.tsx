import type { HouseholdReaction } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

const NET: Record<HouseholdReaction['net'], string> = {
  gains: 'better off',
  pays: 'worse off',
  mixed: 'gains and pays',
  untouched: 'untouched',
};

/**
 * The electorate as five households. Each says what changed for them, from the levers that
 * touched them, and whether they could tell what the Budget was for. Simulated throughout: the
 * one fact each carries has its source, and nothing here is a number the engine did not compute.
 */
export function Households({ reactions }: { reactions: HouseholdReaction[] }) {
  return (
    <ul className="households">
      {reactions.map((r) => (
        <li key={r.household.id} className={`household household--${r.net}`}>
          <p className="household__who">
            <span className="kicker">{r.household.who}</span>{' '}
            <span className={`tag--treasury household__net household__net--${r.net}`}>
              {NET[r.net]}
            </span>{' '}
            <LabelBadge badge="simulated" />
          </p>
          {r.said.length === 0 ? (
            <p className="household__line">“{r.household.untouched.text}”</p>
          ) : (
            r.said.slice(0, 3).map(({ touch, lever }) => (
              <p key={`${lever.code}-${touch.when}`} className="household__line">
                “{touch.line.text}”
                <span className="source">
                  {' '}
                  {lever.shortTitle}
                  {touch.line.sources.map((s, i) => (
                    <span key={i}>
                      {' · '}
                      <SourceLink ref={s} />
                    </span>
                  ))}
                </span>
              </p>
            ))
          )}
          <p className="household__line household__line--verdict">“{r.line.text}”</p>
          <p className="source household__fact">
            {r.household.fact.text}{' '}
            {r.household.fact.sources.map((s, i) => (
              <span key={i}>
                {i > 0 ? ' · ' : ''}
                <SourceLink ref={s} />
              </span>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}
