import {
  formatLevel,
  levelValue,
  type FinetuneItem,
  type Lever,
  type OptionReport,
} from '@btc/engine';
import { leverNotes, type redLinesOf } from '../journey/levers';
import type { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';
import { LeverControl, formatLeverValueShort } from './LeverControl';
import { MinisterLine } from './MinisterLine';
import { priceLine } from './OptionCard';

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
 * says what the adviser's usual move would do against the Budget as it stands, and the headroom
 * that would leave; once moved, the control's own effect line takes over. The red and amber
 * manifesto tags, the flagship it belongs to, the warnings that apply now and, on a spending
 * lever that has moved, its minister's line, are all on the card; the lever's own headline and
 * caveats wait under "More about this".
 */
export function CuratedLever({
  item,
  lever,
  who,
  summaryYear,
  priceOf,
  redLinesFor,
  chosen,
  moved,
}: {
  item: FinetuneItem;
  lever: Lever;
  /** The role whose line this is: the screen's adviser. */
  who: string;
  summaryYear: string;
  priceOf: ReturnType<typeof useOptionPrices>;
  redLinesFor: ReturnType<typeof redLinesOf>;
  chosen?: OptionReport;
  moved: ReadonlySet<string>;
}) {
  const { state, dispatch, outcome } = useBudget();
  const value = state.leverValues[lever.code] ?? lever.control.default;
  const resting = value === lever.control.default;
  const price = resting ? priceOf({ values: { [lever.code]: item.move } }) : null;
  const hint = price
    ? {
        text: `${moveWords(lever, item.move)}: ${lowerFirst(priceLine(price))}`,
        tone: price.tone,
      }
    : undefined;
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
      notes={leverNotes(lever, moved)}
      compact
    >
      {!resting && lever.category !== 'tax' ? <MinisterLine lever={lever} value={value} /> : null}
    </LeverControl>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
