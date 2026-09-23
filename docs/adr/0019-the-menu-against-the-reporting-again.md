# ADR-0019: The menu against the reporting, again

Status: Accepted, 2026-09-22. Follows ADR-0017 (the Budget 2026 menu) and ADR-0018.

## Context

Two days after Phase 13 the user asked: _"Any budget potential items missing?"_ On 21 September
2026 the reporting for the 28 October Budget was read again (gov.uk and HMRC notices, the Centre
for the Analysis of Taxation, the Resolution Foundation, City AM, the Institute for Government,
Which?, the professional firms' Budget trackers; the OBR, the IFS, the Social Market Foundation and
the Commons Library were unreachable from here) and set against the 82 live levers and the
published rows already committed under `data/derived/` that no lever used: 35 HMRC ready-reckoner
rows, 191 relief rows, 73 Budget 2025 lines and 66 Autumn Budget 2024 lines.

What was missing, and whether it could be built under ADR-0002:

| Reported                                                                                                                                                                                                                                                                               | Buildable                | How                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Extend the electricity VAT zero rate past 31 March 2027. HMRC Notice 701/19 and the 8 September policy paper make the rate temporary; the game had treated the cut as done and open-ended                                                                                              | Yes                      | Twice the government's six-month figure, grown with VAT; assumption                                   |
| National Insurance for workers over state pension age (a lower rate is floated)                                                                                                                                                                                                        | Yes                      | HMRC relief row `nic-s2`, £1.2bn static; direct                                                       |
| "Partnership NICs" on LLP partners' profits                                                                                                                                                                                                                                            | Yes                      | CenTax, £1.9bn in 2026-27 after behaviour; assumption                                                 |
| Align capital gains tax with income tax, the reported front-runner                                                                                                                                                                                                                     | Yes                      | CenTax's package, £14.3bn on the 2025-26 base, less the £2.5bn the October 2024 rise took; assumption |
| The CGT lower rate                                                                                                                                                                                                                                                                     | Yes                      | Three HMRC rows; direct                                                                               |
| A CGT charge on people who leave                                                                                                                                                                                                                                                       | Yes                      | CenTax's "at least £500 million a year" as a floor; assumption                                        |
| Cap private residence relief above a value                                                                                                                                                                                                                                             | Only as the whole relief | HMRC's £32.9bn static cost, tagged not on the table                                                   |
| The £1.5m surcharge band, machine games duty, a warehouse rates surcharge and an online sales levy, a flat 10% estate levy, a council tax top band, a pension lump-sum cap, an ISA holdings cap, NICs on investment and rental income, holiday lets into council tax, the levy at 1.8% | No                       | No primary costing reachable: named in words on the cards and the briefings, not built                |
| Welfare cuts, PIP changes before the Timms review, changing the fiscal rules, abolishing stamp duty, a corporate exit tax                                                                                                                                                              | Ruled out                | No lever                                                                                              |

Already in the baseline and rightly absent as levers: the EV mileage charge, the soft drinks levy
extension, the carbon border adjustment. The fiscal rules are unchanged and one OBR forecast
arrives on Budget day.

## Decision

1. **Seven levers, two of them direct.** `vatelec`, `nicspa`, `nicllp`, `cgtalign`, `cgtl`,
   `cgtexit` and `cgtprr`, each from a published figure with the arithmetic on the card. Nothing
   new in the engine: every one uses a costing shape ADR-0017 introduced.
2. **The electricity extension is a Budget line.** The government published one figure, about
   £850 million for the six months to March 2027. A full year is twice that, grown with VAT, and the
   card says the doubling is ours, that a winter half-year probably overstates, and that the
   Treasury's promised full-year figure replaces the term when published. The decisions-since-March
   table now says the cut ends in March 2027.
3. **The 2024 rise is netted off CenTax's package.** CenTax costed alignment from rates of 10%
   and 20%; the Treasury has since scored the move to 18% and 24% at £2.5 billion in 2029-30. The
   card is a `weightedSum` of the two published figures, held flat in cash because CenTax's
   figure is a medium-term one on the 2025-26 base, and it warns against every overlapping CGT
   card (the death write-off, the exit charge, the rates, BADR, the 2024 reversal). Its caveat is
   `cgt-behaviour`, which the harsher forecast outcomes re-score; the hard-line factor of 0.7 sits
   close to CenTax's own worst case of £9.7 billion.
4. **Think-tank figures come from the primary document.** CenTax's three reports are registered
   with their PDFs and quoted; press coverage is registered only for words (the £1.5m band's home
   counts, what was deferred to the Budget, the flat estate levy), and every such entry says so.
5. **The lock.** Charging National Insurance to working pensioners is an increase for a group that
   pays none, so `nicspa` breaks the tax lock and wears the manifesto tag. Partnership NICs mirrors
   employer National Insurance, which the 2024 Budget treated as outside the lock, so `nicllp` does
   not break it and carries the contested reading as a legal consideration, as `nicpen` does.
6. **Two tabs for capital taxes.** Capital taxes was the widest tab and would have broken the
   500-word budget; it is now Capital gains and Wealth and property, each with its own briefing.
7. **The Director of Tax does not suggest what nobody proposes.** `revenueSuggestions` skips
   `notOnTheTable` levers, so the relief toggles teach without being advised.
8. **Not built, and why.** Machine games duty: the Social Market Foundation's costing sits behind
   a blocked site and the Treasury's modelling is unpublished. The warehouse surcharge, the online
   sales levy, the flat estate levy, a council tax top band, the lump-sum cap and NICs on
   investment or rental income: no published costing; the business rates slider stands in for the
   first two. The levy at 1.8%: still no primary source for the rate.

## Consequences

- 60 tax levers (43 direct, 16 assumption, 1 mechanical) in eight tabs; 26 spending and welfare
  levers on offer and six kept for the record; 95 lever files; 115 sources; 495 tests.
- The context readings move to 22 September: the 10-year gilt at 5.29% (the adviser's +0.75 is
  unchanged), borrowing to August £8.1 billion above the OBR's profile, the Resolution
  Foundation's £10 billion headroom estimate quoted on the outlook step.
- A player can now stack CenTax's package with its parts; the warnings say so, and the OBR draw
  re-scores the package. Nothing stops them, as with every other card.
- When the Budget publishes a full-year electricity cost, a rate for the levy, or a costing for any
  item in decision 8, the card or the gap changes: a data change, not a rewrite.

## Revision, 2026-09-23: the FT's list

The user asked whether the menu held everything in an FT survey of the plausible tax-raising
options (23 September 2026), supplied as screenshots because FT blocks every route from here.
Read in full: the capital gains section (a rise, alignment, HMRC's finding that ten points on the
higher rate lose £3.6bn in 2028-29, the Resolution Foundation's £4bn), the corporation tax cap,
windfall taxes, the tax gap, the salary-sacrifice cap, the triple lock, the £1.5m surcharge band,
stamp duty and gambling duties were all on the menu already. Two were not, and one card could be
sharpened:

- **Pension tax relief at the basic rate** (`pens20`): the article's largest uncovered option, reported
  with an IFS estimate of "as much as £22bn" that no reachable document carries. The card is our
  arithmetic on HMRC's relief by marginal rate, half of the higher-rate relief and five ninths of the
  additional-rate relief, about £20bn in 2024-25 grown with income tax, badged assumption, warning
  against the flat 30% card, with the employer-contribution objection on it.
- **Doubling the bank levy** (`banklevy`): the article names the levy beside the surcharge. HMRC's
  banking-sector table gives levy receipts of £1.3bn in 2024-25, down from £3.0bn as the rate was
  halved; the card adds that once more, grown with corporation tax, static, badged assumption.
- **The £1.5m band** (`hvcts15`): Tax Policy Associates' analysis (updated 19 September) is the first
  published yield for the threshold: about 160,000 extra homes; about £800m a year after behaviour
  if a £2,500 band is added and every other band's charge rises, which adds about the £400m this
  card already assumes; only around £120m net for a plain £1,500 band. The card keeps the certified
  line as its arithmetic and quotes TPA in words.

Not built: a cut to the pension lump sum and higher fees for passports and driving licences, which
have no published costing; the fiscal devolution roadmap and mayoral overnight-stay levies, which
move money between tiers rather than raise it. The FT article is not registered as a source; every
figure on the new cards comes from HMRC's tables or TPA's page. Counts after the revision: 62 tax
levers (43 direct, 18 assumption, 1 mechanical), 97 lever files, 116 sources.
