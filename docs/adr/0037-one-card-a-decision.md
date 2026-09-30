# ADR-0037: One card a decision

Date: 2026-09-30. Status: accepted. Revises ADR-0025, ADR-0026, ADR-0027, ADR-0028, ADR-0035 and
ADR-0036, each of which carries a dated revision pointing here.

## Context

Once contradictions came under one decision (ADR-0036), an open decision on the tax screen still
drew a card for each choice in it: a title, the adviser’s line, what it would do and the headroom
that would leave, its tags and a fold of its own. Remove an exemption was eight such cards, 441
words at rest on a phone. The spending screen still went by group, the first three cards of each on
show and the rest a fold away under family subheads, and each budget was two policies, one each way,
in Small, Medium and Large sizes.

The user said:

> Not quite it. You know how the change rates is one card with decisions within it. I want that for
> everything.
>
> So a card would be "remove vat exemptions" then chrckboxes for all the things that could apply to
> within.
>
> Understood?

Asked what each option inside a card should show, the user chose “A row each, advice once ticked”,
described as:

> Each option is one row: a checkbox, a short name and what it would raise. A tax you can set higher
> or lower (the basic rate) is a row of levels, as now. A ticked row adds its adviser's line and
> Undo. Shared warnings are said once, and each option's details go in one "More about these" fold.
> Roughly a fifth of today's length.

Asked whether the spending screen should change in the same round, the user chose “Both screens now”
over doing the tax screen first, described as:

> Spending gets decisions too, for example "Day-to-day budgets" as one card with a row for each
> department, each a scale from 5% less to 5% more. A bigger change, done in this round.

## Decision

### Spending in decisions, as tax is

The spending screen goes section by section, as the tax screen does (ADR-0035): four sections by
what the money is for and nine decisions under them, each closed until opened, a decision holding a
lever that had moved when the screen opened, a flagship’s included, open from the start. The groups’
folds, their family subheads and the three cards on show a group went.

- **Public services**: Change health, schools and defence (health and social care, schools and
  education, defence day to day); Change the other budgets (the Home Office and borders, prisons and
  courts, grants to councils, transport day to day, the Foreign Office and aid, all other
  departments); Fund a new programme (free school meals for every child, the £2 bus fare cap, an AI
  retraining programme).
- **Investment**: Change public investment (public investment, council and social rent homes); Fund
  the defence plan (the plan’s gap, 3% of GDP now rather than in 2030-31).
- **Benefits**: Change benefits for pensioners (pensioner benefits, and two ways to end the triple
  lock); Change working-age benefits (universal credit, other benefits, a floor in Universal Credit,
  housing benefit matched to local rents, unemployment insurance limited to six months); Change
  disability benefits (disability benefits, stopping them for milder mental health conditions, the
  2025 PIP cuts, assessing children’s claims in person).
- **Last year’s decisions**: Reverse a decision (the extra efficiency savings, the two-child limit,
  winter fuel for pension credit only, the student loan threshold).

Inside them:

- Each budget is one scale, the plan among its levels: a department’s or a benefit line’s “5% less ·
  2% less · 1% less · As planned · 1% more · 2% more · 5% more”, public investment’s from 10% less
  to 20% more. Small, Medium and Large leave the game. Basic mode draws a pick as a scale from the
  plan, health’s “As planned · 1% more · 2% more · 5% more”. At rest a budget still says how it
  grows after rising prices, which no radio names.
- The 2025 PIP cuts move from Last year’s decisions to Change disability benefits, beside the reset
  they contradict, so each of the spending screen’s three pairs that count the same money now sits
  in one decision: the two replacements for the triple lock, the two reforms of disability benefits,
  and the defence plan’s gap against 3% now. None is a set of radios, because a flagship the player
  may choose sets one lever of each pair: choosing one takes the other out and says so first
  (ADR-0036), and where a chosen flagship holds the other the row will not move and offers the way
  back to it.
- The schema has one section shape for both screens, `{ id, label, decisions }`; a decision’s id is
  unique in the file. The validator walks decisions on both screens with the same rules, and a
  spending section needs a pick, as a spending group did (ADR-0028).

### A short name for every choice

Inside its decision every choice goes by a short name in the decision’s own terms: “Food” under
Remove an exemption, “Basic rate” under Change the rates, “Prices only, ending the triple lock”
under Change benefits for pensioners. An item’s `label` holds it, at most 48 characters and seven
words; an item without one goes by its plain name or its policy’s title (“The main rate of VAT”,
“Take VAT off gas too”). No two choices in a decision share a name. Only there: on the review, in
the notes and on Budget day a lever keeps its plain name, since its decision is not in view.

### One card, a row a choice

An open decision is one card with a row for each choice:

- A tick is a box, its short name and what it would do: “would raise at most £32.5bn”. A tax or a
  budget with levels is a row of them, the plan among them, priced at the nearest level each way:
  “21% would raise £9.9bn · 19% would cost £9.9bn”. No row shows headroom: the bar keeps that score,
  and the screen still says once that headroom moves with the interest on borrowing too.
- Once chosen, a row says what it does in the year the rules test, “raises at most £32.5bn in
  2029-30”; only then does its adviser speak, and a budget’s minister with them, and Undo appears. A
  budget’s row leads with its growth after rising prices beside the plan, then the money against the
  plan.
- What the rows share is said once, at the top of the card: what “at most” means where a row prices
  a relief (HMRC’s cost of a tax break, and the real sum would be less, as people change what they
  do), and which rule investment counts against.
- What changes what choosing means stays on the row: the promise that watches it, the flagship it
  belongs to, “Not on the table”, and any warning that applies now. On a phone these tags sit below
  the name rather than beside it, so the name and what the row would do keep the full width: beside
  a column of tags, “1% on everything now zero-rated” took four lines at 360px.
- Each lever’s headline, a budget’s cash, its milestones and tags, what it counts the same money as
  and why, and what it assumes wait under one fold a card, “More about these” (“More about this” for
  one row), each lever under its short name, with Detail and sources when the workings are on.
- A row names what it would take out by the names the card gives them (Choosing this takes out
  “Food”.) and leaves the reason to the fold, since what it names is beside it. Something in another
  decision it names plainly, with the reason, as before. Ticks that contradict each other are still
  one set of radios, “As planned” first, each a row with a radio in place of its box and priced as
  the swap (“would raise £3.5bn instead”).
- A lever a chosen flagship holds is a row naming the flagship, with the way back to it.

Basic mode has no decisions: each section is one card of the adviser’s picks, a row each under its
policy’s title, with one fold.

The old card went, and its styles with it. The rows are `LeverRow` in a `ChoiceCard`, and each
lever’s part of the fold is `LeverAbout`; `LeverControl` keeps the words and flags the rows, the
review and step 3 share.

## Consequences

### Measured

- **Words** on the walk’s game, pinned with a tenth to spare. The advanced tax screen reads 292
  words, from 405, and 459 with choices in six decisions, from 925. The spending screen reads 388,
  from 496, and 592 with four decisions open, from 842; putting it into decisions had taken it from
  554 to 496, and its tuned game, which now opens four decisions with every choice in them, from 723
  to 842. Basic mode reads 196 and 321 on the tax screen, from 352 and 536, and 270 and 421 on the
  spending screen, from 400 and 549.
- **Card by card**, at 360px, each decision opened alone with nothing chosen: the tax screen’s 26
  cards show 1,321 words, from 3,372, and stand 11,283px tall in all, from 21,132px; the spending
  screen’s nine show 829 words, from 1,739, and 5,808px, from 10,746px. Remove an exemption falls
  from 441 words to 117 and from 2,252px to 888px. The option’s “roughly a fifth” holds for cards of
  ticks, which fall to between a quarter and a third of their words (Tax banks and energy firms
  more, 177 to 41; Change the rates on gains, 182 to 47). A card of one scale falls least, to about
  two-thirds (Change corporation tax, 51 to 37), because its levels are the choice.
- **Reading grade.** The fine-tuning screens read at grade 4.9 with every short name and the card’s
  two notes; what a choice takes out, 5.9.
- **On a phone** (360px, screens of 780px): the tax screen on arrival is 2,788px, unchanged, its
  decisions closed. With the walk’s two flagships the spending screen is 3,686px on arrival, from
  4,615px; basic mode’s tax screen is 2,569px, from 3,396px, and its spending screen 2,890px, from
  3,823px. Putting a row’s tags below its name on a phone saved 171px across the tax cards and 186px
  across the spending cards, though a scale’s tag now takes a line of its own (Change the rates,
  929px to 949px).
- **walk41** is clean at 1300px and 360px, in light and with reduced motion, with the audits on. It
  checks the user’s example: Remove an exemption is one card of eight boxes, food priced at “would
  raise at most”, the note on “at most” said once, no adviser before a choice, and one closed fold
  naming all eight; ticked, food reads “raises at most … in 2029-30” with its adviser’s line and
  Undo. It checks too that no row speaks of headroom, that a chosen row has its adviser’s line and a
  resting row none, VAT’s row and its arrow keys, the spending screen’s nine decisions, a budget’s
  scale, growth and minister, the investment card’s note, and the flagships’ rows.

### Risks

- A player reads a price before a judgement: the adviser speaks once a row is chosen, which is what
  the user chose. Undo is beside it, and the fold holds the lever’s own headline.
- No row shows headroom. The bar does, and moves the moment a row is chosen.
- A row that takes out a choice beside it leaves why to the card’s fold. Both are in the same card,
  and a screen reader hears the take-out line first, since it describes the control.
- Scales keep most of their length: seven levels still take two rows of radios on a phone.
