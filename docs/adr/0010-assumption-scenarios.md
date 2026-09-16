# ADR-0010: Four sets of assumptions, and where an optimist comes from

**Status:** accepted, 2026-09-16

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
