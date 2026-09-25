# ADR-0022: Advice and direction

Status: Accepted, 2026-09-25. Follows ADR-0021 (nothing before it can start).

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
option; the card is then disabled as "already in your Budget".

### State is read from the levers

Nothing records which options were chosen. An option is **on** when every lever in it is at or
beyond the option's value in the direction it points (`deliversTarget`), **adjusted** when some
lever has moved but not to there, and **off** otherwise (`optionState`). Choosing dispatches the
bundle through `setLevers`; putting it back dispatches each lever's default. So the desk and the
guided screens can never disagree, a player who fine-tunes on the desk sees the card as neither on
nor off ("Adjusted on the desk: +5%"), a shared link needs no new key, and every old `L=` link
lights the options it happens to satisfy. Delays stay per lever (`dl`).

### Every card is priced on its own

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
them in it so the figures do not depend on the order ticked; "Keep the headroom" is exclusive;
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
  cards' short lines); the hand-offs 180; eight Continues across the journey.
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
