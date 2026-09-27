import {
  delayOptions,
  effectiveStartYear,
  formatGbpBn,
  narrowedBundle,
  optionOff,
  type DeliverSuggestion,
  type Lever,
  type OptionReport,
  type SpendingMeasure,
} from '@btc/engine';
import { Spoken } from '../../components/Conversation';
import { LabelBadge } from '../../components/LabelBadge';
import { MinisterLine } from '../../components/MinisterLine';
import { compromise, levers } from '../../data';
import { StepLink } from '../../journey/links';
import type { OptionPrice } from '../../journey/prices';
import { IMPLEMENTATION_YEAR } from '../../state/budget';
import type { Moves } from './shared';

/**
 * Room to spare, first screen: the ways to deliver the ranked priorities not yet chosen, one per
 * priority first, each priced against the Budget as it stands with the headroom it would leave.
 */
export function DoMore({
  more,
  priceOf,
  moves,
}: {
  more: readonly DeliverSuggestion[];
  priceOf: (bundle: { values: Record<string, number> }) => OptionPrice;
  moves: Moves;
}) {
  const route = compromise.routes.more;
  return (
    <section className="route doc" aria-label="Ways to do more for your priorities">
      <Spoken line={route.line} who={moves.role(route.adviser)} tone="adviser" folded />
      {more.length === 0 ? (
        <p className="panel__hint">
          Every way to deliver your priorities is already in your Budget.
        </p>
      ) : (
        <ul className="suggestions">
          {more.map((s) => {
            const price = priceOf({ values: s.option.values });
            const badges = [
              ...new Set(
                Object.keys(s.option.values)
                  .map((code) => moves.byCode.get(code)?.badge)
                  .filter((b): b is Lever['badge'] => b !== undefined),
              ),
            ];
            return (
              <li key={s.option.id} className="suggestion">
                <div>
                  <strong>{s.option.title}</strong>{' '}
                  <span className="source">
                    for {s.priority.noun}
                    {badges.map((b) => (
                      <span key={b}>
                        {' '}
                        · <LabelBadge badge={b} />
                      </span>
                    ))}
                  </span>
                </div>
                <div className="suggestion__act">
                  <span className={`amount amount--${price.tone}`}>{price.text}</span>
                  <span className="source">leaves {formatGbpBn(price.headroomGbpm, 1)}</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => moves.setAll(s.option.values)}
                  >
                    Do it
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="panel__hint">
        <StepLink to="/budget/deliver">All the ways to deliver</StepLink>
      </p>
    </section>
  );
}

/**
 * The sums, second screen: what was chosen to deliver and costs money in the target year, biggest
 * first, each with a later start, half the distance (one slider only) or dropped; then anything
 * else in the Budget that costs money, moved on the desk rather than chosen; then who feels what
 * has been cut back since the forecast, in the ministers' words.
 */
export function SpendLessOrLater({
  chosen,
  spending,
  felt,
  policyYears,
  targetYear,
  moves,
}: {
  chosen: readonly OptionReport[];
  spending: readonly SpendingMeasure[];
  felt: readonly Lever[];
  policyYears: readonly string[];
  targetYear: string;
  moves: Moves;
}) {
  const route = compromise.routes.spending;
  const { delays } = moves;
  return (
    <>
      <section className="route doc" aria-label="Ways to spend less, or later">
        <Spoken line={route.line} who={moves.role(route.adviser)} tone="adviser" folded />
        {chosen.length === 0 && spending.length === 0 ? (
          <p className="panel__hint">Nothing in your Budget costs money in {targetYear}.</p>
        ) : (
          <ul className="suggestions">
            {chosen.map((o) => {
              const codes = Object.keys(o.option.values);
              const optionLevers = codes
                .map((code) => moves.byCode.get(code))
                .filter((l): l is Lever => l !== undefined);
              const narrowed = o.state === 'on' ? narrowedBundle(o.option, levers) : null;
              const started = codes.map((code) => delays[code]).find((y) => y !== undefined);
              return (
                <li key={o.option.id} className="suggestion">
                  <div>
                    <strong>{o.option.title}</strong>{' '}
                    <span className="source">
                      {o.state === 'adjusted' ? 'adjusted on the desk · ' : ''}costs{' '}
                      {formatGbpBn(o.costGbpm, 1)}
                      {started ? ` · starts ${started}` : ''}
                    </span>
                  </div>
                  <div className="suggestion__act">
                    {optionLevers.map((lever) => (
                      <DelayControl
                        key={lever.code}
                        lever={lever}
                        delays={delays}
                        policyYears={policyYears}
                        onChange={(year) => moves.setDelay(lever.code, year)}
                        savingFor={(next) =>
                          moves.effectOf(moves.values, { ...delays, [lever.code]: next })
                        }
                      />
                    ))}
                    {narrowed ? (
                      <>
                        <span className="source">
                          narrowed:{' '}
                          {formatGbpBn(moves.effectOf({ ...moves.values, ...narrowed }), 1, true)}
                        </span>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => moves.setAll(narrowed)}
                        >
                          Narrow it
                        </button>
                      </>
                    ) : null}
                    <span className="source">
                      dropped:{' '}
                      {formatGbpBn(
                        moves.effectOf({ ...moves.values, ...optionOff(o.option, levers) }),
                        1,
                        true,
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => moves.setAll(optionOff(o.option, levers))}
                    >
                      Drop it
                    </button>
                  </div>
                </li>
              );
            })}
            {spending.map((m) => (
              <li key={m.lever.code} className="suggestion">
                <div>
                  <strong>{m.lever.title}</strong>{' '}
                  <span className="source">
                    moved on the desk · costs {formatGbpBn(m.costGbpm, 1)}
                    {delays[m.lever.code] ? ` · starts ${delays[m.lever.code]}` : ''}
                  </span>
                </div>
                <div className="suggestion__act">
                  <DelayControl
                    lever={m.lever}
                    delays={delays}
                    policyYears={policyYears}
                    onChange={(year) => moves.setDelay(m.lever.code, year)}
                    savingFor={(next) =>
                      moves.effectOf(moves.values, { ...delays, [m.lever.code]: next })
                    }
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => moves.set(m.lever.code, m.lever.control.default)}
                  >
                    Drop it
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="panel__hint">
          <StepLink to="/budget/deliver">All the ways to deliver</StepLink>
        </p>
      </section>
      {felt.length > 0 ? (
        <section className="panel" aria-labelledby="felt-heading">
          <h2 id="felt-heading" className="section-label">
            Who feels it
          </h2>
          {felt.map((lever) => (
            <MinisterLine key={lever.code} lever={lever} value={moves.valueOf(lever)} />
          ))}
        </section>
      ) : null}
    </>
  );
}

/**
 * A later start for one lever: the floor is the lever's own earliest start (ADR-0021), a delay
 * can only push past it, and the figure beside it is what one more year would save.
 */
function DelayControl({
  lever,
  delays,
  policyYears,
  onChange,
  savingFor,
}: {
  lever: Lever;
  delays: Record<string, string>;
  policyYears: readonly string[];
  onChange: (year: string) => void;
  savingFor: (nextYear: string) => number;
}) {
  const floor = effectiveStartYear(lever, { implementationYear: IMPLEMENTATION_YEAR });
  const start = effectiveStartYear(lever, {
    implementationYear: IMPLEMENTATION_YEAR,
    implementationYearByCode: delays,
  });
  const years = delayOptions(policyYears, floor);
  const next = delayOptions(policyYears, start)[0];
  return (
    <>
      <label className="suggestion__delay">
        <span className="sr-only">Start year for {lever.title}</span>
        <select value={delays[lever.code] ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Starts {floor}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Delay to {y}
            </option>
          ))}
        </select>
      </label>
      {next ? (
        <span className="source">a year later: {formatGbpBn(savingFor(next), 1, true)}</span>
      ) : null}
    </>
  );
}
