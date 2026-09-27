import { formatGbpBn, optionOff, type AffordOption, type AffordSuggestion } from '@btc/engine';
import { Spoken } from '../../components/Conversation';
import { LabelBadge } from '../../components/LabelBadge';
import { formatLeverValue } from '../../components/LeverControl';
import { compromise, levers } from '../../data';
import { StepLink } from '../../journey/links';
import type { Moves } from './shared';

/**
 * The sums, first screen: the Director of Tax's three ways to pay not yet chosen, ranked by what
 * each raises in the target year, one that breaks or strains a promise saying so. "Do it" puts
 * the option's levers in the Budget. The adviser's case folds under their name.
 */
export function RaiseMoreTax({
  revenue,
  moves,
}: {
  revenue: readonly AffordSuggestion[];
  moves: Moves;
}) {
  const route = compromise.routes.revenue;
  return (
    <section className="route doc" aria-label="Ways to raise more tax">
      <Spoken line={route.line} who={moves.role(route.adviser)} tone="adviser" folded />
      {revenue.length === 0 ? (
        <p className="panel__hint">Every way to pay is already in your Budget.</p>
      ) : (
        <ul className="suggestions">
          {revenue.map((s) => (
            <li key={s.option.id} className="suggestion">
              <div>
                <strong>{s.option.title}</strong>{' '}
                <span className="source">
                  to{' '}
                  {formatLeverValue(
                    s.lever,
                    s.option.values[s.lever.code] ?? s.lever.control.default,
                  )}{' '}
                  · <LabelBadge badge={s.lever.badge} />
                </span>
                {s.breaks.length > 0 ? (
                  <span className="tag--treasury tag--warn">
                    breaks {s.breaks.map((p) => p.title).join(', ')}
                  </span>
                ) : null}
                {s.strains.length > 0 ? (
                  <span className="tag--treasury tag--amber">
                    strains {s.strains.map((p) => p.title).join(', ')}
                  </span>
                ) : null}
              </div>
              <div className="suggestion__act">
                <span className="amount amount--better">{formatGbpBn(s.yieldGbpm, 1, true)}</span>
                <button type="button" className="btn" onClick={() => moves.setAll(s.option.values)}>
                  Do it
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="panel__hint">
        <StepLink to="/finetune/tax">All the ways to pay</StepLink>
      </p>
    </section>
  );
}

/**
 * Room to spare, second screen: every way to pay in the Budget, with the level it sits at and
 * what dropping it would do to the headroom. "Drop it" puts its lever back where the OBR had it.
 */
export function EaseOffTax({ ways, moves }: { ways: readonly AffordOption[]; moves: Moves }) {
  const route = compromise.routes.ease;
  return (
    <section className="route doc" aria-label="Tax rises you could ease off">
      <Spoken line={route.line} who={moves.role(route.adviser)} tone="adviser" folded />
      {ways.length === 0 ? (
        <p className="panel__hint">You chose no tax rises, so there is nothing to ease.</p>
      ) : (
        <ul className="suggestions">
          {ways.map((o) => {
            const lever = moves.byCode.get(Object.keys(o.values)[0] ?? '');
            if (!lever) return null;
            const off = optionOff(o, levers);
            return (
              <li key={o.id} className="suggestion">
                <div>
                  <strong>{o.title}</strong>{' '}
                  <span className="source">
                    in your Budget · {formatLeverValue(lever, moves.valueOf(lever))} ·{' '}
                    <LabelBadge badge={lever.badge} />
                  </span>
                </div>
                <div className="suggestion__act">
                  <span className="source">
                    dropped: {formatGbpBn(moves.effectOf({ ...moves.values, ...off }), 1, true)}
                  </span>
                  <button type="button" className="btn" onClick={() => moves.setAll(off)}>
                    Drop it
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="panel__hint">
        <StepLink to="/finetune/tax">All the ways to pay</StepLink>
      </p>
    </section>
  );
}
