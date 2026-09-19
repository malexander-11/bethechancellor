import { computeOutcome, formatGbpBn, type Lever, type ScenarioKind } from '@btc/engine';
import { useId, useMemo } from 'react';
import { levers, rules, vintage } from '../data';
import type { ScenarioCard, ScenarioSetting } from '../journey/scenarios';
import { useWorkings } from '../journey/workings';
import { IMPLEMENTATION_YEAR, type BudgetState } from '../state/budget';
import { LabelBadge } from './LabelBadge';
import { formatLeverValue } from './LeverControl';
import { SourceList } from './SourceLink';

/**
 * The assumptions step, as four cards rather than three sliders.
 *
 * Every card is one stated rule over published rows, and each shows the headroom it would leave
 * you with. That last part is the uncomfortable lesson the step exists to teach: a Chancellor can
 * buy headroom by picking the rosier forecast, and here you can watch it happen.
 */

function leverOf(code: string): Lever | undefined {
  return levers.find((l) => l.code === code);
}

/** What a card does to the stability rule's headroom, on top of whatever else is in the budget. */
function headroomOf(state: BudgetState, values: Record<string, number>): number {
  const outcome = computeOutcome({
    vintage,
    rules,
    levers,
    settings: {
      leverValues: { ...state.leverValues, ...values },
      implementationYear: IMPLEMENTATION_YEAR,
      debtInterestFeedback: state.debtInterestFeedback,
      assessAsOf: state.assessAsOf,
    },
  });
  return outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
}

function Setting({ setting }: { setting: ScenarioSetting }) {
  const lever = leverOf(setting.leverCode);
  if (!lever) return null;
  const onPath = setting.value === lever.control.default;
  return (
    <span className="scenario__chip">
      {lever.shortTitle ?? lever.title}{' '}
      <strong>{onPath ? 'OBR path' : formatLeverValue(lever, setting.value)}</strong>
    </span>
  );
}

function Workings({ card }: { card: ScenarioCard }) {
  return (
    <details className="scenario__why">
      <summary>Where these figures come from</summary>
      {card.rationale.map((line, i) => (
        <p key={i}>
          {line.text}
          <SourceList as="span" className="briefing__sources" refs={line.sources} />
        </p>
      ))}
      <dl className="scenario__workings">
        {card.settings.map((s) => {
          const lever = leverOf(s.leverCode);
          if (!lever) return null;
          return (
            <div key={s.leverCode}>
              <dt>{lever.shortTitle ?? lever.title}</dt>
              <dd>
                {s.workings}
                {s.note ? <em className="scenario__note"> {s.note}</em> : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}

export function Scenarios({
  cards,
  state,
  selected,
  summaryYear,
  onPick,
}: {
  cards: readonly ScenarioCard[];
  state: BudgetState;
  /** The card the current sliders match, or null for figures the player set by hand. */
  selected: ScenarioKind | null;
  summaryYear: string;
  onPick: (values: Record<string, number>) => void;
}) {
  const name = useId();
  const workings = useWorkings();
  const headrooms = useMemo(
    () => cards.map((card) => headroomOf(state, card.values)),
    // Only the budget behind the cards matters here, not the cards themselves, which are static.
    [cards, state],
  );
  return (
    <div className="scenarios" role="radiogroup" aria-label="Economic assumptions">
      {cards.map((card, i) => (
        <article
          key={card.kind}
          className={`scenario${card.kind === selected ? ' scenario--picked' : ''}`}
        >
          <label className="scenario__choose">
            <input
              type="radio"
              name={name}
              value={card.kind}
              checked={card.kind === selected}
              onChange={() => onPick(card.values)}
            />
            <span className="scenario__body">
              <span className="scenario__title">{card.title}</span>
              <span className="scenario__headline">{card.headline}</span>
              <span className="scenario__settings">
                {card.settings.map((s) => (
                  <Setting key={s.leverCode} setting={s} />
                ))}
              </span>
              <span className="scenario__headroom">
                <small>Headroom in {summaryYear}</small>
                <strong>{formatGbpBn(headrooms[i] ?? 0, 1, true)}</strong>
              </span>
            </span>
          </label>
          {workings ? <Workings card={card} /> : null}
        </article>
      ))}
      {selected === null ? (
        <article className="scenario scenario--picked scenario--own">
          <p className="scenario__title">Your own figures</p>
          <p className="scenario__headline">
            These sliders match none of the four. <LabelBadge badge="assumption" /> Your settings
            stand until you pick a card above.
          </p>
          <span className="scenario__headroom">
            <small>Headroom in {summaryYear}</small>
            <strong>{formatGbpBn(headroomOf(state, {}), 1, true)}</strong>
          </span>
        </article>
      ) : null}
    </div>
  );
}
