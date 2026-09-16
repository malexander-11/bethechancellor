# ADR-0010: Four sets of assumptions, and where an optimist comes from

**Status:** accepted, 2026-09-16; **revised the same day** — see _Revision_ at the foot. The
original decision shipped a pessimistic card that left more headroom than the player's own
adviser. The reasoning below is kept as written, because the mistake is instructive.

## Context

Step 1 asked the player to confirm the economic assumptions by moving three sliders: interest
rates, nominal GDP growth and RPI inflation. Each carried a suggested setting derived from a
mechanical rule, presented as a table of readings.

It was the most fiddly screen in the game and the least like a decision. Nobody has a basis on
which to prefer +0.5 to +0.75 on a slider, and being asked to is the opposite of the "advisers hand
you things" framing everywhere else. The instruction was to make it a choice between four options:
keep the March baseline, take your Chief Economic Adviser's view, or take an optimistic or a
pessimistic analyst's, each with a rationale.

Two of those already existed and were sourced. The baseline is the OBR's own forecast. The
adviser's view is a stated rule — latest reading minus the OBR's assumption, rounded to the
slider's step (methodology §11).

The other two were the problem. **An "optimistic analyst" whose numbers this repository made up
would be the first invented figure in the project**, and ADR-0002 exists to prevent exactly that.
So the question this decision had to answer first was not how to lay out four cards. It was whether
an optimist and a pessimist can be built out of published figures at all.

## Decision

**They can, from one document already committed and hashed.** HM Treasury's _Forecasts for the UK
economy: a comparison of independent forecasts_ (August 2026, `hmt-forecasts-2026-08`) prints, in
one table and on one basis, an independent average, a **Highest** row, a **Lowest** row and the
**OBR's own row**. Table M4 gives the official Bank Rate and Table M3 gives RPI, both as annual
averages for 2026 to 2030.

So all four cards are one method: the mean gap against a published comparator row, rounded to the
slider's step and clamped to its range — the rule already in `journey/suggest.ts`, pointed at a
different row.

| Card                               | Rule                              | rates | growth | RPI  |
| ---------------------------------- | --------------------------------- | ----- | ------ | ---- |
| Keep the March baseline            | The OBR's own forecast, unchanged | 0     | 0      | 0    |
| Your Chief Economic Adviser's view | Latest reading − OBR              | +0.75 | 0      | +0.5 |
| An optimistic analyst              | Lowest row − its OBR row          | −0.5  | 0      | 0    |
| A pessimistic analyst              | Highest row − its OBR row         | +0.25 | 0      | +1.0 |

**The settings are derived, never authored.** `data/context/2026-09.json` carries the published
rows and the cards' words; `journey/scenarios.ts` computes the numbers. A tampered row moves the
card, and a test proves it. Authoring four value sets with prose beside them would have been
simpler and would have put four hand-typed numbers in the data with nothing to check them against —
which is not how any other number in this tool is treated.

**Every card shows the headroom it leaves**: £23.6bn on the March baseline, £31.1bn optimistic,
£8.8bn pessimistic, £6.8bn on the adviser's. That is the point of the screen. A Chancellor can buy
headroom by picking the rosier forecast, and here you watch it happen in four numbers on one line.

**The three sliders stay, behind a disclosure**, with their readings and provenance drawers intact.
A permalink whose settings match no card shows a fifth state, _your own figures_, rather than
pretending it is one of the four.

## What the cards have to say out loud

Three facts fell out of the sourcing that are uncomfortable enough to be worth stating on the card
rather than smoothing over. Each is the interesting part.

**1. The pessimist's interest rates sit _below_ the adviser's.** The rates slider moves Bank Rate
and gilt yields together. The adviser reads the 10-year gilt yield — 5.35% against the OBR's 4.5%
assumption — because gilt yields, not Bank Rate, drive debt interest. A full-text search of the
comparison returns no gilt yield anywhere: **none of the sixteen forecasters publishes one.** The
analysts' range is therefore a Bank Rate range, and +0.25 is genuinely smaller than +0.75.

Without a line explaining that, the card reads as a bug. With it, the player learns that
"pessimistic" and "what is happening right now" are different things, and that the number which
actually moves debt interest is the one nobody forecasts. So each published range carries its own
comparator row (`alternatives.against`) and a mandatory `note` naming its basis; the schema will
not accept one without the other.

**2. There is no optimistic case on RPI.** The lowest published path is 0.18 points a year below
the OBR's, which rounds to nothing at the slider's half-point step. Not one forecaster in the
comparison sees RPI materially below the OBR, and on the quarterly basis the lowest 2026 forecast
is _above_ it. The zero is the finding, not a failure, and the card says so.

**3. Growth stays on the OBR's path on all four cards.** The comparison publishes no medium-term
range for nominal GDP. The tempting route — add the highest real GDP growth to the highest GDP
deflator — is illegitimate: those cells belong to different institutions (the deflator column has
five respondents and its highest row is a single forecaster in four of five years), so the sum is a
path nobody published. It is also incoherent, implying independent forecasters see higher nominal
GDP than the OBR while the same document's borrowing rows show them forecasting _more_ borrowing in
every year. The only published nominal-GDP range covers 2026 and 2027 and exceeds the slider's
whole ±0.5 range several times over, so it carries no information at the slider's resolution.

## Consequences

- One rule, four cards, one document. Refreshing to the September 2026 edition of the comparison is
  a data change: the rows move, the cards move with them, and no test hard-codes a value outside
  the derivation.
- A Highest or Lowest row is a per-cell envelope, not any one institution's forecast. The copy says
  "the highest figure any of the sixteen publishes", never "an analyst forecasts".
- HM Treasury permits the averages and ranges to be reproduced if reproduced accurately and not in
  a misleading context, but individual forecasters' rows remain their copyright. Only the Highest,
  Lowest and OBR rows are used, which keeps the tool inside that permission and rules out the
  otherwise attractive "follow one coherent forecaster" design without seeking permission.
- The step lost its two shortcut buttons: "Take the advisers' view" and "Keep the OBR's March view"
  are now two of the four cards.
- Two readings were relabelled while this was checked against the PDF. The CPI and RPI comparisons
  use the _"Average of forecasts received this month"_ row but were described as the independent
  average. The figures were right and the adviser's suggestion is unchanged either way; the
  description was wrong, and is now exact.
- If a forward-looking gilt-yield range is ever committed — the Bank of England's Monetary Policy
  Report publishes market-implied rate paths and numeric fan-chart bands — the rates cards should
  move onto it, and the basis note in the data becomes unnecessary rather than merely honest.

---

## Revision, 2026-09-16: the cards have to come out ordered

### What was wrong

The decision above bound each card to **one row of one table**. That produced:

| Card                               | rates | growth | RPI  | Headroom    |
| ---------------------------------- | ----- | ------ | ---- | ----------- |
| Keep the March baseline            | 0     | 0      | 0    | £23.60bn    |
| Your Chief Economic Adviser's view | +0.75 | 0      | +0.5 | £6.85bn     |
| An optimistic analyst              | −0.5  | 0      | 0    | £31.10bn    |
| A pessimistic analyst              | +0.25 | 0      | +1.0 | **£8.80bn** |

The pessimist left more headroom than the adviser, because the adviser's rates figure is the
10-year gilt yield (+0.75) while the analysts' was the comparison's Bank Rate range, whose highest
row is only +0.25 above the OBR's.

Point 1 above treated that inversion as the most useful thing on the screen and wrote a line on the
card explaining it. **That was the wrong call, and it is the error worth recording.** A player
reading four cards expects them ordered. A "pessimistic" card cheerier than their own adviser's
reads as a bug however well it is explained, and an explanation that has to work that hard is a
sign the model underneath is wrong rather than merely surprising.

### What replaced it

A card is no longer bound to a row. It is bound to a **rule for choosing among the published
figures**, and every candidate is still published. For each slider the candidates are:

- the OBR's own assumption (the lever's default);
- the adviser's reading (`suggestSetting` — today's gap, or the authored value);
- the lowest published row of the comparison, against its own comparator;
- the highest published row.

The optimistic card takes the candidate least harmful to the public finances on each slider; the
pessimistic card takes the most harmful. **Which direction is harmful is derived, not authored:**
each macro lever names a `costing.sensitivityId`, and the sign of that sensitivity's
`effectOnPsnbGbpm` in the vintage says whether turning the slider up raises borrowing. The new
`psnbDirection(vintage, sensitivityId)` in `packages/engine/src/costing/sensitivity.ts` reads it,
and `validateVintage` now rejects a sensitivity whose years disagree in sign, since such a slider
has no direction to derive. Read the increase table only: `rpi1pp`'s `effectOnPsnbGbpmDecrease` is
negative because it states the effect _of the decrease_, and taking the sign from there inverts the
answer.

| Card                               | rates     | growth | RPI  | Headroom    |
| ---------------------------------- | --------- | ------ | ---- | ----------- |
| Keep the March baseline            | 0         | 0      | 0    | £23.60bn    |
| Your Chief Economic Adviser's view | +0.75     | 0      | +0.5 | £6.85bn     |
| An optimistic analyst              | −0.5      | 0      | 0    | £31.10bn    |
| A pessimistic analyst              | **+0.75** | 0      | +1.0 | **£1.35bn** |

The optimist does not move: its figures were already the kindest available. The pessimist now
matches the adviser on rates, because no published rates figure is gloomier than today's gilt
yield, and beats it on inflation, so it is strictly worse.

### Why the ordering is now structural

The adviser's own setting and the OBR's default are in the candidate pool, so the pessimist is by
construction at least as harmful as both on every slider and the optimist at most as harmful. The
ordering therefore survives a data refresh rather than depending on one, and a property test
asserts it instead of pinning four numbers. It is exact for the pessimist against the adviser,
which is the case that failed, because those two now carry the same rates setting and RPI has no
side channel. For the optimist it is first-order only: the rates sensitivity also moves the
marginal rate on other levers' borrowing, so on a budget that cuts borrowing hard the comparison
is not a strict identity. The test asserts it on the bare assumptions step, where the cards are
read.

### What the cards still say out loud

The gilt-yield lesson survives, reframed, and is still the most interesting thing on the pessimist's
card: **the gloomiest published figure for interest rates is not a forecast at all.** None of the
sixteen forecasters publishes a gilt yield, their Bank Rate range tops out milder than the market,
so the card takes today's 5.35% — and gilt yields, not Bank Rate, are what drive debt interest.
Points 2 and 3 above are unchanged: there is no optimistic case on RPI, and growth stays on the
OBR's path on every card because there is no published figure to move it to.

### One consequence in the data

`alternatives.optimistic` and `alternatives.pessimistic` were named after the cards but hold the
lowest and highest published rows, which coincide only while the slider's harmful direction is up.
They are now `alternatives.lowest` and `alternatives.highest`, and the derived direction decides
which card each feeds. Had they kept the old names, a committed nominal-GDP range would have put
the lowest growth row on the optimistic card, which is the wrong way round.
