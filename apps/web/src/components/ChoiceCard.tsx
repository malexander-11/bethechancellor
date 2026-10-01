import {
  movedPartners,
  policyWay,
  scaleLevels,
  type FinetuneItem,
  type FinetunePolicy,
  type Lever,
  type OptionReport,
} from '@btc/engine';
import { useId, type ReactNode } from 'react';
import { finetuneName, levers } from '../data';
import { leverNotes, type redLinesOf } from '../journey/levers';
import type { useLeverHints } from '../journey/prices';
import { useBudget } from '../state/budget';
import { sizeWords } from './LeverControl';
import {
  HeldRow,
  INVESTMENT_NOTE,
  LeverAbout,
  LeverRow,
  RELIEF_NOTE,
  wouldPhrase,
  type Held,
} from './LeverRow';
import { MinisterLine } from './MinisterLine';

const byCode = new Map(levers.map((l) => [l.code, l] as const));

/** What a lever is called where its own card is not in view: its plain name, else its short title. */
const nameOf = (l: Lever) => finetuneName(l.code) ?? l.shortTitle;

/** One row of a card: a lever, the ways it offers, and what the row is called. */
export interface CardRow {
  item: FinetuneItem;
  /** Every way the lever moves. */
  ways: readonly FinetunePolicy[];
  /** Its short name in its decision (ADR-0037). */
  name: string;
}

/** What a card draws, in order: a row, or ticks that contradict each other as one set (ADR-0036). */
export type CardUnit =
  { kind: 'row'; row: CardRow } | { kind: 'set'; name: string; rows: readonly CardRow[] };

/** What every row on a screen reads alike: the year, the prices, the promises and the flagships. */
export interface CardContext {
  summaryYear: string;
  hintOf: ReturnType<typeof useLeverHints>;
  redLinesFor: ReturnType<typeof redLinesOf>;
  chosen: ReadonlyMap<string, OptionReport>;
  /** The levers the Budget has moved: what a row's warnings are read against. */
  moved: ReadonlySet<string>;
  /** The levers a flagship the player chose holds, read when the screen opened. */
  held: ReadonlyMap<string, Held>;
  /** The screen's adviser, named on the line a chosen row gives. */
  adviser: string;
}

/**
 * A decision's one card (ADR-0037): "Remove an exemption", and a row for each exemption. What
 * every row shares is said once, at the top: that a relief's cost is the most ending it could
 * raise, and which rule investment counts against. Ticks that contradict each other are one set of
 * radios, "As planned" first (ADR-0036); a lever a flagship holds is a row naming the flagship.
 * Everything else about the levers waits under one fold, "More about these".
 */
export function ChoiceCard({
  title,
  units,
  context,
}: {
  /** The card's question, for the fold's name read aloud. */
  title: string;
  units: readonly CardUnit[];
  context: CardContext;
}) {
  const { state } = useBudget();
  const rows = units.flatMap((u) => (u.kind === 'row' ? [u.row] : u.rows));
  const live = rows.flatMap((r) => {
    const lever = byCode.get(r.item.code);
    return lever && !context.held.has(lever.code) ? [lever] : [];
  });
  const relief = live.some((l) => l.reliefCost === true);
  const investment = live.some((l) => l.classification?.currentOrCapital === 'capital');
  // A set that is the whole card is the card's own question: its name is heard, not shown again.
  const [only] = units;
  const wholeSet = units.length === 1 && only?.kind === 'set';
  // Every row in the card by its name here, so a row can name the others it would take out.
  const siblings = new Map(rows.map((r) => [r.item.code, r.name] as const));
  return (
    <div className="tune__card">
      {relief ? <p className="tune__card-note">{RELIEF_NOTE}</p> : null}
      {investment ? <p className="tune__card-note">{INVESTMENT_NOTE}</p> : null}
      {units.map((unit) => {
        if (unit.kind === 'row') {
          return (
            <RowOf key={unit.row.item.code} row={unit.row} context={context} siblings={siblings} />
          );
        }
        const codes = unit.rows.map((r) => r.item.code);
        const members = codes.flatMap((code) => byCode.get(code) ?? []);
        return (
          <Choice
            key={`set:${codes.join('+')}`}
            name={unit.name}
            members={members}
            whole={wholeSet}
          >
            {(radio) =>
              unit.rows.map((row) => (
                <RowOf
                  key={row.item.code}
                  row={row}
                  context={context}
                  siblings={siblings}
                  set={{ name: radio, codes }}
                />
              ))
            }
          </Choice>
        );
      })}
      <details className="more more--quiet tune__more">
        <summary>
          {rows.length === 1 ? 'More about this' : 'More about these'}
          <span className="sr-only">: {title}</span>
        </summary>
        <div className="more__body">
          {rows.flatMap((row) => {
            const lever = byCode.get(row.item.code);
            if (!lever) return [];
            return [
              <LeverAbout
                key={lever.code}
                lever={lever}
                name={row.name}
                value={state.leverValues[lever.code] ?? lever.control.default}
                summaryYear={context.summaryYear}
              />,
            ];
          })}
        </div>
      </details>
    </div>
  );
}

/**
 * One row, read from the Budget as it stands (ADR-0037). A lever that moves both ways is one
 * scale, its adviser speaking for the way it has moved (ADR-0035). At rest it prices the nearest
 * level each way, or a tick's one setting, against the Budget as it stands; while levers that
 * count the same money are in the Budget, it says first that choosing it takes them out, and
 * prices it with them gone (ADR-0036); where a flagship the player chose holds one, it will not
 * move, and offers the way back to the flagship instead. Given its `set`, its box is a radio in the
 * set's group, and choosing it takes the others out as a radio does, without a word.
 */
function RowOf({
  row,
  context,
  siblings,
  set,
}: {
  row: CardRow;
  context: CardContext;
  /** Every row in the card, by code: what the row calls another it would take out. */
  siblings: ReadonlyMap<string, string>;
  /** The ticks this one contradicts in its decision, with it: the group's name and every code. */
  set?: { name: string; codes: readonly string[] };
}) {
  const { state, dispatch, outcome } = useBudget();
  const { item, ways, name } = row;
  const lever = byCode.get(item.code);
  if (!lever) return null;
  const { summaryYear, hintOf, redLinesFor, chosen, moved, held, adviser } = context;
  const rest = lever.control.default;
  const value = state.leverValues[lever.code] ?? rest;
  const hold = held.get(lever.code);
  if (hold) {
    return (
      <HeldRow
        name={name}
        held={hold}
        words={
          lever.control.kind !== 'toggle' && value !== rest ? sizeWords(lever, value) : undefined
        }
      />
    );
  }
  const resting = value === rest;
  const scale = lever.control.kind !== 'toggle';
  // The way the lever has moved leads, and its adviser speaks; at rest, the usual way.
  const lead =
    (scale ? ways.find((way) => policyWay(way, lever) === Math.sign(value - rest)) : undefined) ??
    ways[0];
  const mine = !resting && lead !== undefined && Math.sign(value - rest) === policyWay(lead, lever);
  const levels = scale ? scaleLevels(lever, ways) : [lead?.sizes[0] ?? 1];
  // What counts the same money and is in the Budget now (ADR-0036). A partner a flagship holds is
  // changed on the flagship's screen, never taken out from here, so the row will not move; any
  // other, choosing this takes out, and its price counts it as gone.
  const partners = movedPartners(lever, levers, state.leverValues);
  const heldPartner = partners.find((p) => held.has(p.lever.code));
  const holder = heldPartner ? held.get(heldPartner.lever.code) : undefined;
  const out = holder ? [] : partners;
  const swapOut =
    out.length > 0
      ? Object.fromEntries(out.map((p) => [p.lever.code, p.lever.control.default]))
      : undefined;
  const would = (at: number) =>
    wouldPhrase(hintOf({ [lever.code]: at }, swapOut).text, lever.reliefCost === true);
  // At rest, and unless a flagship holds a partner: a scale prices the nearest level each way; a
  // tick, its one setting. "Instead" where it would take something out.
  const prices: string[] = [];
  if (resting && !holder) {
    if (scale) {
      for (const way of ways) {
        const nearest = way.sizes[0];
        if (nearest !== undefined) prices.push(`${sizeWords(lever, nearest)} ${would(nearest)}`);
      }
      if (swapOut && prices[0]) prices[0] = `Instead: ${prices[0]}`;
    } else {
      prices.push(`${would(levels[0] ?? 1)}${swapOut ? ' instead' : ''}`);
    }
  }
  const blocked =
    heldPartner && holder
      ? { other: nameOf(heldPartner.lever), reason: heldPartner.text, flagship: holder }
      : undefined;
  // Said before anything is touched, in the first one's words; a set's radios say it themselves.
  // What it would take out from this card is in view beside it, so the row names it by its name
  // here and leaves the reason to its card's fold; from elsewhere, why, in its plain name.
  const [first] = out;
  const inCard = out.every((p) => siblings.has(p.lever.code));
  const takesOut =
    !set && first
      ? {
          names: out.map((p) => siblings.get(p.lever.code) ?? nameOf(p.lever)),
          reason: inCard ? '' : first.text,
        }
      : undefined;
  const isOn = (code: string) => {
    const l = byCode.get(code);
    return l !== undefined && (state.leverValues[code] ?? l.control.default) !== l.control.default;
  };
  const radio = set
    ? {
        name: set.name,
        // One radio at a time: an old link that carries two checks the first.
        checked: set.codes.find(isOn) === lever.code,
        onChoose: () =>
          dispatch({
            type: 'setLevers',
            values: {
              ...Object.fromEntries(
                set.codes
                  .filter((code) => code !== lever.code)
                  .map((code) => [code, byCode.get(code)?.control.default ?? 0]),
              ),
              [lever.code]: levels[0] ?? 1,
            },
          }),
      }
    : undefined;
  // What choosing takes out is said once, above; a pair both in from an old link still warns. An
  // overlap that only makes a sum approximate is said once the row has moved too; a warning, at once.
  const notes = leverNotes(lever, moved).filter(
    (n) => !partners.some((p) => p.lever.code === n.key) && (n.warn || !resting),
  );
  const option = chosen.get(lever.code);
  return (
    <LeverRow
      lever={lever}
      value={value}
      effect={outcome.leverEffects.find((e) => e.code === lever.code)}
      summaryYear={summaryYear}
      name={name}
      // Choosing takes out whatever counts the same money (ADR-0036); putting it back, nothing.
      onChange={(next) =>
        dispatch(
          swapOut && next !== rest
            ? { type: 'setLevers', values: { ...swapOut, [lever.code]: next } }
            : { type: 'setLever', code: lever.code, value: next },
        )
      }
      levels={levels}
      redLines={redLinesFor(lever.code)}
      chosen={option ? { title: option.option.title, state: option.state } : undefined}
      prices={prices}
      advice={mine && lead?.advice ? { who: adviser, line: lead.advice } : undefined}
      notes={notes}
      blocked={blocked}
      takesOut={takesOut}
      radio={radio}
    >
      {mine && lever.category !== 'tax' ? <MinisterLine lever={lever} value={value} /> : null}
    </LeverRow>
  );
}

/**
 * Ticks that contradict each other in one decision, drawn as one choice (ADR-0036): the set's name,
 * "As planned" first, then each tick's row with a radio in place of its box, all one group, so
 * choosing one takes the others out and the arrow keys move between them, like a tax's scale.
 * "As planned" puts every one of them back. A set that is its card's whole question keeps its name
 * for a screen reader alone.
 */
function Choice({
  name,
  members,
  whole,
  children,
}: {
  name: string;
  members: readonly Lever[];
  whole: boolean;
  children: (radio: string) => ReactNode;
}) {
  const { state, dispatch } = useBudget();
  const radio = useId();
  const planned = members.every(
    (l) => (state.leverValues[l.code] ?? l.control.default) === l.control.default,
  );
  return (
    <fieldset className={`tune__choice${whole ? ' tune__choice--whole' : ''}`}>
      <legend className={whole ? 'sr-only' : 'tune__choice-name'}>{name}</legend>
      <label className="tune__choice-planned">
        <input
          type="radio"
          name={radio}
          checked={planned}
          onChange={() =>
            dispatch({
              type: 'setLevers',
              values: Object.fromEntries(members.map((l) => [l.code, l.control.default])),
            })
          }
        />
        As planned
      </label>
      {children(radio)}
    </fieldset>
  );
}
