import {
  excludedBy,
  formatGbpBn,
  itemName,
  leadPolicy,
  policyWay,
  scaleLevels,
  sizeLabels,
  type FinetuneItem,
  type FinetunePolicy,
  type Lever,
  type OptionReport,
} from '@btc/engine';
import { useId } from 'react';
import { finetuneName, levers } from '../data';
import { reliefWords, wouldWords } from '../journey/effects';
import { leverNotes, type redLinesOf } from '../journey/levers';
import { StepLink } from '../journey/links';
import type { useLeverHints } from '../journey/prices';
import { useBudget } from '../state/budget';
import { LeverControl, sizeWords, type Hint } from './LeverControl';
import { MinisterLine } from './MinisterLine';

/** A flagship the player chose holds this lever at its own value: its title and its screen. */
export interface Held {
  title: string;
  to: string;
}

/**
 * One policy on the fine-tuning screens (Phase 26, ADR-0027): "Put up VAT", in the sizes it comes
 * in, with the adviser's line on it and the numbers in view before anything is chosen. At rest it
 * prices its smallest size against the Budget as it stands, in the lever's own figure, and names
 * the headroom that would leave (the screen says once that headroom moves by the interest too);
 * once chosen, the lever's effect line takes over, with Undo. While the lever's other policy is
 * chosen, this card says choosing it would replace that one, and prices nothing. The red and amber
 * manifesto tags, the flagship it belongs to, the warnings that apply now and, on a spending
 * policy that is chosen, its minister's line, are all on the card; the lever's own headline and
 * caveats wait under "More about this". A relief cost reads "raises at most" (Phase 25). While a
 * lever that counts the same money is in the Budget, the card will not move and offers a swap, or,
 * where a flagship the player chose holds that lever, a way back to the flagship instead.
 *
 * Given its `ways`, a tax is one scale (ADR-0035): every level its ways come in, in order, with
 * where it is planned to be among them ("15% · 18% · 19% · 20% as planned · 21% · 22% · 25%"),
 * under the lever's plain name when it moves both ways. At rest it prices the nearest level each
 * way, one line each; the adviser speaks for the way it has moved, or the usual way at rest.
 */
export function PolicyCard({
  item,
  policy,
  lever,
  summaryYear,
  hintOf,
  redLinesFor,
  chosen,
  moved,
  held,
  headingLevel,
  ways,
}: {
  item: FinetuneItem;
  policy: FinetunePolicy;
  lever: Lever;
  summaryYear: string;
  hintOf: ReturnType<typeof useLeverHints>;
  redLinesFor: ReturnType<typeof redLinesOf>;
  chosen?: OptionReport;
  moved: ReadonlySet<string>;
  held: ReadonlyMap<string, Held>;
  headingLevel?: 3 | 4;
  /** A tax's ways, drawn as one scale (ADR-0035): both in advanced mode, the one on show in basic. */
  ways?: readonly FinetunePolicy[];
}) {
  const { state, dispatch, outcome } = useBudget();
  const rest = lever.control.default;
  const value = state.leverValues[lever.code] ?? rest;
  const resting = value === rest;
  const scale = ways !== undefined && ways.length > 0 && lever.control.kind !== 'toggle';
  // The way the lever has moved leads a scale: its adviser speaks, and a swap sets its nearest
  // level. At rest, the usual way.
  const lead = scale
    ? (ways.find((way) => policyWay(way, lever) === Math.sign(value - rest)) ?? ways[0] ?? policy)
    : policy;
  const mine = !resting && Math.sign(value - rest) === policyWay(lead, lever);
  const smallest = lead.sizes[0] ?? rest;
  const excluder = excludedBy(lever, levers, state.leverValues);
  // A partner a flagship holds is changed on the flagship's screen, never swapped out from here.
  const holder = excluder ? held.get(excluder.lever.code) : undefined;
  // In the conditional and in plain ink (Phase 25): what a size would do, and the headroom it
  // would leave, red only below nought. A blocked card is priced as the swap it offers, never as
  // both at once.
  const would = (opening: string, at: number): Hint => {
    const priced = hintOf(
      { [lever.code]: at },
      excluder ? { [excluder.lever.code]: excluder.lever.control.default } : undefined,
    );
    const effect = lowerFirst(priced.text);
    return {
      text: `${opening}: ${wouldWords(lever.reliefCost ? reliefWords(effect) : effect)}`,
      headroom: formatGbpBn(priced.headroomGbpm, 1, priced.headroomGbpm < 0),
      negative: priced.headroomGbpm < 0,
    };
  };
  // At rest, and with no swap that only a flagship's screen could make: a scale prices the nearest
  // level each way; any other card, its smallest size, or the swap it offers.
  const hints: Hint[] = [];
  if (resting && !holder) {
    if (excluder) hints.push(would('If you swap them', smallest));
    else if (scale) {
      for (const way of ways) {
        const nearest = way.sizes[0] ?? rest;
        hints.push(would(sizeWords(lever, nearest), nearest));
      }
    } else {
      const opening =
        lever.control.kind === 'toggle'
          ? 'If you switch it on'
          : policy.sizes.length === 1
            ? 'If you choose it'
            : (sizeLabels(policy.sizes.length)[0] ?? 'Small');
      hints.push(would(opening, smallest));
    }
  }
  const blocked = excluder
    ? {
        other: finetuneName(excluder.lever.code) ?? excluder.lever.shortTitle,
        untick: excluder.lever.control.kind === 'toggle',
        reason: excluder.text,
        ...(holder
          ? { flagship: holder }
          : {
              onSwap: () =>
                dispatch({
                  type: 'setLevers',
                  values: {
                    [excluder.lever.code]: excluder.lever.control.default,
                    [lever.code]: smallest,
                  },
                }),
            }),
      }
    : undefined;
  // Set the other way: the policy that is chosen, and where it has the lever. A scale holds both
  // ways, so nothing on it is ever replaced.
  const other = !scale && !resting && !mine ? leadPolicy(item, lever, value) : undefined;
  const sizes = scale
    ? { values: scaleLevels(lever, ways), labels: [], scale: true }
    : {
        values: policy.sizes,
        labels: sizeLabels(policy.sizes.length),
        ...(other ? { replaces: `${other.title} (${sizeWords(lever, value)})` } : {}),
      };
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
      displayTitle={scale && ways.length > 1 ? itemName(item) : lead.title}
      hints={hints}
      advice={{ line: lead.advice }}
      notes={notes}
      {...(blocked ? { blocked } : {})}
      sizes={sizes}
      {...(headingLevel ? { headingLevel } : {})}
    >
      {mine && lever.category !== 'tax' ? <MinisterLine lever={lever} value={value} /> : null}
    </LeverControl>
  );
}

/**
 * A lever a flagship the player chose holds at its own value (Phase 26): one line where its cards
 * would be, naming the flagship, with the way back to change it. Step 4 never undoes a flagship.
 */
export function HeldLever({
  name,
  held,
  words,
  headingLevel = 3,
}: {
  name: string;
  held: Held;
  /** Where the flagship has the lever, for a lever with a level ("10% more"); none for a toggle. */
  words?: string;
  headingLevel?: 3 | 4;
}) {
  const id = useId();
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  return (
    <div className="lever lever--curated lever--held" role="group" aria-labelledby={id}>
      <div className="lever__head">
        <Heading className="lever__title" id={id}>
          {name}
        </Heading>
        <span className="lever__flags">
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

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
