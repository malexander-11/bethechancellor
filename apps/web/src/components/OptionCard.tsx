import {
  formatGbpBn,
  formatLevel,
  levelValue,
  type Badge,
  type Lever,
  type OptionConflict,
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

/** "Costs £2.2bn · leaves £4.5bn" or "Costs £2.2bn · without it £6.7bn", one text node for one figure. */
export function priceLine(price: OptionPrice): string {
  const headroom = formatGbpBn(price.headroomGbpm, 1, price.headroomGbpm < 0);
  return `${price.text} · ${price.standing === 'leaves' ? 'leaves' : 'without it'} ${headroom}`;
}

/**
 * One costed option a Chancellor can choose: a checkbox card with the title, the engine's figure
 * for choosing it now against the Budget as it stands and the headroom that would leave, the
 * badges of the costings it rests on, the manifesto red lines it would cross, its earliest start,
 * the options it overlaps or counts the same money as, and the line of whoever proposes it.
 * Choosing it moves the levers inside; the state is read back from the levers, so a card can also
 * show that its levers were adjusted on the desk to somewhere else (ADR-0022). While an option it
 * conflicts with is in the Budget the card is blocked and says by what; with both in from the
 * desk, both warn and neither is blocked.
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
  blocked,
  clashes = [],
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
  /** The option in the Budget that counts the same money, while this one is not on. */
  blocked?: OptionConflict;
  /** Options in the Budget that count the same money as this one, which is in the Budget too. */
  clashes?: readonly OptionConflict[];
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
  const classes = [
    'choice',
    'choice--option',
    on ? 'choice--picked' : '',
    adjusted ? 'choice--adjusted' : '',
    blocked ? 'choice--blocked' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} data-option={id}>
      <label>
        <input
          type="checkbox"
          name={name}
          value={id}
          checked={on}
          disabled={disabled || blocked !== undefined}
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
              {priceLine(price)}
              <span className="sr-only">, in {price.year}</span>
            </span>
            {blocked ? (
              <span className="tag--treasury">Instead of {blocked.option.title}</span>
            ) : null}
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
          {blocked ? <span className="choice__line choice__overlap">{blocked.text}</span> : null}
          {clashes.map((c) => (
            <span key={c.option.id} className="choice__line choice__overlap choice__overlap--warn">
              Warning: both this and {c.option.title} are in your Budget: {c.text}
            </span>
          ))}
          {overlaps.map((o) => {
            const partner = o.option?.shortTitle ?? o.withLever.shortTitle;
            const warn = o.active && o.severity === 'warn';
            return (
              <span
                key={o.withLever.code}
                className={`choice__line choice__overlap${warn ? ' choice__overlap--warn' : ''}`}
              >
                {o.active
                  ? `${warn ? 'Warning: ' : ''}Overlaps with ${partner}: ${o.text}`
                  : `Overlaps with ${partner}`}
              </span>
            );
          })}
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
