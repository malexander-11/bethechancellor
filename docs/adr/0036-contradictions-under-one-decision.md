# ADR-0036: Contradictions come under one decision

Date: 2026-09-30. Status: accepted; revised the same day (below, ADR-0037). Revises ADR-0026,
ADR-0027 and ADR-0035, each of which carries a dated revision pointing here.

## Context

Two choices on step 4 that count the same money, or set the same rate, are a pair: an `excludes`
interaction, authored once and read from both sides (ADR-0026, ADR-0027). After the tax screen went
tax by tax (ADR-0035) there were fifteen such pairs. While one of a pair was in the Budget, the
other’s card would not move. It said "You can’t have both. Untick “X” to choose this.", gave the
reason, and offered a one-tap swap. The decisions were drawn by tax, not by pair, so some choices
that contradict each other sat apart as independent ticks: “Charge 1% VAT on everything now
zero-rated” was in Make small changes, and the five exemptions it covers were in Remove an
exemption.

The user said:

> This should resolve contradictions too because they would come under one decision

Asked how a decision should make you pick between contradicting choices, the user chose “One choice,
as radios”, described as:

> Where two ticks contradict, they become one set of radios, like the VAT scale: "As planned · 1% a
> year · 2% a year". Where one choice contradicts several, or a scale (1% VAT on zero-rated goods;
> the new 50% rate), choosing it takes the others out and says so first. Bigger change.

## Decision

### Contradictions sit in one decision

- “Charge 1% VAT on everything now zero-rated” moves from Make small changes to Remove an exemption,
  beside the five exemptions it covers. A decision may now hold eight choices; Remove an exemption
  does, and Make small changes holds three.
- Undoing the 2024 rise in capital gains tax now excludes moving either rate on gains, where before
  it only warned: it sets both back, to 20% and 10%, while the rates move today’s 24% and 18%. That
  makes seventeen pairs, from fifteen.
- One pair is still split across two decisions: VAT off gas, in Make small changes, against full VAT
  on home energy, in Remove an exemption. That is where the user put them.

| Pair                                                                     | Where                              | Drawn as                         |
| ------------------------------------------------------------------------ | ---------------------------------- | -------------------------------- |
| The 1% and the 2% wealth tax                                             | Tax wealth above £10 million       | One choice                       |
| 30% pension relief for all, and relief at the basic rate                 | Change pension tax relief          | One choice                       |
| Another 2p on dividends, savings and rent, and undoing last year’s rises | Tax on dividends, savings and rent | One choice                       |
| Capital gains tax at death, and on people who leave                      | Tax gains that go untaxed          | One choice                       |
| 1% on zero-rated goods, and each of five exemptions (five pairs)         | Remove an exemption                | Takes out                        |
| A new 50% rate, and the additional rate                                  | Change the rates                   | Takes out                        |
| Full National Insurance on all earnings, and the 2% above £50,270        | Change what employees pay          | Takes out                        |
| Undoing the 2024 capital gains rise, and each rate on gains (two pairs)  | Change the rates on gains          | Takes out                        |
| VAT off gas, and full VAT on home energy                                 | Two VAT decisions                  | Takes out                        |
| Defence at 3% now, and the defence plan’s gap                            | Investment                         | Takes out, or back to a flagship |
| Two reforms of disability benefits                                       | Benefits; Last year’s decisions    | Takes out, or back to a flagship |
| Two replacements for the triple lock                                     | Benefits                           | Takes out, or back to a flagship |

The spending pairs’ levers are flagship levers, except the prices-only link, so on the spending
screen a flagship the player chose may hold one side of each.

### One choice among radios

Two or more ticks in one decision that contradict each other, and nothing else, are declared a set
in `finetune.json`: `alternatives: [{ name, codes }]` on the decision, the name the question the set
answers (“The wealth tax”). The screen draws a set as one group: its name, “As planned” first, then
each tick’s card with a radio in place of its box, every radio sharing one name. Choosing one takes
the others out, “As planned” puts them all back, and the arrow keys move through the group as they
do along a tax’s scale. Each card keeps its adviser’s line and its price: while one is chosen, the
others say what they would do “If you choose it instead”, priced as the swap. A radio has no box to
untick, so “As planned” or Undo on the chosen card puts it back. An old link that carries two of a
set checks the first, and both cards warn that the two count the same money twice.

The validator holds a set to what it claims: every member a tick, none set by a flagship, each
excluding every other member and nothing outside the set, and all of them side by side in the
decision’s order. It also names two ticks in one decision that exclude only each other but are not
declared a set. The engine lays out an open decision (`decisionUnits`), drawing each set once, where
its first tick sits.

### Anywhere else, choosing takes the others out

A choice that contradicts several others (the 1% rate), one on a scale (the additional rate against
the 50% rate), or one in another decision (gas against home energy) still moves. At rest it says
first what choosing it would take out, and why, in the first one’s words: “Choosing this takes out
“Charge VAT on food”. The 1% rate already covers food, so 20% on food too would count it twice.” A
scale says it of a level: “Choosing a level here takes out …”. Its prices count the others as gone,
“instead”, and choosing it takes them out. The engine names everything a choice would take out
(`movedPartners`).

The “You can’t have both” notice and its swap leave step 4, with one exception. Where a flagship the
player chose holds the other of a pair, the card still will not move, and it offers the way back to
that flagship (ADR-0027): step 4 never undoes a flagship. Step 3’s ways to deliver a priority keep
the notice and the swap.

Basic mode has no decisions, so there a pick that contradicts something already chosen says what it
would take out, like any card outside a set.

### Shorter reasons

Now that a pair’s reason leads a card, the readability test reads every one of them in a new set,
“what a choice takes out”. Five ran past twenty words and are shorter, saying the same thing: the 1%
rate against new homes, children’s clothes, books and fares (and food, to match), the defence plan’s
gap, and capital gains tax at death.

## Consequences

### Measured

- **Words.** The advanced tax screen at rest still reads 405 words on the walk’s game. With choices
  in six decisions it falls from 1,030 to 925: the tuned game’s wealth tax and dividends are radios
  now, and no card says “you can’t have both”. It is pinned at 1,020. Basic mode (352 and 536) and
  the spending screens are unchanged.
- **Reading grade.** The fine-tuning screens read at grade 5.2 with the sets’ names; what a choice
  takes out reads at 5.9.
- **On a phone** the tax screen on arrival is still 2,764px tall, its decisions closed.
- **walk39** is clean at 1300px and 360px, in light and with reduced motion, with the audits on. It
  checks the wealth tax’s three radios in one group, the arrow keys round them and back to “As
  planned”, “As planned” at least 44px tall, the set’s name inside its rule, the 1% rate taking food
  out and food saying it would take the 1% rate out, and the additional rate saying it would take
  out the 50% rate.

### Risks

- Taking out is quieter than blocking: choosing one thing can remove another. The card says so
  before anything is touched, and its price already counts the other as gone.
- Where a choice takes out several, the first one’s reason stands for all of them, as when undoing
  the 2024 rise takes out both rates on gains; the line names every one.
- Radios are native, in one group by name, so the arrow keys and a screen reader treat a set as one
  question whatever sits between its radios on the page. Tab reaches the checked radio, or “As
  planned”, and then the next card’s controls.

## Revision (2026-09-30): sets and taking out, as rows (ADR-0037)

A set is drawn as before, “As planned” first, but each member is a row rather than a card, priced as
the swap (“would raise £3.5bn instead”). A row that would take out others in its own card names them
by their short names (“Choosing this takes out “Food”.”) and leaves the reason to the card’s fold,
where each lever lists what it counts the same money as; a row that would take out a choice in
another decision names it plainly and gives the reason, as before. The spending screen’s three pairs
now each sit in one decision, as taking out rather than radios, since a flagship sets one lever of
each.
