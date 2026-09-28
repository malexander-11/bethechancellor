import {
  excludedBy,
  formatGbpBn,
  formatLevel,
  levelValue,
  type FinetuneItem,
  type Lever,
  type OptionReport,
} from '@btc/engine';
import { levers, finetuneTitle } from '../data';
import { reliefWords } from '../journey/effects';
import { leverNotes, type redLinesOf } from '../journey/levers';
import type { useLeverHints } from '../journey/prices';
import { useBudget } from '../state/budget';
import { LeverControl, formatLeverValueShort } from './LeverControl';
import { MinisterLine } from './MinisterLine';

/** Where the adviser's usual move takes a lever, in the words a hint opens with. */
export function moveWords(lever: Lever, move: number): string {
  if (lever.control.kind === 'toggle') return 'Switched on';
  const level = lever.control.level;
  const at = level
    ? formatLevel(level, levelValue(level, move))
    : formatLeverValueShort(lever, move);
  return `At ${at}`;
}

/**
 * One lever on the fine-tuning screens (Phase 24, ADR-0025): the desk's own control under a plain
 * title, the adviser's line on it, and the numbers in view before anything moves. At rest it
 * says what the adviser's usual move would do against the Budget as it stands, in the lever's own
 * figure, and what the headroom would then be (Phase 25: the headroom moves by the interest too,
 * which the screen says once); once moved, the control's own effect line takes over. The red and amber
 * manifesto tags, the flagship it belongs to, the warnings that apply now and, on a spending
 * lever that has moved, its minister's line, are all on the card; the lever's own headline and
 * caveats wait under "More about this". A relief cost reads "raises at most" (Phase 25). While a
 * lever that counts the same money is in the Budget, the card will not move and offers a swap.
 */
export function CuratedLever({
  item,
  lever,
  who,
  summaryYear,
  hintOf,
  redLinesFor,
  chosen,
  moved,
}: {
  item: FinetuneItem;
  lever: Lever;
  /** The role whose line this is: the screen's adviser. */
  who: string;
  summaryYear: string;
  hintOf: ReturnType<typeof useLeverHints>;
  redLinesFor: ReturnType<typeof redLinesOf>;
  chosen?: OptionReport;
  moved: ReadonlySet<string>;
}) {
  const { state, dispatch, outcome } = useBudget();
  const value = state.leverValues[lever.code] ?? lever.control.default;
  const resting = value === lever.control.default;
  const excluder = excludedBy(lever, levers, state.leverValues);
  // A blocked card is priced as the swap it offers, never as both at once.
  const priced = resting
    ? hintOf(
        { [lever.code]: item.move },
        excluder ? { [excluder.lever.code]: excluder.lever.control.default } : undefined,
      )
    : null;
  const effect = priced ? lowerFirst(priced.text) : '';
  const line = priced
    ? `${lever.reliefCost ? reliefWords(effect) : effect} · headroom would be ${formatGbpBn(priced.headroomGbpm, 1, priced.headroomGbpm < 0)}`
    : '';
  const hint = priced
    ? {
        text: `${excluder ? 'Swap them' : moveWords(lever, item.move)}: ${line}`,
        tone: priced.tone,
      }
    : undefined;
  const blocked = excluder
    ? {
        other: finetuneTitle(excluder.lever.code) ?? excluder.lever.shortTitle,
        untick: excluder.lever.control.kind === 'toggle',
        reason: excluder.text,
        onSwap: () =>
          dispatch({
            type: 'setLevers',
            values: {
              [excluder.lever.code]: excluder.lever.control.default,
              [lever.code]: item.move,
            },
          }),
      }
    : undefined;
  const notes = leverNotes(lever, moved).filter((n) => n.key !== excluder?.lever.code);
  return (
    <LeverControl
      lever={lever}
      value={value}
      effect={outcome.leverEffects.find((e) => e.code === lever.code)}
      summaryYear={summaryYear}
      onChange={(next) => dispatch({ type: 'setLever', code: lever.code, value: next })}
      redLines={redLinesFor(lever.code)}
      chosen={chosen ? { title: chosen.option.title, state: chosen.state } : undefined}
      displayTitle={item.title}
      {...(hint ? { hint } : {})}
      advice={{ who, line: item.advice }}
      notes={notes}
      {...(blocked ? { blocked } : {})}
      compact
    >
      {!resting && lever.category !== 'tax' ? <MinisterLine lever={lever} value={value} /> : null}
    </LeverControl>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
