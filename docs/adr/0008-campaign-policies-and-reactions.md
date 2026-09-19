# ADR-0008: Costing policies nobody has costed, and Budget day as feedback

**Status:** accepted, 2026-09-15. Revised by ADR-0017 (2026-09-19): the third screen and the
`campaign` category are gone; eleven of the sixteen policies sit on the tax and spending screens
under their own groups, five are kept for the record on no screen, and our arithmetic is quarantined
by its badge rather than by a folder.

## Context

Two things were missing from the journey.

First, a Chancellor does not choose from a menu of Treasury-costed options alone. Colleagues in
Parliament campaign for policies, and a Budget is judged partly by which of them it takes. Eleven
such policies were named for the game. None of them has a certified costing, because none of them
is government policy: there is no HMRC ready-reckoner row, no Treasury scorecard line, no OBR
forecast line to read off.

Second, Budget day showed a table. It answered "what are the numbers" when the question a player
actually has is "how did that go".

Both push against the honesty contract (ADR-0002). A policy with no official costing either gets
a number this repository works out itself, or it gets nothing and the page is a list of slogans.
A page about reactions either invents a mood or finds a way to say something true.

## Decision

### 1. Arithmetic we do ourselves is allowed, and machine-checked like everything else

A new raw-source kind, `derivedFromPublished`, records the method and its published inputs on the
lever. `checkRawSourceConsistency` reproduces the schedule from them, so an edited figure fails
exactly the way a tampered HMRC row does. Four methods cover the eleven policies:

| Method          | What it computes                                                       | Used by                                               |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `gdpShareGap`   | (target share − the forecast share) × nominal GDP                      | defence at 5% of GDP, aid at 0.7% of national income  |
| `upratingGap`   | a benefit line × the compounding ratio of two published uprating paths | the triple lock replaced by CPI                       |
| `statedProduct` | a product of published quantities, each with its own source            | free school meals, social rent, the wealth tax, water |
| `seriesProduct` | two or more published year series multiplied year by year              | free tuition, withdrawing benefits                    |

Every such lever carries the badge `assumption`, not `direct`. The provenance drawer prints the
terms, their sources and the product. The one exception is the 50% income tax rate, which is five
one-penny steps of HMRC's own additional-rate row and keeps the `direct` badge.

Where a figure rests on a contested base, the card says so before it shows the number. The wealth
tax and withdrawing benefits from foreign nationals both open with the word "contested", and both
carry the reason: for the wealth tax, that the Wealth Tax Commission says its own work "has been
constrained by a lack of reliable data on individuals with total wealth above £10 million" and
that the Office for National Statistics publishes nothing above the top 1% threshold; for
benefits, that 96.2% of the universal credit caseload is settled here, protected by the
withdrawal agreement or holding indefinite leave, and that people subject to immigration control
already have no recourse to public funds.

### 2. Financial transactions are modelled as financial transactions

`classification.psnflTreatment: 'financialTransaction'` existed in the schema and did nothing.
It now routes the amount to its own channel: cash that is borrowed, and so accrues interest on
the same half-year convention as any other borrowing, but that is not expenditure and moves
neither borrowing nor net financial liabilities. The Treasury's own budgeting guidance is the
authority: such transactions "do not score as spending and there is no immediate effect on
Public Sector Net Financial Liabilities", though they do raise net debt and the cash requirement.

This is what makes water renationalisation teachable. Defra's own £100bn costs £100bn of gilts
and about £5bn a year of interest, and leaves the stability rule almost untouched. Free tuition
is the mirror image: converting a loan into a grant moves money the other way, out of a financial
transaction and into spending, which is why £11.5bn of fee loans costs £7.7bn of borrowing rather
than nothing.

Schedules also gained a `once` flag, because a purchase is not a yearly programme.

Spending classifications gained `capitalShare`, because a defence uplift is not all day-to-day
money. The Spending Review's own defence settlement is 43% capital, and capital does not count
against the stability rule, so the split changes the verdict.

### 3. Budget day reports signals, and every word of them is authored

`packages/engine/src/reactions.ts` is a pure function from the outcome and the lever set to
`ReactionSignal[]`. Each signal reads one number off the outcome (`stabilityHeadroomGbpm`,
`borrowingChangeGbpm`, `taxTakeChangePp` and so on) and picks the first band whose threshold the
reading does not exceed. The bands, their headlines, their detail and their sources live in
`data/journey/reactions.json`. No signal text exists anywhere else, and a test asserts it.

The reading that selected the band is printed beside the text, so a player can check the
judgement rather than take it. Market bands describe what commentators watch, citing the OBR's
own interest-rate sensitivity and the September 2026 gilt yield against the 4.5% the March
forecast assumed. They never predict a market move.

The public panel is not a band at all: it carries the distributional considerations of the levers
the player moved, in their own words, with their own citations, ordered by the size of the
measure.

## Consequences

- The tool now shows numbers no official body has published. That is a real step, and the
  mitigations are the method on the card, the reproduction test, the `assumption` badge and the
  contested-first wording. A reader who disagrees with a figure can see exactly which published
  input to argue with.
- Adding a campaign policy means adding a method, or fitting an existing one. That friction is
  deliberate: a policy that cannot be reduced to published inputs does not belong on the page.
- Reactions are bands, not a model. A budget near a threshold flips between two sets of words
  with no gradient. The reading beside the text is what keeps that honest.
- The state of the gilt market is pinned to September 2026 in the band text. It is data, in the
  registry, and it goes stale like any other reading.
