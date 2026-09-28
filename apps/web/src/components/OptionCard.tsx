import {
  formatGbpBn,
  formatLevel,
  levelValue,
  type Badge,
  type Lever,
  type OptionConflict,
  type OptionOverlap,
  type OptionScale,
  type OptionRedLine,
  type OptionState,
  type SimulatedLine,
} from '@btc/engine';
import { useId, type ReactNode } from 'react';
import type { OptionPrice } from '../journey/prices';
import { AdviceLine } from './AdviceLine';
import { BlockedNotice } from './BlockedNotice';
import { LabelBadge } from './LabelBadge';
import { formatLeverValue, promiseWords, restingWords } from './LeverControl';
import { SourceList } from './SourceLink';
import { Term } from './Term';

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

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * "Costs £0.8bn · leaves £6.0bn", or "Costs £0.8bn · in your Budget" once chosen: the one price
 * (Phase 25), the change to the headroom with interest in it, so the two figures add up. A move
 * made only of investment is priced on the debt rule, which it touches, and says so.
 */
export function priceLine(price: OptionPrice): string {
  const headroom = formatGbpBn(price.headroomGbpm, 1, price.headroomGbpm < 0);
  const tail = price.standing === 'inBudget' ? 'in your Budget' : `leaves ${headroom}`;
  return price.rule === 'stockFalling'
    ? `On the debt rule: ${lowerFirst(price.text)} · ${tail}`
    : `${price.text} · ${tail}`;
}

/** One part of a price's split: a cost, or what it saves. */
function part(label: string, gbpm: number): string | null {
  if (Math.abs(gbpm) < 50) return null;
  const size = formatGbpBn(Math.abs(gbpm), 1);
  return gbpm > 0 ? `${label} ${size}` : `${label} saves ${size}`;
}

/** The price's workings for the fold: what it is, split, and the dearest earlier year. */
export function priceWorkings(price: OptionPrice): string {
  const parts = [
    part('day-to-day', price.split.currentGbpm),
    part('investment', price.split.capitalGbpm),
    part('interest', price.split.interestGbpm),
  ].filter((p): p is string => p !== null);
  const rule = price.rule === 'stockFalling' ? 'the debt rule' : 'your headroom';
  const lines = [
    `The change to ${rule} in ${price.year}, interest included${parts.length > 0 ? `: ${parts.join(', ')}` : ''}.`,
  ];
  if (price.earlier) {
    lines.push(
      `It costs most in ${price.earlier.year}: ${formatGbpBn(price.earlier.costGbpm, 1)}, before interest.`,
    );
  }
  return lines.join(' ');
}

/**
 * One costed option a Chancellor can choose: a checkbox card with the title, the engine's figure
 * for choosing it now against the Budget as it stands and the headroom that would leave, the
 * badges of the costings it rests on, the manifesto promises it would break (red) or strain
 * (amber), its earliest start,
 * the options it overlaps or counts the same money as, and the line of whoever proposes it.
 * Choosing it moves the levers inside; the state is read back from the levers, so a card can also
 * show that its levers were adjusted on the desk to somewhere else (ADR-0022). While an option it
 * conflicts with is in the Budget the card is blocked: it says, in one plain sentence at full
 * contrast, what to untick and why, and offers a one-tap swap (Phase 25); its checkbox stays in
 * the tab order and will not tick. With both in from the desk, both warn and neither is blocked. On the surface a card is its title, its badge and its
 * figure, plus the tags that change what choosing it means, and one adviser's line saying who
 * proposed it and what it costs and does (Phase 23); the lever's headline, the options it quietly
 * overlaps and the proposer's line wait behind one fold, "More about this". A way that only makes
 * a start on its priority says so in a quiet tag, with the reason in the fold (Phase 25): ticking
 * it starts the priority, it does not deliver it.
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
  onSwap,
  clashes = [],
  line,
  who,
  note,
  tag,
  advice,
  scale,
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
  /** Take the blocking option out and put this one in, in one tap. */
  onSwap?: () => void;
  /** Options in the Budget that count the same money as this one, which is in the Budget too. */
  clashes?: readonly OptionConflict[];
  /** The proposer's line, simulated and sourced, folded under "More about this". */
  line?: SimulatedLine;
  who?: string;
  /** A plain factual line about the option, folded: the lever's own headline. */
  note?: string;
  /** A short state the player must see beside the figure: "already in your Budget". */
  tag?: string;
  /** The adviser's line on this option (Phase 23): who proposed it, one plain judgement. */
  advice?: { who: string; line: SimulatedLine };
  /** Whether the option delivers its priority in full or makes a start, and why (Phase 25). */
  scale?: OptionScale;
  /** Anything to show once the option is on: the minister's reaction, for one. */
  children?: ReactNode;
}) {
  const on = state === 'on';
  const adjusted = state === 'adjusted';
  const against = state === 'against';
  const blockedId = `${useId()}-blocked`;
  const badges = badgesOf(levers);
  const quiet = overlaps.filter((o) => !o.active);
  const active = overlaps.filter((o) => o.active);
  const start = scale?.kind === 'start' ? scale : undefined;
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
          disabled={disabled}
          aria-disabled={blocked ? true : undefined}
          aria-describedby={blocked ? blockedId : undefined}
          onChange={(e) => {
            if (!blocked) onChange(e.target.checked);
          }}
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
              {blocked ? `Swap them: ${lowerFirst(priceLine(price))}` : priceLine(price)}
              <span className="sr-only">, in {price.year}</span>
            </span>
            {tag ? <span className="tag tag--quiet">{tag}</span> : null}
            {start ? <span className="tag tag--quiet">Makes a start</span> : null}
            {adjusted || against
              ? levers
                  .filter((lever) => (values[lever.code] ?? 0) !== lever.control.default)
                  .map((lever) => (
                    <span
                      key={lever.code}
                      className={`tag--treasury ${adjusted ? 'tag--amber' : 'tag--warn'}`}
                    >
                      {adjusted ? 'Settled lower' : 'Moved the other way'}:{' '}
                      {standing(lever, values[lever.code] ?? 0)}
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
                  {promiseWords(r).noun}: {r.promise}
                </span>
              ) : (
                <span key={`${r.severity}-${r.promise}`} className="tag--manifesto">
                  {promiseWords(r).label}: {restingWords(r)}
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
          {clashes.map((c) => (
            <span key={c.option.id} className="choice__line choice__overlap choice__overlap--warn">
              Warning: both this and {c.option.title} are in your Budget: {c.text}
            </span>
          ))}
          {active.map((o) => {
            const warn = o.severity !== 'info';
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
      {blocked ? (
        <BlockedNotice
          id={blockedId}
          other={blocked.option.title}
          untick
          reason={blocked.text}
          {...(onSwap ? { onSwap } : {})}
        />
      ) : null}
      {advice ? <AdviceLine who={advice.who} line={advice.line} /> : null}
      <details className="more more--quiet choice__more">
        <summary>More about this</summary>
        <div className="more__body">
          <span className="choice__line choice__workings">
            <LabelBadge badge="mechanical" /> {priceWorkings(price)}
          </span>
          {start ? (
            <span className="choice__line">
              Makes a start, not delivery: {lowerFirst(start.why)}{' '}
              <LabelBadge badge={start.badge} />
              <SourceList as="span" refs={start.sources} className="choice__sources" />
            </span>
          ) : null}
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
      {on ? children : null}
    </div>
  );
}
