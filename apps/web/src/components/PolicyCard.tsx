import {
  excludedBy,
  formatGbpBn,
  leadPolicy,
  policyWay,
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
import { LeverControl, sizeWords } from './LeverControl';
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
}) {
  const { state, dispatch, outcome } = useBudget();
  const rest = lever.control.default;
  const value = state.leverValues[lever.code] ?? rest;
  const resting = value === rest;
  const mine = !resting && Math.sign(value - rest) === policyWay(policy, lever);
  const smallest = policy.sizes[0] ?? rest;
  const excluder = excludedBy(lever, levers, state.leverValues);
  // A partner a flagship holds is changed on the flagship's screen, never swapped out from here.
  const holder = excluder ? held.get(excluder.lever.code) : undefined;
  // A blocked card is priced as the swap it offers, never as both at once; one whose partner a
  // flagship holds offers no swap, so it prices nothing.
  const priced =
    resting && !holder
      ? hintOf(
          { [lever.code]: smallest },
          excluder ? { [excluder.lever.code]: excluder.lever.control.default } : undefined,
        )
      : null;
  const effect = priced ? lowerFirst(priced.text) : '';
  const opening = excluder
    ? 'If you swap them'
    : lever.control.kind === 'toggle'
      ? 'If you switch it on'
      : policy.sizes.length === 1
        ? 'If you choose it'
        : (sizeLabels(policy.sizes.length)[0] ?? 'Small');
  // In the conditional and in plain ink (Phase 25): what the smallest size would do, and the
  // headroom it would leave, red only below nought.
  const hint = priced
    ? {
        text: `${opening}: ${wouldWords(lever.reliefCost ? reliefWords(effect) : effect)}`,
        headroom: formatGbpBn(priced.headroomGbpm, 1, priced.headroomGbpm < 0),
        negative: priced.headroomGbpm < 0,
      }
    : undefined;
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
  // Set the other way: the policy that is chosen, and where it has the lever.
  const other = !resting && !mine ? leadPolicy(item, lever, value) : undefined;
  const sizes = {
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
      displayTitle={policy.title}
      {...(hint ? { hint } : {})}
      advice={{ line: policy.advice }}
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
