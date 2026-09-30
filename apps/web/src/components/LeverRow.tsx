import {
  excludesPartners,
  formatGbpBn,
  policyYearsOf,
  type Lever,
  type LeverEffect,
  type SimulatedLine,
} from '@btc/engine';
import { useId, useState, type ReactNode } from 'react';
import { finetuneName, levers, vintage } from '../data';
import {
  UNCHANGED_BELOW_GBPM,
  borrowingImprovement,
  currentBudgetImprovement,
  effectWords,
  growthWords,
  laterStartYear,
  reliefWords,
  wouldWords,
} from '../journey/effects';
import { settledLine } from '../journey/levers';
import { StepLink } from '../journey/links';
import { useWorkings } from '../journey/workings';
import { AdviceLine } from './AdviceLine';
import { BlockedNotice } from './BlockedNotice';
import {
  LeverFlags,
  formatLeverValue,
  isShareOfSpending,
  levelChange,
  sizeWords,
  takesOutWords,
  type Blocked,
  type Chosen,
  type LeverNote,
  type Radio,
  type RedLine,
  type TakesOut,
} from './LeverControl';
import { Milestones } from './Milestones';
import { ProvenanceDrawer } from './ProvenanceDrawer';
import { Term } from './Term';

const POLICY_YEARS = policyYearsOf(vintage);

/** A flagship the player chose holds a lever at its own value: its title and its screen. */
export interface Held {
  title: string;
  to: string;
}

/**
 * Said once on a card that prices a relief (ADR-0037): HMRC's cost of a tax break is the most
 * ending it could raise, which each of its rows says as "at most".
 */
export const RELIEF_NOTE =
  '“At most”: HMRC’s cost of the tax break. The real sum would be less, as people change what they do.';

/** Said once on a card that holds investment (ADR-0037): which rule it counts against. */
export const INVESTMENT_NOTE = 'Investment counts against the debt rule, not the day-to-day rule.';

/**
 * What a move would do, in a row's words (ADR-0037): the lever's own figure in the conditional,
 * "would raise £4.2bn", "would raise at most £32.5bn" for a relief's cost, investment as what it
 * would add to borrowing. No headroom: the bar keeps that score.
 */
export function wouldPhrase(text: string, relief: boolean): string {
  const borrowing = /^Borrowing (up|down) (£[\d.,]+bn)/.exec(text);
  if (borrowing) {
    return borrowing[1] === 'up'
      ? `would add ${borrowing[2]} to borrowing`
      : `would take ${borrowing[2]} off borrowing`;
  }
  if (/^Borrowing unchanged/.test(text)) return 'would leave borrowing as it is';
  const plain = text.charAt(0).toLowerCase() + text.slice(1);
  return wouldWords(relief ? reliefWords(plain) : plain);
}

/**
 * What a moved lever does, in its row's words (ADR-0037): the verb, then the year, as the player
 * asked ("raises at most £32.5bn in 2029-30"). A budget is money against its plan, its growth
 * after rising prices first; investment is borrowing; a measure that does nothing yet names the
 * year it starts (ADR-0021).
 */
export function effectPhrase(
  lever: Lever,
  value: number,
  effect: LeverEffect | undefined,
  year: string,
): string {
  if (!effect) return '';
  if (isShareOfSpending(lever)) {
    const spent = (effect.currentSpending[year] ?? 0) + (effect.capitalSpending[year] ?? 0);
    const money =
      Math.abs(spent) < UNCHANGED_BELOW_GBPM
        ? `barely different from the plan in ${year}`
        : `${formatGbpBn(Math.abs(spent), 1)} ${spent < 0 ? 'less' : 'more'} than planned in ${year}`;
    const real = levelChange(lever, value, year)?.real;
    return real ? `${growthWords(real.fromPct, real.toPct, true)} · ${money}` : capitalise(money);
  }
  const capital = lever.classification?.currentOrCapital === 'capital';
  const receipts = lever.classification?.side === 'receipts';
  const improve = (y: string) =>
    capital ? borrowingImprovement(effect, y) : currentBudgetImprovement(effect, y);
  const words = (gbpm: number) => {
    if (Math.abs(gbpm) < UNCHANGED_BELOW_GBPM) return 'changes nothing';
    const size = formatGbpBn(Math.abs(gbpm), 1);
    if (capital) return gbpm > 0 ? `takes ${size} off borrowing` : `adds ${size} to borrowing`;
    const plain = effectWords(gbpm, false, receipts);
    return lever.reliefCost ? reliefWords(plain) : plain;
  };
  const later = laterStartYear(effect, year, capital, POLICY_YEARS);
  if (later) return `nothing in ${year}; from ${later} ${words(improve(later))}`;
  return `${words(improve(year))} in ${year}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A scale's planned radio (ADR-0035): the level, and beneath it that it is the plan. */
function PlannedLevel({ lever }: { lever: Lever }) {
  const { level, labels } = lever.control;
  if (!level && !labels) return <span className="lever__size-name">As planned</span>;
  return (
    <>
      <span className="lever__size-name">{sizeWords(lever, lever.control.default)}</span>{' '}
      <span className="lever__size-level">as planned</span>
    </>
  );
}

/**
 * One choice in a decision's card (ADR-0037): a row, not a card of its own. A tick, or a radio in
 * a set of ticks that contradict each other (ADR-0036), with its short name; or a scale of levels
 * with the plan among them (ADR-0035). At rest it says in one line what choosing would do, with
 * no headroom, since the bar keeps that score; once chosen, what it does, its adviser's line and
 * Undo. What changes what choosing means rides in its head: the promises that watch it, the
 * flagship it belongs to, and "Not on the table"; what it would take out, or why a flagship holds
 * it still, is said before it is touched. Everything else about the lever waits under its card's
 * one fold (LeverAbout).
 */
export function LeverRow({
  lever,
  value,
  effect,
  summaryYear,
  name,
  onChange,
  levels,
  redLines = [],
  chosen,
  prices = [],
  advice,
  notes = [],
  blocked,
  takesOut,
  radio,
  children,
}: {
  lever: Lever;
  value: number;
  /** What the lever does in the Budget as it stands, once it has moved. */
  effect?: LeverEffect | undefined;
  summaryYear: string;
  /** Its short name in its decision (ADR-0037), or a policy's title in basic mode. */
  name: string;
  onChange: (value: number) => void;
  /** A scale's levels, low to high, the plan among them; or a tick's one setting. */
  levels: readonly number[];
  redLines?: readonly RedLine[];
  chosen?: Chosen | undefined;
  /** At rest, what choosing would do: one phrase for a tick, one a way for a scale. */
  prices?: readonly string[];
  /** The adviser's line for the way the lever has moved, said once it has. */
  advice?: SimulatedLine | undefined;
  /** Warnings that apply now: a lever this one interacts with has moved. */
  notes?: readonly LeverNote[];
  /** A flagship the player chose holds a lever that counts the same money (Phase 26). */
  blocked?: Blocked | undefined;
  /** Choosing this would take out levers in the Budget that count the same money (ADR-0036). */
  takesOut?: TakesOut | undefined;
  /** One of a set of ticks that contradict each other: a radio in place of the box. */
  radio?: Radio | undefined;
  /** Beneath the row once it has moved: the minister, on a budget. */
  children?: ReactNode;
}) {
  const id = useId();
  const rest = lever.control.default;
  const isDefault = value === rest;
  const tick = levels.length === 1;
  // Moved to a setting none of its levels is: an old link, or a flagship's value left behind.
  const offGrid = !isDefault && !levels.some((v) => Math.abs(v - value) < 1e-9);
  // A row a flagship holds the other of a pair on stays in the tab order but does not move.
  const change = (next: number) => {
    if (!blocked) onChange(next);
  };
  // At rest a budget still says how it grows after rising prices, which no radio names; then what
  // choosing would do, on a line of its own. Once moved, what it does.
  const growth =
    isDefault && isShareOfSpending(lever) ? levelChange(lever, rest, summaryYear)?.real : undefined;
  const pricing = isDefault ? prices.join(' · ') : '';
  const resting =
    growth || pricing ? (
      <span className="tune__row-price" id={`${id}-price`}>
        {growth ? (
          <span className="tune__row-line">{growthWords(growth.toPct, growth.toPct, false)}</span>
        ) : null}
        {pricing ? <span className="tune__row-line">{pricing}</span> : null}
      </span>
    ) : null;
  const effectText = isDefault ? '' : effectPhrase(lever, value, effect, summaryYear);
  // Past the range its source's figure covers, a straight-line figure is our arithmetic, and the
  // row says so (Phase 25).
  const range = lever.control.sourceRange;
  const beyond = range !== undefined && (value < range.min || value > range.max);
  const describedBy = [
    blocked ? `${id}-blocked` : null,
    takesOut ? `${id}-takesout` : null,
    resting ? `${id}-price` : null,
    effectText ? `${id}-effect` : null,
  ]
    .filter(Boolean)
    .join(' ');
  // A flagship ask trimmed short of what was chosen is settled lower, in the Chief Secretary's
  // words (Phase 25).
  const settled = chosen?.state === 'adjusted' ? settledLine(lever) : null;
  const flags = (
    <span className="tune__row-flags">
      <LeverFlags redLines={[...redLines]} chosen={chosen} />
      {lever.notOnTheTable ? <span className="tag tag--quiet">Not on the table</span> : null}
    </span>
  );

  return (
    <div
      className={`tune__row${tick ? ' tune__row--tick' : ''}${isDefault ? '' : ' tune__row--on'}${blocked ? ' tune__row--blocked' : ''}`}
    >
      {tick ? (
        <div className="tune__row-head">
          {/* The box, its name and what it would do are one target; the name alone names it. */}
          <label className="tune__row-choice" htmlFor={id}>
            {radio ? (
              // One of a set (ADR-0036): choosing it takes the others out; "As planned", the set's
              // first radio, puts them all back.
              <input
                id={id}
                type="radio"
                name={radio.name}
                checked={radio.checked}
                aria-labelledby={`${id}-name`}
                aria-describedby={describedBy || undefined}
                onChange={radio.onChoose}
              />
            ) : (
              <input
                id={id}
                type="checkbox"
                checked={!isDefault}
                aria-labelledby={`${id}-name`}
                aria-describedby={describedBy || undefined}
                aria-disabled={blocked ? true : undefined}
                onChange={(e) => change(e.target.checked ? (levels[0] ?? rest) : rest)}
              />
            )}
            <span className="tune__row-text">
              <span className="tune__row-name" id={`${id}-name`}>
                {name}
              </span>
              {resting}
            </span>
          </label>
          {flags}
        </div>
      ) : (
        <>
          <div className="tune__row-head">
            <span className="tune__row-name" id={`${id}-name`}>
              {name}
            </span>
            {flags}
          </div>
          {/* Native radios, so the arrow keys move along the scale; each named by the level it
              sets, the planned one saying so (ADR-0035). */}
          <div
            className="lever__sizes lever__sizes--scale"
            role="radiogroup"
            aria-labelledby={`${id}-name`}
            aria-describedby={describedBy || undefined}
          >
            {levels.map((v) => {
              const on = Math.abs(v - value) < 1e-9;
              return (
                <label key={v} className={`lever__size${on ? ' lever__size--on' : ''}`}>
                  <input
                    type="radio"
                    name={`${id}-level`}
                    value={v}
                    checked={on}
                    aria-disabled={blocked ? true : undefined}
                    onChange={() => change(v)}
                  />
                  <span className="lever__size-text">
                    {Math.abs(v - rest) < 1e-9 ? (
                      <PlannedLevel lever={lever} />
                    ) : (
                      <span className="lever__size-name">{sizeWords(lever, v)}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
      <div className="tune__row-body">
        {blocked ? (
          <BlockedNotice
            id={`${id}-blocked`}
            other={blocked.other}
            reason={blocked.reason}
            flagship={blocked.flagship}
          />
        ) : null}
        {takesOut ? (
          // Said before anything is touched (ADR-0036): the control still moves, and its price
          // already counts the others as gone.
          <p className="lever__takes-out" id={`${id}-takesout`}>
            <strong>{takesOutWords(takesOut.names, tick ? 'tick' : 'scale')}</strong>
            {takesOut.reason ? ` ${takesOut.reason}` : null}
          </p>
        ) : null}
        {offGrid ? <p className="lever__now">Now {sizeWords(lever, value)}</p> : null}
        {tick ? null : resting}
        {effectText ? (
          <p className="tune__row-effect" id={`${id}-effect`}>
            {effectText}
            {beyond ? <span className="tune__row-note"> {range.text}</span> : null}
          </p>
        ) : null}
        {!isDefault && advice ? <AdviceLine line={advice} /> : null}
        {settled ? <AdviceLine who={settled.who} line={settled.line} /> : null}
        {notes.length > 0 ? (
          <ul className="lever__notes">
            {notes.map((n) => (
              <li
                key={n.key}
                className={`choice__overlap${n.warn ? ' choice__overlap--warn' : ''}`}
              >
                {n.warn ? 'Warning: ' : ''}
                {n.text}
              </li>
            ))}
          </ul>
        ) : null}
        {isDefault ? null : children}
        {isDefault ? null : (
          <button type="button" className="linklike tune__row-undo" onClick={() => change(rest)}>
            Undo<span className="sr-only"> for {name}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A lever a flagship the player chose holds at its own value (Phase 26): its row names the
 * flagship, with the way back to change it. Step 4 never undoes a flagship.
 */
export function HeldRow({
  name,
  held,
  words,
}: {
  name: string;
  held: Held;
  /** Where the flagship has the lever, for a lever with a level ("10% more"); none for a toggle. */
  words?: string | undefined;
}) {
  return (
    <div className="tune__row tune__row--held">
      <div className="tune__row-head">
        <span className="tune__row-name">{name}</span>
        <span className="tune__row-flags">
          <span className="tag--treasury">In your flagship policies</span>
        </span>
      </div>
      <p className="lever__held">
        {held.title}
        {words ? `: ${words}` : ''}.{' '}
        <StepLink to={held.to}>
          Change<span className="sr-only"> {held.title}</span>
        </StepLink>
      </p>
    </div>
  );
}

/**
 * Everything else about one lever, under its card's one fold (ADR-0037): its own headline, a
 * budget's cash, the milestones it is measured against, where it stands, what it counts the same
 * money as and why (a row names what it would take out, and leaves the why here when the other is
 * beside it), and what its number rests on; with the workings on, where the number comes from.
 */
export function LeverAbout({
  lever,
  name,
  value,
  effect,
  summaryYear,
  headingLevel,
}: {
  lever: Lever;
  name: string;
  value: number;
  effect?: LeverEffect | undefined;
  summaryYear: string;
  /** A level below its card's own heading: 4 under a decision, 3 under a section in basic mode. */
  headingLevel: 3 | 4;
}) {
  const workings = useWorkings();
  const [open, setOpen] = useState(false);
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  const isDefault = value === lever.control.default;
  const change = lever.control.kind === 'toggle' ? null : levelChange(lever, value, summaryYear);
  const cash = change?.real
    ? `Cash: ${isDefault ? change.to : `${change.from} → ${change.to}`} ${change.note ?? ''}; growth measured from ${change.real.span}.`
    : '';
  const { notOnTheTable, commitment, earliestStart: earliest } = lever;
  const assumes = [
    ...(notOnTheTable ? [notOnTheTable.note] : []),
    ...(commitment ? [commitment.text] : []),
    ...(earliest ? [earliest.text] : []),
    ...('caveats' in lever.costing ? lever.costing.caveats : []),
  ];
  const lookupPoints =
    lever.costing.kind === 'lookupTable'
      ? lever.costing.points
          .map((p) => p.input)
          .filter((p) => p !== 0)
          .map((p) => formatLeverValue(lever, p))
      : null;
  const barnett = lever.classification?.barnettConsequential === true;
  const pairs = excludesPartners(lever, levers).filter((p) => !p.lever.deprecated);
  const tags =
    earliest || commitment || lookupPoints || barnett ? (
      <p className="lever__tags">
        {earliest ? (
          <span className="tag tag--quiet">
            {/* One flex item, so the space before the month survives the inline-flex tag. */}
            <span>
              <Term id="earliest-start">Earliest start</Term> April {earliest.year.slice(0, 4)}
            </span>
            <span className="sr-only">: {earliest.text}</span>
          </span>
        ) : null}
        {commitment ? (
          <span className="tag">
            <Term id={commitment.kind}>
              {commitment.kind === 'protected' ? 'Protected' : 'Unprotected'}
            </Term>
            <span className="sr-only">: {commitment.text}</span>
          </span>
        ) : null}
        {lookupPoints ? (
          <span className="tag">
            <Term id="hmrc-points">HMRC points only</Term>
            <span className="sr-only">
              : the game&rsquo;s figures sit at {lookupPoints.join(', ')}, each worked from a
              published figure; between them it draws a straight line.
            </span>
          </span>
        ) : null}
        {barnett ? (
          <span className="tag">
            <Term id="barnett">Barnett applies</Term>
            <span className="sr-only">
              : a change here also moves the Scottish, Welsh and Northern Irish block grants,
              described in the sources and not counted in the number.
            </span>
          </span>
        ) : null}
      </p>
    ) : null;
  return (
    <div className="tune__about">
      <Heading className="tune__about-name">{name}</Heading>
      <p className="lever__desc">{lever.headline ?? lever.description}</p>
      {/* The cash budget and the years its growth is measured over (Phase 25). */}
      {cash ? <p className="lever__cash-note">{cash}</p> : null}
      {lever.milestones?.length ? <Milestones milestones={lever.milestones} /> : null}
      {tags}
      {pairs.length > 0 ? (
        <>
          <p className="lever__assumes-title">Counts the same money as</p>
          <ul className="lever__assumes-list">
            {pairs.map((p) => (
              <li key={p.lever.code}>
                {finetuneName(p.lever.code) ?? p.lever.shortTitle}: {p.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {assumes.length > 0 ? (
        <>
          <p className="lever__assumes-title">What this assumes</p>
          <ul className="lever__assumes-list">
            {assumes.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      ) : null}
      {workings ? (
        <button
          type="button"
          className="linklike"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'Hide detail' : 'Detail and sources'}
          <span className="sr-only"> for {lever.shortTitle}</span>
        </button>
      ) : null}
      {open && workings ? <ProvenanceDrawer lever={lever} effect={effect} /> : null}
    </div>
  );
}
