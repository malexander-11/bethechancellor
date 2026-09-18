# ADR-0015: The revenue menu

**Status:** accepted, 2026-09-18

## Context

The tax folders held thirty levers, but the manifesto's tax lock covers income tax rates, employee
National Insurance and VAT, so the room a Labour Chancellor actually has (employer National
Insurance, pensions, the smaller duties, capital-tax reliefs, going further on recent rises) was
mostly missing. The user asked for more tax-raising options, realistic ones. The committed sources
already carried most of the numbers: unused rows of HMRC's ready reckoner, unused rows of HMRC's
relief-cost table, and, newly reachable, HMRC's private pension statistics (Table 6, July 2026),
which give employer National Insurance relief on pension contributions and income tax relief by
marginal rate.

## Decision

1. **Direct where a published figure exists; assumption where the arithmetic is ours.** The tax
   folders take only direct-badged levers, as the consistency test requires; anything costed by our
   own arithmetic goes in the colleagues' letters folder badged an assumption, as the wealth tax
   does.

2. **Seven new direct levers from committed rows.** The employer NICs threshold (HMRC's £2 a week
   row), vehicle excise duty (£5 on every vehicle), air passenger duty (£1 on every economy ticket),
   tobacco duties on top of the escalator, the Business Asset Disposal Relief rate (HMRC's +1 and
   +5 point rows as a lookup), abolishing the residence nil-rate band (HMRC's static relief cost),
   and insurance premium tax, retired in Phase 4 and revived with its level shown. Each carries an
   incidence tag, a speech class, a behavioural consideration and, where the manifesto is in play, a
   Political Adviser note.

3. **A second relief-cost extract.** HMRC's pension statistics are extracted by a new CSV reader
   into the same shape as the tax relief table, and relief extracts are keyed by source id in the
   validator, so a lever cites a row of either by `sourceId` and `rowId`. The three by-rate totals
   are sums of HMRC's five contribution-type rows and say so in their description.

4. **Charging employer NICs on pension contributions is direct.** HMRC's £14,300m (2024-25, Class 1
   secondary, excluding salary-sacrificed contributions because Budget 2025 already caps them) is
   applied from the start year and grown with the OBR's National Insurance receipts, exactly as the
   VAT toggles treat HMRC's relief costs. The card says static cost, names the public sector's share
   (£6.5bn), and carries the tax-lock note.

5. **Employer-side National Insurance is not a red line.** The desk follows the government's own
   reading of the manifesto lock (the National Insurance working people pay), as it did for the
   employer rate in Phase 2. The Political Adviser's consideration on each employer-side lever says
   the reading is contested and would be argued again.

6. **A weighted sum is a method.** `derivedFromPublished` gains `weightedSum`: published quantities
   each multiplied by a stated factor and added, one figure in a base year, then flat or grown with
   a head; the validator reproduces it. Flat-rate pension relief at 30% uses it over HMRC's relief
   by marginal rate: a quarter of the higher-rate relief, a third of the additional-rate relief,
   less half as much again on the basic-rate relief, about £2.5bn before anyone reacts.

7. **A repeat is a direction.** A scorecard-backed lever can say `direction: "repeat"`: the
   Treasury's certified costing taken as the yield of doing the measure again, plus the lines. It
   is an assumption, so it lives in the letters folder badged as one: another 2p on dividend,
   savings and property income, and a second round of the Budget 2025 gambling duty rise.

8. **The letters can raise money at the sums.** The Director of Tax's suggestions rank every
   revenue-side policy in the letters that raises money alongside the taxes, each wearing its own
   badge, so the new options are reachable when the forecast bites. A spending saving in the
   letters is a cut and stays with the spending route.

## Consequences

- Thirty-eight tax levers and sixteen campaign policies. The Director's list is led by the big
  static relief costs (VAT on food, National Insurance on pension contributions, VAT on new homes),
  none of which crosses a red line; the rate rises the lock covers come next.
- Static relief costs are the largest numbers on the desk and the most caveated: the headline says
  static, the first consideration says how the yield would fall, and the drawer shows the row and
  the uprating factor.
- The two pension CSVs join `data/raw/` with their hashes; `npm run derive` writes the extract and
  the manifest, and `check:derived` guards them.
