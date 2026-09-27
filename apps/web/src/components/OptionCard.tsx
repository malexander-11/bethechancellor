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
import { AdviceLine } from './AdviceLine';
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

/** How a lever that was adjusted elsewhere now stands, as its level where it has one. */
function standing(lever: Lever, value: number): string {
  const level = lever.control.level;
  if (level) return formatLevel(level, levelValue(level, value));
  return formatLeverValue(lever, value);
}

/** The option, or failing that the lever, on the other side of an overlap. */
function partnerOf(o: OptionOverlap): string {
  return o.option?.shortTitle ?? o.withLever.shortTitle;
}

/** "Costs £2.2bn · leaves £4.5bn" or "Costs £2.2bn · without it £6.7bn", one text node for one figure. */
export function priceLine(price: OptionPrice): string {
  const headroom = formatGbpBn(price.headroomGbpm, 1, price.headroomGbpm < 0);
  return `${price.text} · ${price.standing === 'leaves' ? 'leaves' : 'without it'} ${headroom}`;
}

/**
 * One costed option a Chancellor can choose: a checkbox card with the title, the engine's figure
 * for choosing it now against the Budget as it stands and the headroom that would leave, the
 * badges of the costings it rests on, the manifesto promises it would break (red) or strain
 * (amber), its earliest start,
 * the options it overlaps or counts the same money as, and the line of whoever proposes it.
 * Choosing it moves the levers inside; the state is read back from the levers, so a card can also
 * show that its levers were adjusted on the desk to somewhere else (ADR-0022). While an option it
 * conflicts with is in the Budget the card is blocked and says by what; with both in from the
 * desk, both warn and neither is blocked. On the surface a card is its title, its badge and its
 * figure, plus the tags that change what choosing it means, and one adviser's line saying who
 * proposed it and what it costs and does (Phase 23); the lever's headline, the options it quietly
 * overlaps and the proposer's line wait behind one fold, "More about this".
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
  tag,
  advice,
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
  /** A plain factual line about the option, folded: the lever's own headline. */
  note?: string;
  /** A short state the player must see beside the figure: "already in your Budget". */
  tag?: string;
  /** The adviser's line on this option (Phase 23): who proposed it, one plain judgement. */
  advice?: { who: string; line: SimulatedLine };
  /** Anything to show once the option is on: the minister's reaction, for one. */
  children?: ReactNode;
}) {
  const on = state === 'on';
  const adjusted = state === 'adjusted';
  const badges = badgesOf(levers);
  const quiet = overlaps.filter((o) => !o.active);
  const active = overlaps.filter((o) => o.active);
  const more = Boolean(note || quiet.length > 0 || (line && who));
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
          <span className="choice__meta">
            <span className={`choice__figure amount amount--${price.tone}`}>
              {priceLine(price)}
              <span className="sr-only">, in {price.year}</span>
            </span>
            {tag ? <span className="tag tag--quiet">{tag}</span> : null}
            {blocked ? (
              <span className="tag--treasury">Instead of {blocked.option.title}</span>
            ) : null}
            {adjusted
              ? levers.map((lever) => (
                  <span key={lever.code} className="tag--treasury tag--warn">
                    Adjusted: {standing(lever, values[lever.code] ?? 0)}
                  </span>
                ))
              : null}
            {redLines.map((r) =>
              r.broken ? (
                <span
                  key={`${r.severity}-${r.promise}`}
                  className={`tag--treasury ${r.severity === 'strains' ? 'tag--amber' : 'tag--warn'}`}
                >
                  {r.severity === 'strains'
                    ? on
                      ? 'Strains'
                      : 'Would strain'
                    : on
                      ? 'Breaks'
                      : 'Would break'}{' '}
                  the manifesto: {r.promise}
                </span>
              ) : (
                <span key={`${r.severity}-${r.promise}`} className="tag--manifesto">
                  Manifesto: {r.severity === 'strains' ? 'contested' : RED_LINE_WORDS[r.when]}
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
          {active.map((o) => {
            const warn = o.severity === 'warn';
            return (
              <span
                key={o.withLever.code}
                className={`choice__line choice__overlap${warn ? ' choice__overlap--warn' : ''}`}
              >
                {warn ? 'Warning: ' : ''}Overlaps with {partnerOf(o)}: {o.text}
              </span>
            );
          })}
        </span>
      </label>
      {advice ? <AdviceLine who={advice.who} line={advice.line} /> : null}
      {more ? (
        <details className="more more--quiet choice__more">
          <summary>More about this</summary>
          <div className="more__body">
            {note ? <span className="choice__line">{note}</span> : null}
            {quiet.map((o) => (
              <span key={o.withLever.code} className="choice__line choice__overlap">
                Overlaps with {partnerOf(o)}
              </span>
            ))}
            {line && who ? (
              <span className="choice__delivery">
                <span className="kicker">{who}</span> <LabelBadge badge={line.badge} /> {line.text}
              </span>
            ) : null}
            {line ? (
              <SourceList refs={line.sources} className="choice__sources briefing__sources" />
            ) : null}
          </div>
        </details>
      ) : null}
      {on ? children : null}
    </div>
  );
}
