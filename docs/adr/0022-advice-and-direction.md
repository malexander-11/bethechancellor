# ADR-0022: Advice and direction

Status: Accepted, 2026-09-25; revised 2026-09-26 (every option its own lever, below). Follows
ADR-0021 (nothing before it can start).

## Context

After Phase 17 the user played the game again and said: _"Make this feel more guided. Less you
turning knobs and sliders and more taking advice and providing direction. Agree priorities. A range
of ways to deliver that. A range of ways to afford this. Suggested little add-ons."_

The middle of the game was a desk. After the Prime Minister's themes and flagships the player faced
75 tax controls on eight tabs and 32 spending controls on six, each a slider or a toggle, and was
expected to know which to move. The advisers briefed, the ministers pleaded and the red lines
warned, but nobody proposed anything: the Director of Tax spoke up only at the compromise step, and
then about three levers. The rabbit was the one place a player was offered a short menu of costed
choices, and it was the step people liked. The brief was to make the whole middle work that way:
advisers propose a short list of costed options, the Chancellor gives direction by choosing among
them, and the desk becomes the expert path, one link away.

The honesty contract does not change (ADR-0002, ADR-0011, ADR-0017, ADR-0021). Every option is a
bundle of existing lever values, so the engine costs it; the advisers' words are authored, badged
simulated and quote sourced facts; the badges, earliest starts, red lines and interactions the
cards carried travel onto the options that contain them.

## Decisions taken with the user (2026-09-25)

| Question                        | Choice                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The desk of 107 controls        | **One link away, per screen.** Each guided screen offers its options first; a quiet "Adjust the details" link opens the relevant part of the desk. The desk keeps working and is never the default.                               |
| When "ways to afford" happens   | **Before the OBR's forecast, then a short repair after it.** Revenue is chosen before the envelope opens so the OBR can re-score it; the compromise step follows with the same kind of options.                                   |
| "Agree priorities"              | **Rank up to three from a list of eight, with the PM; nothing is funded yet.** The next screen offers ways to deliver each. The old flagship schemes become options there.                                                        |
| The shape of each range of ways | **Three to five distinct costed approaches** per priority, and the ways to afford grouped by who pays. The player picks any mix.                                                                                                  |
| "Suggested little add-ons"      | **Up to three**, from eight small costed suggestions; the speech names them all; shared links carry a short list instead of one id and old links still open.                                                                      |
| The eight priorities            | Cut the cost of living; bring down NHS waiting lists; defence on the NATO path; fix special needs and schools; homes, investment and growth outside London; families and child poverty; safer streets; get the welfare bill down. |

## Decision

### Priorities, not themes

`data/journey/pm.json` carries `priorities`: eight, each with a title, a noun for a sentence, a
plain purpose, the PM's pitch and reaction (simulated, sourced), the role that leads on it (an
adviser's or a minister's, validated against the roles the data names) and the lead's line that
opens its section of the next screen. The PM screen has three beats: what has been done, ranking
up to three (the order ticked is the rank; a fourth is disabled until one is unticked; the PM
reacts to each), and the PM reading the ranking back with the red lines restated. Ranking moves
no lever. `themes`, `flagships`, `crossCutting` and the PM's flagship `reactions` are gone.

### Options: bundles of the game's own levers

`data/journey/options.json` holds three lists, validated by `optionsFileSchema` and
`validateDataset`:

- `deliver` (29): a way to deliver one priority, with the proposer's line. Every priority has two
  to five; safer streets has two because the game has only a Justice and a Home Office lever there,
  and its lead's brief says so.
- `afford` (26): a way to raise money, with no authored line; the card is the lever's own title,
  headline and badge. Each belongs to one of five who-pays tabs by its lever's incidence pays-group
  (everyone; the best-off; business; savers and owners; drivers, drinkers, smokers, gamblers and
  flyers), three to six per tab.
- `addOns` (8): the little announcements the rabbit offers, each with a short line.

A bundle moves one or two levers to stated values, none of them the default, none macro, all on
the lever's own grid. No lever appears twice on one screen, and none appears on both the deliver
and the afford screens, so an option's state is never ambiguous. An add-on may overlap a deliver
option; the card is then disabled as "already in your Budget" (revised below: no lever appears in
more than one option anywhere).

### State is read from the levers

Nothing records which options were chosen. An option is **on** when every lever in it is at or
beyond the option's value in the direction it points (`deliversTarget`), **adjusted** when some
lever has moved but not to there, and **off** otherwise (`optionState`). Choosing dispatches the
bundle through `setLevers`; putting it back dispatches each lever's default. So the desk and the
guided screens can never disagree, a player who fine-tunes on the desk sees the card as neither on
nor off ("Adjusted on the desk: +5%"), a shared link needs no new key, and every old `L=` link
lights the options it happens to satisfy. Delays stay per lever (`dl`).

### Every card is priced on its own (revised below: against the Budget as it stands)

`useOptionPrices` re-runs the engine for the bundle alone with the economic assumptions in force,
and `describeBundle` reads the effect into one line: "Raises £9.9bn in 2029-30", "Costs £2.2bn in
2029-30", "Saves £4.5bn in 2029-30", "Borrowing up £13.4bn in 2029-30; the current budget is
unchanged" for investment, and "Nothing until 2030-31, then raises £18.5bn" where the lever cannot
start before the target year (ADR-0021). The strip and the scorecard show the real package, so two
cards' figures do not add exactly to the strip's move once interest feedback is on; a screen-reader
note on every figure says it is for the option on its own. The card also carries the badges of the
costings behind it, the manifesto red line it would cross ("Would break the manifesto: The tax
lock" before, "Breaks the manifesto" after), its earliest start, and any authored interaction with
a lever already moved.

### The journey

Seven steps and the same stage indices, so every shared link keeps its meaning; the package's
canonical stage is named `deliver` now, with `afford`, `taxes` and `spending` as its aliases, and
the guard sends an early arrival to the ways to deliver. The package has four screens:

1. `/budget/deliver`, **ways to deliver**: the Director of Public Spending's hand-off, then the
   scorecard against the target, the strip, the advisers' interventions, and one section per
   ranked priority opened by its lead's line, with its options as checkbox cards and a minister's
   reaction once one is on.
2. `/budget/afford`, **ways to afford it**: the Director of Tax's hand-off, then the gap line (the
   target less the headroom, with what the priorities cost), the Political Adviser's press summary,
   and the options on the five who-pays tabs, each tab counting its options and what it has chosen.
   Leaving for the forecast takes the snapshot and moves the game on, as the desk used to.
3. `/budget/taxes` and `/budget/spending`, **the desk**: with a game under way, a side room. One
   beat, the briefing folded, the chosen options' levers pinned to the top of their groups wearing
   "In your package" or "Adjusted from what you chose", the group to open carried in the router's
   history state by "Adjust the details" (the query string belongs to the Budget), and one way back
   to the screen the player came from, or to the compromises once the envelope is open. With no
   game the desk is the sandbox it always was: two screens in sequence leading to Budget day.

The compromise step reads the same options: "Raise more revenue" ranks the ways to afford it not
yet chosen by the headroom each buys (`affordSuggestions`, which replaces `revenueSuggestions`;
an option adjusted on the desk counts as chosen; one that moves nothing in the target year is not
suggested); "Spend less, or later" lists what was chosen to deliver, biggest first, each with a
later start for its lever, half the distance where it is one slider (`narrowedBundle`), or
dropped, then any spending moved on the desk; the old third route, scaling back a promise, folds
into it. The add-ons are checkboxes, up to three, each priced against the package with none of
them in it so the figures do not depend on the order ticked (revised below); "Keep the headroom" is exclusive;
"Go further on {priority}" appears for each delivered priority whose largest single-slider option
has a notch to go. The speech opens on the first-ranked priority, says one paragraph per delivered
priority and names every add-on; the reception reads priorities delivered and a clear priority;
the verdict fills `{priority}` from the ranking.

### Old links

`th` is retired beside `pp`, `cn`, `cp` and `dp`; on decode its values map through
`LEGACY_THEME_PRIORITY` (security to defence, public services to the NHS, every postcode to homes
and growth) and are prepended to the priorities. `pr` keeps its key; an old flagship id in it is
kept by the codec and dropped by `rankedPriorities`. `rb` becomes a `+` list; a single old value
is a list of one; `rb.flagship:*` is dropped with a warning. Old `L=` values still apply.

## Consequences

- The desk is never the default with a game under way, and it still works: a player who wants a
  figure the options do not offer is one link from it, and the tests of the sandbox are unchanged.
- Word budgets: the ways to deliver at most 750 visible words with three priorities of five
  options; the ways to afford at most 500 per tab; the add-ons 360 (raised from 300 for the ten
  cards' short lines); the hand-offs 180; eight Continues across the journey (revised below: 800
  and 400).
- The engine gains `game/options.ts` (state, red lines, earliest start, overlaps, the who-pays
  tabs, the ranking) and `game/promises.ts`; `ambitionStatus` reports each priority delivered,
  part-delivered or undelivered from its options' states; nothing in the arithmetic changed.
- `REVENUE_CLASS` in the speech and `incidence.json` disagree on four levers (`cgth`, `iht`,
  `sdlt5`, `apd`); the afford tabs read incidence, the speech keeps its own classes, and reconciling
  them is a follow-up.
- Counts: 116 lever files and 135 sources, unchanged; eight priorities; 29, 26 and 8 options.
- Not built: a policing or courts lever, so safer streets has two ways; a speech fragment for a
  measure that starts after the target year (ADR-0021's follow-up); a delay on a whole bundle
  rather than its levers.

## Revision (2026-09-26): every option its own lever

### Context

Playing Phase 18, the user said: _"Issue: the options are not independent of each other."_ Asked
which coupling they had met, they named all three the code showed:

1. **The same lever on two screens.** Seven of the eight add-ons were a way to deliver under
   another name (`meals` moved `ufsm`, `fuel-cut` moved `fuel`, `retraining` `airet`, `keep-bus-cap`
   `bus2`, `plan2` `rvplan2`, `vat-gas` `vatgas`, `benefit-floor` `ucfloor`), and the eighth, the pub
   cut, reversed the afford screen's alcohol rise. Ticking an add-on lit a way to deliver as
   delivered; a 10% fuel duty cut disabled the 5% add-on as "already in your Budget"; raising
   alcohol duty disabled the pub cut for the wrong reason; an add-on ticked first made a way to
   deliver read "Adjusted on the desk". The decision above allowed it, and the schema forbade a
   shared lever only within one list and between deliver and afford.
2. **Overlapping measures double counted.** Pairs that count the same money could both be on at
   full price: defence at 3% now and the Investment Plan gap (the lever's own text says funding both
   counts some of the same money twice); the CSJ mental-health reset and the 2025 PIP changes (two
   reforms of one caseload); CenTax's CGT package and the charge at death (the package already
   removes the write-off); a fuel duty cut and the restored uprating. Eleven softer "approximate
   combination" pairs existed between option levers. `optionOverlaps` warned only once the other
   lever had moved, read one direction only, and disabled nothing.
3. **Card prices ignored the package.** Each card priced its bundle alone with only the economic
   assumptions in force, so its figure never moved with what else was chosen and the strip's move
   differed from the card's. The add-ons and the compromise step already priced against the
   package.

### Decisions taken with the user (2026-09-26)

| Question                                                   | Choice                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add-ons that duplicated a way to deliver; the alcohol pair | **Every option its own lever.** The schema forbids a lever in more than one option anywhere. The seven duplicates are replaced by small measures nobody else offers; the pub cut stays and the afford screen's alcohol rise becomes a tobacco rise.                                                                                             |
| Options that count the same money twice                    | **Disable the second, say why.** Pairs are authored in `options.json` with a reason; while one is in the Budget the other's card is blocked, reading "Instead of {other}" and the reason. To switch, untick the first. Softer overlaps read "Overlaps with {other}" before either is chosen and quote the interaction once the other has moved. |
| Card prices                                                | **Against the Budget as it stands**: what choosing the option now would do, and the headroom that would leave; on, what it is doing and the headroom the Budget would have without it.                                                                                                                                                          |

### What changed

- **Schema.** `optionsFileSchema` refuses any lever in two options across the three lists
  ("addOns option x and deliver option y both move lever z"). Every option kind may carry
  `conflicts: [{ with, text }]`: `with` is an option id on any screen, never the option itself, and
  each pair is authored once ("options x and y both author their conflict; author it on one").
- **Data.** The Duties tab's alcohol rise is a tobacco rise (`tob: 10`, which the lever's own
  headline says raises little). Four conflicts, each quoting the levers' own interaction text:
  `three-per-cent-now` with `dip-gap`, `mental-health-reset` with `pip-changes`, `cgtalign` with
  `cgtdth`, `fuel-duty-cut` with `rvfuel`. The eight add-ons are now: keep VAT off electricity past
  March 2027 (`vatelec`), a point off the 5% stamp duty band (`sdlt5`), £100 on the personal
  allowance (`itpa`), £2 a week more before National Insurance starts (`nicpt`), transport's
  day-to-day budget up 5% (`dft`), aid up 5% (`fcdo`), half a per cent more for pensioners
  (`wpens`) and five per cent off alcohol duty (`alc`), each with a sourced short line and a speech
  fragment. The defence 3% card's interaction with the day-to-day defence slider is information,
  not a warning: the two add up rather than count the same money.
- **Engine.** `allOptions` and `optionByLever` name every option on every screen; `optionConflicts`
  reads a pair from either side with how the partner stands; `blockedBy` is the conflict that blocks
  an option (it is not on, and the partner is on or adjusted on the desk). `optionOverlaps` reads
  the levers' authored interactions from both sides, names the option that offers the partner
  lever, carries `active` (the partner has moved), lists a partner no option offers only once it has
  moved, and leaves out a pair authored as a conflict, because the conflict says it. The compromise
  step's suggestions skip a blocked option; the speech skips an add-on id the data no longer offers.
- **Prices.** `describeMove(withIt, withoutIt, …)` reads an option's levers' effect in the Budget
  with the move made less their effect without it, into the same words as before but without the
  year. `useOptionPrices` returns, for an option off or adjusted, that move on top of the Budget as
  it stands and the headroom it would leave ("Costs £2.2bn · leaves £4.5bn"); for one on, what
  putting it back would undo and the headroom without it ("· without it £6.7bn"). The card's "leaves"
  is what the strip will read once the option is ticked, debt-interest feedback included; the year
  is said once per screen ("Figures are for 2029-30, against your Budget as it stands") and in a
  screen-reader note on each figure.
- **Cards.** A blocked card is disabled, dimmed, tagged "Instead of {other}" and carries the
  reason; with both sides of a pair in from the desk, both cards warn ("both this and {other} are
  in your Budget") and neither is blocked, because either can be put back. Overlap notes read
  "Overlaps with {option}" quietly, then "Overlaps with {option}: {interaction}" (red for a warning)
  once the other has moved.
- **The add-ons** are `OptionCard`s priced the same way, against the Budget with the other add-ons
  in it. This reverses the order-independent baseline decided above: the figures now depend on what
  is already ticked, which is what the user asked for, and "leaves" makes the dependence plain.
  "Keep the headroom" prices what it does: every add-on back, "Costs nothing · leaves £X". The
  count reads only the cards on the page, so an old `rb.meals` link cannot pin "3 of 3 chosen".
- **Word budgets**, measured: the widest ways to deliver 766 visible words (limit 750 → 800: the
  cards now name what they overlap and the headroom each would leave), the add-ons 382 (360 → 400).
  The ways to afford stay under 500 per tab.

### Consequences

- No screen can light or undo another's option; an option's state is the truth about its own
  levers and nothing else.
- Two options that count the same money cannot both be chosen from the cards; the desk can still
  set both levers, and then both cards say so rather than one being quietly right.
- Card figures move with the package. Two cards' figures still do not add to the strip's move, and
  no longer pretend to: each is the next move from here.
- Old links carrying a retired add-on id (`rb.meals`, `rb.fuel-cut`, …) decode to fewer add-ons;
  the speech and the count ignore them; an old `L=alc.5` still applies on the desk.
- Counts unchanged: 29 ways to deliver, 26 ways to afford, 8 add-ons; four conflicts.
