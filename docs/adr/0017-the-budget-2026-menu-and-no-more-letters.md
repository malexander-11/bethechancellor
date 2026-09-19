# ADR-0017: The Budget 2026 menu, and no more letters

**Status:** accepted, 2026-09-19. Revises ADR-0008 (the letters' screen) and ADR-0015 (the
folder quarantine of our own arithmetic).

## Context

The user asked two things of the game on 19 September 2026: _"Does it include likely items being
considered for the budget? If not, how can we introduce them"_, and _"get rid of the letters from
colleagues section"_.

**The review.** The reporting ahead of the Budget on 28 October 2026 (gov.uk, the Resolution
Foundation, the Institute for Government, the professional firms' trackers; the IFS and the OBR
sites are unreachable from the build environment) was set against the seventy-six levers in the
data.

- Already covered: ending or extending the threshold freeze, the employer National Insurance rate
  and threshold, National Insurance on employer pension contributions, the VAT base toggles,
  inheritance tax rates and bands, the duties and fuel duty's staged rises, the Budget 2025 rises on
  investment income and gambling done again, the PIP, winter fuel and two-child decisions, the
  Defence Investment Plan's gap, social care through local government, a wealth tax and a 50p rate.
- Reported and missing, with a published figure to build on: capital gains on assets held at death
  (the Resolution Foundation's £4 billion, with an exit charge), extending the council tax surcharge
  below £2 million, reversing the farm and family-business relief reform (Autumn Budget 2024 line
  29), a bank surcharge rise (HMRC's banking-sector receipts), the energy profits levy package again
  (Autumn Budget 2024 line 24), business rates (no lever existed; the OBR line is in the vintage),
  the self-employed Class 4 rate (an unused HMRC row), VAT off domestic gas (HMRC's relief cost less
  the government's electricity figure), another HMRC compliance package (Budget 2025 line 59),
  unfreezing the Plan 2 repayment threshold (Budget 2025 line 48), defence at 3% of GDP sooner (the
  OBR's shares) and an employer threshold slider that reaches the £6,000 being floated.
- Reported but not addable honestly, because no published costing was reachable: a cap on the
  pension tax-free lump sum, a 1.8% social care levy, a cap on ISA holdings, holiday lets moved to
  council tax, machine games duty. They are named here as gaps and not built.
- Ruled out by the government and therefore not added: a land value tax, an exit charge, a flat
  levy at death.

**The letters.** ADR-0008 put the policies colleagues campaign for on a third screen of the
package, "Recommendations from Parliament", each costed by our own arithmetic and badged an
assumption; ADR-0015 then made that folder the quarantine for our arithmetic, so the tax groups
held only direct-badged levers. By Phase 11 the screen carried sixteen levers, five of the Prime
Minister's fifteen flagships and two of the four rabbit cards pointed at them, and the screen was
the one part of the package that read as a story device rather than a Budget. The user's
instruction on the content was: _"Keep them stored in back-end but remove the concept of letters
from MPs."_

## Decision

1. **Two screens.** The package is the taxes and the spending. The routes `/budget/policies` and
   `/recommendations` land on the spending with the query intact; the `policies` and
   `recommendations` step names, the `campaign` category and the `recommendationsAdopted` reading
   are retired from the schemas. No copy, group, adviser line or document mentions letters or
   Parliament's recommendations.

2. **The badge quarantines, not the folder.** A lever costed by our own arithmetic sits in the
   group its subject belongs to, beside the HMRC row or Treasury line it resembles, and wears the
   assumption badge there. The reader sees "Direct costing" and "Assumption" side by side in the
   same tab and can compare them; the consistency test now requires every tax lever to be direct,
   mechanical or assumption for a stated reason, rather than every tax lever to be direct. The
   Director of Tax's suggestions at the sums rank every live tax lever, each with its badge.

3. **A share of an OBR line is mechanical, whichever side.** The percentage-of-baseline costing may
   scale a `receiptsByTax.*` line on a receipts-side lever; the schema ties the line to the side
   and keeps a published plan a spending baseline. Business rates (`brates`) is the first: a slider
   on the OBR's Table A.5 line, about £0.4 billion a point, read in cash rather than real terms.

4. **Eleven re-homed, five shelved.** Codes and costings are unchanged, so every old link still
   works.

   | Code                                         | Now                                                            |
   | -------------------------------------------- | -------------------------------------------------------------- |
   | `it50`, `pens30`                             | tax · Income tax                                               |
   | `wealth`                                     | tax · Capital taxes                                            |
   | `iinc2`, `gam2`                              | tax · Budget 2025 decisions                                    |
   | `dip47`, `ufsm`, `bus2`, `airet`, `socrent`  | spend · Flagship programmes, each with a minister              |
   | `cpilock`                                    | welfare · Welfare, with a minister                             |
   | `def5`, `aid07`, `freeuni`, `water`, `nonuk` | kept for the record: `deprecated`, group Shelved, on no screen |

   A shelved lever keeps its description, costing, raw source and considerations, so
   `validate:data` and the engine tests keep reproducing it; the app filters it out, the incidence,
   minister and suggestion checks skip it, and an old link decodes it as an unknown code with a
   warning, exactly as child benefit has since Phase 5. The seeded draw's revision that named a
   shelved lever's caveat now names the CGT-at-death caveat instead.

5. **The menu, lever by lever, with its assumption.**

   | Code      | Group                     | Badge      | Figure and what it assumes                                                                                                                                                                                                                |
   | --------- | ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `brates`  | Business                  | mechanical | A percentage of the OBR's business rates line (£42.1bn in 2029-30). Bills move in proportion to receipts; the line is UK-wide although non-domestic rates are devolved.                                                                   |
   | `cgtdth`  | Capital taxes             | assumption | The Resolution Foundation's £4bn a year for ending the death write-off _and_ an exit charge, grown with CGT receipts from 2029-30. No split is published and the exit charge is ruled out, so it is an upper bound; the headline says so. |
   | `hvcts15` | Capital taxes             | assumption | Budget 2025 line 54 (the £2m surcharge) repeated as a £1.5m band, set-up costs included. Equal yield is the assumption; nobody has published the count of homes or the charge.                                                            |
   | `rvapr`   | Capital taxes             | direct     | Autumn Budget 2024 line 29 reversed, 2030-31 grown with the OBR's inheritance tax line.                                                                                                                                                   |
   | `bank5`   | Business                  | assumption | Two thirds of HMRC's £1.0bn of surcharge receipts at 3% (two more points), grown with onshore corporation tax. Static; the base is rounded to £0.1bn.                                                                                     |
   | `epl2`    | Business                  | assumption | Autumn Budget 2024 line 24 repeated, flat in cash for 2030-31. The yield moves with oil and gas prices.                                                                                                                                   |
   | `nic4`    | National Insurance        | direct     | HMRC's Class 4 main rate row, 0 to 4 points; the tax lock watches it.                                                                                                                                                                     |
   | `vatgas`  | VAT                       | assumption | A third of HMRC's £7.0bn relief cost for the last five points on all domestic fuel and power, less twice the government's £850m half-year electricity figure, grown with VAT. Annualising is ours.                                        |
   | `hmrc2`   | Budget 2025 decisions     | assumption | Budget 2025 line 59 repeated. Nobody has costed a fourth compliance package in a year.                                                                                                                                                    |
   | `rvplan2` | Spending Review decisions | direct     | Budget 2025 line 48 reversed on the spending side; the 2026-27 revaluation falls before the start year.                                                                                                                                   |
   | `def3`    | Flagship programmes       | assumption | (3% − the OBR's share) × nominal GDP on a straight line between the OBR's two published points; nought in 2030-31, when the path arrives anyway.                                                                                          |

   The employer threshold slider (`nicst`) now runs to +£1,040, the £6,000 being floated.

6. **What could not be built honestly.** The pension lump-sum cap, a social care levy, an ISA cap,
   holiday lets into council tax and machine games duty have no published costing reachable from
   here. Under ADR-0002 they are not levers; they are this paragraph.

## Consequences

- 52 tax levers (41 direct, 10 assumption, 1 mechanical), 26 spending and welfare levers on offer
  and six kept for the record, 87 lever files. Three sources registered (the Resolution Foundation
  paper, HMRC's banking-sector receipts with the ODS committed and hashed, Corporation Tax Act
  2010 section 269DE); the Autumn Budget 2024 entry notes lines 24 and 29.
- The journey asks seven Continues, not eight; ADR-0013 and ADR-0014 quote eight as the record of
  their day. The word budgets hold: the taxes average under twelve words a control.
- The markets' credibility rule (`credibilityShare`) bites more often, because assumption-badged
  revenue now sits on the tax screen where a player reaches for it. That is intended: a Chancellor
  who funds a package on repeats and static costs should hear about it.
- The web filters deprecated levers at load, so the engine tests that need a very large package to
  miss the stability rule still switch on defence at 5%: the fixture loads every file, shelved
  ones included, and the arithmetic is kept for exactly that reason.
- Risks, stated on the cards: `cgtdth` is an upper bound by construction; `bank5` rests on receipts
  rounded to £0.1bn and a 2026 edition is due; `vatgas` annualises a part-year figure the Budget
  may replace; `hvcts15` and `epl2` repeat certified lines as assumptions; `brates` scales a line
  that includes the devolved administrations' rates.
