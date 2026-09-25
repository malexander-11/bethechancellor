import {
  formatLevel,
  levelValue,
  type Badge,
  type Lever,
  type OptionOverlap,
  type OptionRedLine,
  type OptionState,
  type SimulatedLine,
} from '@btc/engine';
import type { ReactNode } from 'react';
import type { OptionPrice } from '../journey/prices';
import { LabelBadge } from './LabelBadge';
import { formatLeverValue } from './LeverControl';
import { SourceList } from './SourceLink';
import { Term } from './Term';

const RED_LINE_WORDS: Record<OptionRedLine['when'], string> = {
  above: 'no rise',
  below: 'no cut',
  on: 'do not switch on',
};

/** What a card says about the option's levers: the badges of the costings behind it, once each. */
export function badgesOf(levers: readonly Lever[]): Badge[] {
  return [...new Set(levers.map((l) => l.badge))];
}

/** How a lever that was adjusted on the desk now stands, as its level where it has one. */
function standing(lever: Lever, value: number): string {
  const level = lever.control.level;
  if (level) return formatLevel(level, levelValue(level, value));
  return formatLeverValue(lever, value);
}

/**
 * One costed option a Chancellor can choose: a checkbox card with the title, the engine's figure
 * for the option on its own, the badges of the costings it rests on, the manifesto red lines it
 * would cross, its earliest start, the levers it overlaps with, and the line of whoever proposes
 * it. Choosing it moves the levers inside; the state is read back from the levers, so a card can
 * also show that its levers were adjusted on the desk to somewhere else (ADR-0022).
 */
export function OptionCard({
  id,
  name,
  title,
  state,
  price,
  levers,
  values,
  onChange,
  disabled = false,
  redLines = [],
  earliestStart,
  overlaps = [],
  line,
  who,
  note,
  children,
}: {
  id: string;
  /** The checkbox group this card belongs to: one per screen. */
  name: string;
  title: string;
  state: OptionState;
  price: OptionPrice;
  /** The levers the option moves, with the values it sets them to. */
  levers: readonly Lever[];
  values: Record<string, number>;
  /** Choose (true) or put back (false). */
  onChange: (on: boolean) => void;
  disabled?: boolean;
  redLines?: readonly OptionRedLine[];
  earliestStart?: string;
  overlaps?: readonly OptionOverlap[];
  /** The proposer's line, simulated and sourced; a way to afford has none and shows the lever's headline. */
  line?: SimulatedLine;
  who?: string;
  /** A plain factual line under the title when there is no speaker: the lever's own headline. */
  note?: string;
  /** Anything to show once the option is on: the minister's reaction, for one. */
  children?: ReactNode;
}) {
  const on = state === 'on';
  const adjusted = state === 'adjusted';
  const badges = badgesOf(levers);
  return (
    <div
      className={`choice choice--option${on ? ' choice--picked' : ''}${adjusted ? ' choice--adjusted' : ''}`}
      data-option={id}
    >
      <label>
        <input
          type="checkbox"
          name={name}
          value={id}
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="choice__body">
          <span className="choice__title">
            {title}{' '}
            {badges.map((b) => (
              <LabelBadge key={b} badge={b} />
            ))}
          </span>
          {note ? <span className="choice__line">{note}</span> : null}
          <span className="choice__meta">
            <span className={`choice__figure amount amount--${price.tone}`}>
              {price.text}
              <span className="sr-only">, for this option on its own</span>
            </span>
            {adjusted
              ? levers.map((lever) => (
                  <span key={lever.code} className="tag--treasury tag--warn">
                    Adjusted on the desk: {standing(lever, values[lever.code] ?? 0)}
                  </span>
                ))
              : null}
            {redLines.map((r) =>
              r.broken ? (
                <span key={r.promise} className="tag--treasury tag--warn">
                  {on ? 'Breaks' : 'Would break'} the manifesto: {r.promise}
                </span>
              ) : (
                <span key={r.promise} className="tag--manifesto">
                  Manifesto: {RED_LINE_WORDS[r.when]}
                  <span className="sr-only"> ({r.promise})</span>
                </span>
              ),
            )}
            {earliestStart ? (
              <span className="tag tag--quiet">
                <span>
                  <Term id="earliest-start">Earliest start</Term> April {earliestStart.slice(0, 4)}
                </span>
              </span>
            ) : null}
          </span>
          {overlaps.map((o) => (
            <span
              key={o.withLever.code}
              className={`choice__line choice__overlap${o.severity === 'warn' ? ' choice__overlap--warn' : ''}`}
            >
              {o.severity === 'warn' ? 'Warning: ' : ''}with {o.withLever.shortTitle}, already
              moved: {o.text}
            </span>
          ))}
          {line && who ? (
            <span className="choice__delivery">
              <span className="kicker">{who}</span> <LabelBadge badge={line.badge} />{' '}
              {line.short ?? line.text}
            </span>
          ) : null}
        </span>
      </label>
      {line?.short ? (
        <details className="spoken__more">
          <summary>More</summary>
          <p>{line.text}</p>
        </details>
      ) : null}
      {line ? (
        <SourceList refs={line.sources} className="choice__sources briefing__sources" />
      ) : null}
      {on ? children : null}
    </div>
  );
}
