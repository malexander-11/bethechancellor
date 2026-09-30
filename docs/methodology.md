# Methodology

This document is the single description of how _What’s your Budget?_ turns choices into numbers.
Anything the app displays should be explainable from here; if it is not, the methodology is wrong or
the app is.

## 1. The honesty contract

Every figure and every line is one of five kinds (the fifth, for the game's own judgements, was
added in Phase 8 under ADR-0011). Each wore its kind on screen as a badge until 2026-09-30; since
ADR-0034 (§33) the data records it and no screen shows it:

| Kind                             | Meaning                                                                                                                                                                                                                              | Examples                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Official figure** (`direct`)   | An official estimate of the direct effect of a policy on receipts or spending, reproduced from HMRC, HM Treasury or the OBR, with the transformation steps shown.                                                                    | HMRC ready reckoner: 1p on the basic rate of income tax; HMT Budget 2025 scorecard lines.                     |
| **Worked out** (`mechanical`)    | Arithmetic that follows from the direct costings and the baseline, with no behavioural judgement.                                                                                                                                    | Adding deltas to the OBR path; debt interest on extra borrowing; ratios to GDP.                               |
| **Assumption**                   | A number the player or the tool chooses, using published sensitivities where they exist.                                                                                                                                             | The interest-rate, growth and inflation sliders; the uprating of ready-reckoner figures beyond their horizon. |
| **Commentary** (`commentary`)    | Behavioural and macroeconomic effects described in words and direction only, with sources. Never a number of our own.                                                                                                                | "Large CGT rises can lose revenue because people delay disposals (HMRC)."                                     |
| **Game judgement** (`simulated`) | A judgement nobody published, in a role's voice: what the Prime Minister wants, what a minister says at a cut, how a market or a household reads the Budget. May quote a sourced fact and read an engine number; never produces one. | "That is the tax lock, Chancellor." The kind of Budget named at the close.                                    |

The names on the badges were made plainer on 2026-09-27 (Phase 23, for a reading age of ten to
twelve); the ids in the data and what each kind means are unchanged. The badges left the screens on
2026-09-30 (ADR-0034, §33), and the names are now the About and Methodology pages' words for the
five kinds.

Phase 25 (ADR-0026) added three rules at the edges of the contract. A relief cost is an official
figure but not a yield, so its card says the most the measure could raise ("raises at most £X"),
never what it raises. A choice has one price everywhere: the change it makes to the bar's headroom
in the target year, with the interest on borrowing in it, found by re-running the engine with and
without the choice (`optionPrice`). And a spoken Game judgement line (the Prime Minister's sign-off,
the Opposition's reply) holds no figure at all: the schema refuses a digit.

The engine never adds a behavioural or macroeconomic knock-on of its own. Where HMRC's direct
costings already include a standard behavioural response (they do, for example, for income tax and
CGT), the lever says so.

## 2. Vocabulary

- **Fiscal year.** April to March, written `2029-30`. Economy series from the OBR are calendar years
  and are displayed only; they never enter fiscal arithmetic.
- **Receipts.** Public sector current receipts: taxes plus interest, dividends and other income.
- **TME.** Total managed expenditure, split into departmental expenditure limits (**DEL**, planned
  in Spending Reviews: resource **RDEL** for day-to-day spending and capital **CDEL** for
  investment) and annually managed expenditure (**AME**: welfare, debt interest, locally financed
  spending and other demand-led items).
- **PSNB.** Public sector net borrowing: TME less receipts. The deficit.
- **PSNI.** Public sector net investment: capital spending less depreciation.
- **Current budget deficit.** PSNB less PSNI: day-to-day spending less receipts. A negative value is
  a surplus. The stability rule is a test on this line.
- **PSNFL.** Public sector net financial liabilities: financial liabilities less financial assets
  (including student loans and funded pension assets). The investment rule's debt measure. **PSND**
  (public sector net debt) is the older headline measure and is displayed for context only.
- **Headroom.** The margin by which a rule is met in its target year, in £ billion. It is a forecast
  quantity and moves with every forecast revision.
- **Vintage.** One OBR forecast, stored as a versioned data set (`data/vintages/<id>/`). The current
  vintage is `obr-2026-03`, the March 2026 Economic and fiscal outlook.

## 3. Two GDP denominators

Flows (receipts, spending, borrowing, the current budget) are expressed as a share of financial-year
nominal GDP. Stocks (PSNFL, PSND) are expressed as a share of GDP centred on the end of the
financial year (the average of two adjacent years), which is about 1.5% higher. The vintage carries
both series. Using one for everything would misstate PSNFL by more than a percentage point of GDP.
Until the OBR's supplementary tables are committed, both series are derived from published £ billion
figures and rounded shares and are flagged `provisional`.

## 4. The fiscal rules

The Charter for Budget Responsibility (Autumn 2025 edition, in force February 2026) sets:

- **Stability rule.** "The current budget must be in surplus in 2029-30, until 2029-30 becomes the
  third year of the forecast period. From that point, the current budget must then remain in balance
  or in surplus from the third year of the rolling forecast period." Once rolling, HM Treasury
  defines balance as "a range: in surplus, or in deficit of no more than 0.5% of GDP", and if that
  range is used "the current budget must return to surplus from the third year at the following
  fiscal event".
- **Investment rule.** PSNFL "is falling as a share of the economy by 2029-30, until 2029-30 becomes
  the third year of the forecast period. Debt should then fall by the third year of the rolling
  forecast period."
- **Welfare cap.** Spending on capped welfare must stay within a cap (£194.5 billion in 2029-30) and
  a margin (5%). It is formally assessed at the first Budget of a Parliament and monitored at other
  Budgets, so the verdict has three states: within the cap, above the cap but within the margin,
  above the margin.

The OBR formally assesses the rules once a year, at the autumn Budget. The Chancellor may suspend
them in a significant negative shock, after asking the OBR to assess its severity.

**Target-year logic.** The engine derives the target year from the vintage. The forecast period is
the five financial years after the year in progress. If its third year is on or after 2029-30, the
rules are rolling and the third year is the target; otherwise the target is 2029-30 and the
stability rule requires a surplus. For the March 2026 vintage the third year is 2028-29, so the
fixed 2029-30 target applies. From the Budget of 28 October 2026 the forecast will run 2027-28 to
2031-32, the third year is 2029-30, and the rolling form applies. The app can preview that form on
the March baseline (`assessAsOf: nextBudget`).

**Headroom is shown two ways once rolling:** against zero (a surplus) and against the 0.5%
tolerance. Which one the OBR will headline has not been settled publicly.

**Plain names** (Phase 25, ADR-0026). On screen the stability rule is "the day-to-day rule" and the
investment rule "the debt rule": a `shortName` on each rule in the Charter file, carried into every
verdict. The briefing's fold ties each plain name to its official one. The bar names a missed rule
with the engine's own margin ("Debt rule missed by £4.5bn"), and Budget day names the welfare cap
only when it is missed. At a fiscal event the stability test is a surplus; the 0.5% range of balance
applies only between fiscal events.

## 5. Calculation spine

All internal arithmetic is in £ million by fiscal year. `Δ` means the change from the baseline
caused by the player's choices.

1. **Lever effects.** Each lever's costing yields ΔR (receipts), ΔC (current spending), ΔK (capital
   spending) and ΔW (welfare inside the cap) by year. Receipts positive means more revenue; spending
   positive means more spending. Source signs (HMRC "yield", HMT "reduces borrowing") are converted
   at extraction time and the conversion is recorded.
2. **Macro assumptions.** Each slider multiplies an OBR sensitivity (ΔPSNB by year per unit) by its
   setting. The growth slider also compounds both nominal GDP denominators; the interest-rate slider
   also raises the marginal rate used in step 4.
3. **Primary borrowing.** ΔB^prim = ΔC + ΔK − ΔR + ΔPSNB^macro.
4. **Debt-interest feedback** (mechanical; always on in the game since Phase 26, §27, and a switch
   in the engine). With marginal rate r and a half-year convention, ΔB_t = (ΔB^prim_t +
   r_t·ΔD_{t−1}) / (1 − r_t/2), and the stock of extra debt ΔD_t = ΔD_{t−1} + ΔB_t. The interest
   line ΔI_t = ΔB_t − ΔB^prim_t is shown separately and never folded into a lever's costing.
5. **Aggregates.** PSNB = baseline + ΔB. PSNI = baseline + ΔK. Current budget deficit = PSNB − PSNI,
   so capital spending changes the current budget only through interest.
6. **PSNFL.** PSNFL_t = baseline PSNFL_t + Σ_{s≤t} ΔB_s. The baseline already contains the OBR's
   valuation effects and financial transactions, which are held fixed.
7. **Ratios.** Flows over financial-year GDP; stocks over centred GDP; computed, never stored.
8. **Verdicts.** Stability: current budget deficit at the target year against zero (fixed) or 0.5%
   of GDP (rolling). Investment: change in PSNFL as a share of GDP between the year before the
   target and the target year must be negative; headroom is that change times centred GDP. Welfare
   cap: inside-cap spending in the cap year against the cap and margin.
9. **Attribution.** Each lever's contribution to the target-year current budget and borrowing is
   reported separately, then the macro assumptions, then the debt-interest line.

## 6. Direct costings and uprating

Tax levers use two official sources, both committed under `data/raw/` with their hashes:

- **HMRC, _Direct effects of illustrative tax changes_, June 2025.** One row per illustrative change
  (for example "Change basic rate by 1p"), £ million for 2026-27, 2027-28 and 2028-29, for an April
  2026 start on HMRC's Spring Statement 2025 indexed baseline. HMRC's figures are direct effects on
  the tax concerned and closely related bases, include HMRC's standard behavioural response, and
  exclude wider economic effects. The July 2026 edition was deferred while HMRC reviews key
  assumptions, after the Office for Statistics Regulation asked for more transparency about pre- and
  post-behavioural estimates.
- **HM Treasury, Budget 2025 Table 4.1 policy decisions.** Certified costings of each Budget measure
  to 2030-31, positive when they reduce borrowing. The "reverse a Budget 2025 measure" toggles use
  these lines with the sign reversed.

The pipeline extracts both tables to `data/derived/`, and every lever cites the rows or lines it
uses. A validation step rebuilds each lever's per-unit table from the cited rows and fails if it
differs, so the numbers in the app cannot drift from the published ones.

### Costing kinds

- **Linear per unit.** Effect = setting ÷ unit size × published effect per unit. Asymmetric rows (a
  rise "yield" and a cut "cost") are kept separate and chosen by the sign of the setting. Combined
  levers (employee plus self-employed NICs, petrol plus diesel) sum their rows. A summed lever may
  scale its rows by a stated multiplier, and is then badged Worked out: the health and social care
  levy is 1.25 times the one-point rows for the employer, employee and self-employed rates, main and
  additional, about £26bn in 2029-30 (Phase 25); the levy is retired, its costing kept (§34).
- **Lookup table.** Where HMRC says changes are non-linear (capital gains tax, the personal
  allowance, the higher-rate threshold), the lever uses HMRC's published points only, interpolates
  in a straight line between them and never goes beyond the largest published change.
- **Schedule.** Dated effects by year, used for the Budget 2025 reversals; nothing applies before
  the start year. A scorecard-backed schedule reverses the published measure (minus the lines) or,
  with `direction: "repeat"`, does it again (plus the lines); a repeat assumes the second round
  raises what the Treasury costed for the first, is badged an assumption and sits in its tax group
  beside the certified rows (ADR-0015, ADR-0017).
- **Relief-cost toggles.** HMRC's static cost of a relief for its latest year, applied from the
  start year and grown with the relevant receipts head, with HMRC's caveat that the cost of a relief
  is not the yield from removing it. Two extracts back them: HMRC's tax relief statistics (Table 2)
  and HMRC's private pension statistics (Table 6, with Tables 6.1 and 6.2 by marginal rate); a lever
  cites one by source id and row id. Since Phase 25 (ADR-0026) each lever built on a relief cost
  carries `reliefCost`: its card reads "raises at most £X" with one plain line on why, and the
  markets count it among the costings nobody has certified. National Insurance on employer pension
  contributions is now a weighted sum over the pension statistics, the private sector's part only
  (§26).

### Uprating (ADR-0004)

HMRC's years run from April 2026. The game's measures start in April 2027 (the first April after the
Budget of 28 October 2026) and the rules bite in 2029-30, so each published profile is carried
forward:

1. Published year k applies to `start year + k − 1`.
2. Each value is multiplied by the growth of the relevant OBR receipts head between the published
   year and the target year. A head is the sum of its rows in EFO Table A.5 (receipts by tax, £
   million); only other taxes, which has no such rows, is its share of GDP (Table 3.1) × nominal
   GDP.
3. Beyond the third published year, the third-year figure grows with the same head.
4. Every step is recorded and shown in the provenance drawer beside the raw figure.

Worked example, basic rate +1p, start April 2027, income tax receipts (£m) 2026-27 359,600; 2027-28
384,600; 2028-29 395,600; 2029-30 413,800; 2030-31 430,800:

| Year    | Published (year taken) | Factor                    | Used  |
| ------- | ---------------------- | ------------------------- | ----- |
| 2027-28 | 6,900 (2026-27)        | 384,600 ÷ 359,600 = 1.070 | 7,380 |
| 2028-29 | 8,250 (2027-28)        | 395,600 ÷ 384,600 = 1.029 | 8,486 |
| 2029-30 | 8,200 (2028-29)        | 413,800 ÷ 395,600 = 1.046 | 8,577 |
| 2030-31 | 8,200 (2028-29)        | 430,800 ÷ 395,600 = 1.089 | 8,930 |

So a penny on the basic rate adds about £8.6 billion to 2029-30 headroom before the small interest
saving on lower borrowing. The level of HMRC's baseline is not rebased to March 2026; that
correction waits for the March 2025 receipts tables.

Head used by tax: income tax levers and the threshold-freeze reversal → income tax; NICs, the
employer threshold and National Insurance on pension contributions → NICs; VAT → VAT; corporation
tax → onshore corporation tax; capital gains, inheritance and stamp duty → capital taxes; fuel duty
→ fuel duties; alcohol → alcohol and tobacco duties; insurance premium tax → other taxes. Where the
OBR publishes the tax's own line (Table A.5) the lever grows with it instead: vehicle excise duty,
air passenger duty, tobacco duties, inheritance tax, capital gains tax.

### Interactions

HMRC notes that rate and threshold changes are only approximately additive, and two levers can touch
the same tax (fuel duty rates and the April 2027 freeze). Authored interaction notes appear when
both levers of a pair are moved; they change no numbers.

A pair that counts the same money is authored once with the severity `excludes`, and the validator
checks it (Phase 25): seventeen pairs since §35, the exit charge with CGT at death among them. On
step 4 only one of a pair can be chosen: ticks that contradict each other in one decision are one
choice among radios, and anywhere else choosing one takes the other out, which the card says first
and prices as the swap (§35); since §36 each is a row in its decision’s one card.

### Spending levers (ADR-0006)

Spending levers add a third source, the **Spending Review 2025 departmental DEL tables** (HMT, June
2025; `data/raw/hmt-sr25/`), and reuse the other two on the spending side.

- **Percentage of a baseline path.** Eight departments and an "all other" residual scale their
  Spending Review resource settlement (resource DEL excluding depreciation, Table 5.3, published in
  £ billion and converted to £ million at extraction): effect = setting ÷ 100 × baseline, from the
  start year. The Spending Review stops at 2028-29, so 2029-30 and 2030-31 carry the 2028-29
  settlement forward with the growth of the OBR's total RDEL (594,200 ÷ 581,800 = 1.021 for 2029-30;
  614,200 ÷ 581,800 = 1.056 for 2030-31). That extension is an assumption and is marked as one in
  the drawer: the OBR says the same envelope implies real cuts to "unprotected" budgets (EFO
  paragraph 4.16), so the pro-rata path is probably too high for those departments and too low for
  protected ones. The residual is the published total less the eight rows, rebuilt by the validator
  from the cited rows. The investment lever and the four welfare lines scale OBR forecast series
  directly (Table 4.1 CDEL; Table 4.6 components), which need no extension.

  Worked example, Health and Social Care +1%: plan 221,322 (2027-28) → 2,213; 231,977 (2028-29) →
  2,320; extended 231,977 × 1.021 = 236,921 (2029-30) → 2,369; 244,896 (2030-31) → 2,449 (£m). The
  OBR's total RDEL (582bn in 2028-29) is higher than the Spending Review total (568bn) because of
  later decisions and forecast adjustments; the lever scales the department's line and the OBR total
  remains the baseline aggregate.

- **Signs on the spending side.** Spending positive means more spending. An HMRC "cost" row (child
  benefit rates) is therefore positive and a "yield" row negative, the reverse of the tax side. A
  Budget 2025 scorecard measure that raised spending has a negative scorecard value; reversing it
  saves that amount, so the schedule equals plus the summed lines (minus them on the receipts side).
  The validator applies the side-aware rule, so a wrong sign fails `validate:data`.

- **Welfare cap by line.** The cap covers most welfare except the state pension and the payments
  most sensitive to the cycle. Pensioner spending is treated as outside the cap and the other lines
  as inside, which misplaces small parts of each (pension credit, winter fuel payments and pensioner
  housing benefit are inside; jobseeker payments are outside). Check against the EFO: 2029-30
  welfare 389.9bn less inside-cap 199.2bn leaves 190.7bn outside against pensioner spending of
  187.5bn.

- **Investment.** Capital changes add to borrowing and to net financial liabilities and reach the
  current budget only through debt interest, which is the framework's design and the reason the
  attribution list carries a borrowing column. Depreciation on new assets and the financial
  transaction share of capital DEL are not modelled.

- **Barnett consequentials are described, not computed.** A change to a comparable department's
  budget would change the block grants to Scotland, Wales and Northern Ireland by the change ×
  comparability factor × population share (Statement of Funding Policy, June 2025, paragraphs
  3.9-3.18 and Annex B). Each comparable department carries that note with its factors; the numbers
  exclude it, and the "all other" residual includes the block grants themselves.

## 7. Assumption sliders

The sliders use the OBR's published sensitivities for the March 2026 forecast: a sustained 1
percentage point rise in Bank Rate and gilt yields adds about £15 billion to borrowing in 2030-31;
0.1 percentage point a year on nominal GDP growth is worth about £8 billion by 2030-31; 1 percentage
point on RPI inflation adds about £11 billion (a fall removes about £10 billion). The OBR publishes
end-year figures; the year-by-year path is our stated assumption and is flagged as such in the data.

## 8. Uncertainty

The OBR's average absolute five-year forecast error for receipts is 0.9% of GDP, roughly £32 billion
in 2030-31, larger than any recent headroom. The app shows headroom beside that figure so that a
"pass" reads as a forecast, not a fact.

## 9. Not modelled

Growth effects of the player's choices; market reactions to the fiscal stance (Budget day describes
what commentators watch, it does not predict what they do); Barnett consequentials (described under
each department, never added to the number) and the devolved governments' own choices; departmental
underspending against plans; the effect on the rules' debt measure of reclassifying a body into the
public sector; depreciation on new capital spending.

## 10. Reproducibility

`packages/engine` has golden tests that reproduce the OBR baseline with no policy changes, property
tests for the accounting identities, and unit tests for the rule logic. Everything under `data/` is
validated against the engine's schemas, and `data/derived/` is regenerated by the pipeline in CI and
compared with the committed files.

## 11. The guided journey (ADR-0007)

From Phase 4 the app is a walk-through rather than a single sandbox page: **Start** (the scenario:
appointed Chancellor, Budget on 28 October 2026), **Step 1 Assumptions**, **Step 2 Taxes and
spending** (two tabs under a scorecard) and **Step 3 Budget day**. The budget travels between steps
in the URL's query string, so any step can be linked to; old `/b` links redirect into the taxes tab.

### Advisers

Five roles, no people: Permanent Secretary, Chief Economic Adviser, Director of Tax, Director of
Public Spending and Political Adviser (`data/journey/advisers.json`). Everything they say is an
authored paragraph in `data/journey/briefings.json` with at least one source per paragraph, or an
existing lever consideration; the validator checks that every adviser exists, speaks on the step,
and that every group briefing names a real lever group. On Budget day the closing notes are the
considerations of the levers the player moved, routed to an adviser by kind: behavioural and
interaction notes to the tax or spending director, macro and market notes to the Chief Economic
Adviser, administrative notes to the Permanent Secretary, distributional, devolution and legal notes
to the Political Adviser. No text is generated.

### The assumptions step and the suggestion rule

`data/context/2026-09.json` holds dated readings, each with the OBR's March figure and the latest
figure and their sources: the 10-year gilt yield (Bank of England), Bank Rate, real GDP growth, CPI
and RPI (averages of independent forecasts compiled by HM Treasury, plus ONS outturns) and
borrowing. Readings that drive a slider carry a suggestion rule. The `gap` rule is mechanical:
latest minus OBR (the mean over shared years for a series), rounded to the slider's step and clamped
to its range; with the September 2026 readings that gives +0.75 points on the rates slider (5.35%
against 4.5%) and +0.5 on RPI (an average gap of 0.46). An `authored` rule carries a value and its
reasoning, used for growth, where weaker real growth and higher inflation roughly cancel on nominal
GDP. Suggestions are badged as assumptions; the OBR's own path is one click away.

### Four sets of assumptions, one method (ADR-0010)

From Phase 7 the step is a choice between four cards rather than three sliders. Each is one stated
rule over published rows, run through the same rounding and clamping as the suggestion rule above;
none of the four settings is authored, so tampering with a published figure moves the card. (Retired
on 2026-09-27, §25: every game now plans on one figure, today's estimate, made by the `gap` rule
above; the cards, the published ranges and the ordering rule are gone.)

| Card                               | Rule                                              | rates | growth | RPI  | Headroom |
| ---------------------------------- | ------------------------------------------------- | ----- | ------ | ---- | -------- |
| Keep the March baseline            | The OBR's own forecast, unchanged                 | 0     | 0      | 0    | £23.60bn |
| Your Chief Economic Adviser's view | Latest reading − OBR (the `gap` rule)             | +0.75 | 0      | +0.5 | £6.85bn  |
| An optimistic analyst              | The least harmful published figure on each slider | −0.5  | 0      | 0    | £31.10bn |
| A pessimistic analyst              | The most harmful                                  | +0.75 | 0      | +1.0 | £1.35bn  |

The two analysts are not bound to one row of one table. For each slider the candidates are the OBR's
own assumption, the adviser's reading, and the lowest and highest published rows of the comparison;
the optimist takes the kindest of them and the pessimist the cruellest. **Which direction is harmful
is derived, not authored:** each macro lever names a `costing.sensitivityId`, and the sign of that
sensitivity's `effectOnPsnbGbpm` says whether turning the slider up raises borrowing
(`psnbDirection` in `packages/engine/src/costing/sensitivity.ts`; `validateVintage` rejects a table
whose years disagree in sign).

Because the adviser's own setting and the OBR's default sit in that pool, the cards come out ordered
by construction: the pessimist can never leave more headroom than the baseline or the adviser, and
the optimist never less. An earlier version bound each analyst to a single published row and shipped
a pessimist leaving £8.8bn against the adviser's £6.85bn, because the comparison's gloomiest Bank
Rate figure is milder than today's gilt yield. ADR-0010 records why explaining that on the card was
the wrong fix.

The two analysts read _Forecasts for the UK economy: a comparison of independent forecasts_ (HM
Treasury, August 2026), which prints a Highest row, a Lowest row and the OBR's own row in the same
table: Table M4 for the official Bank Rate and Table M3 for RPI, both annual averages for 2026
to 2030. HM Treasury permits the averages and ranges to be reproduced if reproduced accurately and
not in a misleading context; individual forecasters' rows are their copyright and are not used here.

Three things about those figures are stated on the cards rather than smoothed over.

1. **The gloomiest published figure for interest rates is not a forecast.** The rates slider moves
   Bank Rate and gilt yields together. The adviser reads the 10-year gilt yield, because gilt yields
   drive debt interest; the comparison publishes no gilt yield at all, and its Bank Rate range tops
   out milder than the market, so the pessimistic card takes today's 5.35% reading. Each published
   range therefore carries its own comparator row (`alternatives.against`) and a note naming the
   basis, and the schema makes both mandatory.
2. **There is no optimistic case on RPI.** The lowest published path is 0.18 points below the OBR's
   on average, which rounds to nothing at the slider's half-point step: not one forecaster in the
   comparison sees RPI materially below the OBR, and on the quarterly basis the lowest 2026 forecast
   is above it.
3. **Growth stays on the OBR's path on every card.** The comparison publishes no medium-term range
   for nominal GDP. Adding its highest real growth to its highest GDP deflator would splice
   different institutions into a path nobody published, which is exactly the invention ADR-0002
   forbids; its short-term nominal GDP range covers 2026 and 2027 only and exceeds the slider's
   whole range several times over.

A highest or lowest row is a per-cell extreme, so no single institution holds a card's whole view,
and the pessimist's rates figure is a market reading rather than a forecast at all; the cards say so
rather than claiming an analyst forecasts any of it. Every card shows the headroom it would leave,
which is how the step teaches that a Chancellor can buy headroom by picking the rosier forecast. The
three sliders remain behind a disclosure, with their readings and provenance drawers intact; a
permalink whose settings match no card shows _your own figures_.

### The scorecard

For the stability rule's target year: headroom (the big number, against the OBR's March figure and
the typical forecast error), the three verdicts, the current budget balance, borrowing, net
financial liabilities as a share of GDP and borrowing as a share of GDP, each as March → yours. All
come from the same outcome the verdict cards use.

### Levels, not deltas

Controls show the level a setting moves to: "20% → 21%", "£12,570 → £13,070", "£50,270 → £55,297",
"57.95p → 60.85p", "£232.0bn → £236.6bn in 2028-29". The level is display metadata (`control.level`:
baseline, unit, add or percentage change, source), or for percentage-of-baseline levers the baseline
path itself. The engine still costs the change, the permalink still stores the change, and no
baseline enters the arithmetic. Inheritance tax is a select (abolish, 30%, 35%, 40%, 45%, 50%); the
engine snaps a select to its nearest offered option, so a hand-edited link cannot land between
options.

### New direct costings in Phase 4

- **VAT base-broadening toggles** (food, domestic energy, children's clothing, printed matter,
  passenger transport, new homes) use HMRC's _Estimated cost of tax reliefs_ (January 2026, Table 2,
  2025-26), carried forward with the OBR's VAT receipts path. HMRC's caveat is quoted on every
  toggle: the figures "do not represent the gain to the exchequer should a relief be abolished".
  They are shown as the static cost of the relief; the true yield would be lower.
- **Reversing the October 2024 CGT rate rise** and **cutting the additional-dwellings stamp duty
  surcharge back to 3%** use Autumn Budget 2024 Table 5.1 (lines 27 and 25) with the sign reversed
  for 2027-28 to 2029-30 and the capital taxes head for 2030-31; the CGT line bundles the Business
  Asset Disposal Relief and Investors' Relief changes, which the toggle says.
- **Inheritance tax abolition** removes the OBR's forecast inheritance tax receipts (EFO Table A.5,
  now in the vintage as `receiptsByTax`) year by year; rises use HMRC's 1 percentage point row and
  cuts mirror it, an assumption the drawer states.
- **Insurance premium tax** is retired: its code stays reserved and old links decode with a warning.
  (Phase 10 revived it, §16; it was retired again on 2026-09-30, §34.)

## 12. Where nobody has published a costing, and Budget day (ADR-0008, ADR-0017)

### Arithmetic we do ourselves

Some of what a Chancellor weighs has no certified costing: the Prime Minister's schemes, a measure
the reporting says is on the table, a tax nobody has legislated. Rather than print a slogan with no
number, the repository does the arithmetic and shows it, on the same screen as the certified rows.
Each such lever carries a `derivedFromPublished` raw source naming the method and its published
inputs, or a scorecard line with `direction: "repeat"`, and `checkRawSourceConsistency` reproduces
the schedule from them: an edited figure fails exactly as a tampered HMRC row does.

| Method           | Arithmetic                                                | Example                                                                                                            |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `gdpShareGap`    | (target share − forecast share) × nominal GDP             | Defence at 3% from 2027: (3% − 2.88%) × £3,510.6bn = £4.2bn in 2029-30, nought in 2030-31                          |
| `upratingGap`    | benefit line × compounding ratio of two uprating paths    | Triple lock to CPI: caseload growth is in both paths, so it cancels                                                |
| `statedProduct`  | published quantities multiplied out, each with its source | The bank surcharge: £1,000m of receipts at 3% × 2 ÷ 3, grown with onshore corporation tax                          |
| `seriesProduct`  | published year series multiplied year by year             | The Defence Investment Plan's £4.7bn spread evenly over four years                                                 |
| `weightedSum`    | published quantities each times a stated factor, added    | VAT off gas: a third of HMRC's £7,000m relief cost, less twice the government's £850m half-year electricity figure |
| scorecard repeat | plus the certified lines                                  | Another compliance package (Budget 2025 line 59); a £1.5m council tax surcharge band (line 54)                     |

All of these are badged **assumption**, never direct, and the badge is the quarantine (ADR-0017): an
assumption sits in the tax or spending group its subject belongs to, beside the HMRC row or Treasury
line it resembles, so the reader sees both badges side by side. Two exceptions are badged Worked out
for a stated reason: business rates is a percentage of the OBR's own receipts line (§6), and
National Insurance on employer pension contributions is a weighted sum of HMRC's own rows with no
judgement in it (§26). The 50% income tax rate, five one-penny steps of HMRC's additional-rate row,
was direct until Phase 13 made it an assumption (§18).

**Kept for the record.** Five policies nobody is considering at this Budget (defence at 5% of GDP,
aid at 0.7%, free tuition, buying the water companies, withdrawing benefits from foreign nationals)
stay in the data with `deprecated: true`, the group "Shelved" and a headline that says so. Their
arithmetic still reproduces in the engine tests; the app offers them on no screen, and an old link
to one decodes with a warning and opens.

Two figures rest on a contested base. Their cards say so, in the headline, before the number: the
wealth tax (live, under Wealth and property), because the Wealth Tax Commission says its own work
"has been constrained by a lack of reliable data on individuals with total wealth above £10 million"
and because the Office for National Statistics publishes nothing above the top 1% threshold of £3.1m
and had that survey's accreditation suspended in 2025; withdrawing benefits from foreign nationals
(kept for the record), because 96.2% of the universal credit caseload is settled here, protected by
the withdrawal agreement or holding indefinite leave, and people subject to immigration control
already have no recourse to public funds.

### Financial transactions

Cash paid for a financial asset is borrowed and carries interest, but it is not expenditure: "there
is no change to overall indebtedness ... Hence there is no expenditure and the transaction has no
impact on PSNB" (ONS, public sector finances methodological guide, 5.1.3). A lever with
`classification.psnflTreatment: 'financialTransaction'` routes its amount to a channel that enters
the debt-interest base and nothing else, so neither borrowing nor net financial liabilities move.
Buying the water companies at Defra's own £100bn therefore costs £100bn of gilts and about £5bn a
year of interest, and leaves the stability rule almost untouched. Free tuition is the mirror: it
converts a loan into a grant, moving money out of a financial transaction and into spending. Both
are kept for the record rather than offered (ADR-0017); the arithmetic stays because the lesson
does.

A schedule may be `once`, paid in the implementation year only, for a purchase rather than a
programme. A spending classification may carry a `capitalShare`, because a defence uplift is not all
day-to-day money: the Spending Review's own settlement is 43% capital, and capital does not count
against the stability rule.

### Budget day readings

Budget day reads the outcome into a set of figures (`readingsWithCauses` in
`packages/engine/src/reactions.ts`): headroom and headroom against the OBR's typical forecast error,
the change in borrowing, the debt path, the tax take, how many Budget 2025 and Autumn Budget 2024
decisions were reversed, the two rule statuses, and, from Phase 9, public spending, capital, tax
rises and cuts, the balance of new revenue between the top and the broad base by incidence tag,
priorities ranked and delivered, manifesto red lines crossed and rules missed. Each reading carries
the decisions behind it, as the levers' own short titles. The Phase 5 reaction bands that read these
figures were replaced in Phase 9 by the reception (§15).

Since Phase 25 (ADR-0026) the readings take the engine re-run (`outcomeOf`) as an input. Borrowing,
cumulative borrowing, debt and the tax take are measured from `preBudget`, today's estimate with
nothing moved, so the economy since March is never the player's doing. New readings: the headroom
change and the debt rule's own headroom; the fiscal rules missed (the day-to-day and debt rules, not
the welfare cap); departments' day-to-day cuts, counted one by one and never netted, with health and
schools apart; the tax rises most households feel and those they do not (`felt` and `notFelt` in
`incidence.json`); whether what the Budget spends and gives away is paid for in every year;
borrowing that comes early; commitments broken outside the manifesto; priorities only started; and
the share of new tax money that arrives late. Each cause carries how far it moved its reading, so a
reason names only the decisions that pushed its way, by the lever's `noun`.

The public's card also carries the distributional considerations of the levers the player moved, in
their own words and with their own citations, ordered by the size of the measure.

## 13. The look (ADR-0009, ADR-0016)

The interface is plain: an off-white page, white cards with hairline rules, one teal accent, the
reader's own sans-serif at 16px with nothing under 14px (as first built; the identity since Phase 20
is in §23), in one light theme: the dark theme went behind a switch and then went altogether on
2026-09-27 (ADR-0016, revised). Phase 6 dressed the game as paperwork on a Treasury desk (ADR-0009);
Phase 11 took the furniture away because it stood between the reader and the numbers (ADR-0016).
Three rules from the desk survive it.

**Badges are never status marks.** The five badge words are the honesty contract's vocabulary. A
rule's verdict is an icon beside a word in a status colour, which the engine computes, and nowhere
else does colour carry a judgement on its own.

**Beats accumulate.** Each step hands you something before the working surface, but moving on never
removes what you have read: source links inside a briefing stay in the document. A hand-off you have
finished with folds to one line rather than disappearing. The beat you are on never reaches the URL,
which means one thing only, a budget.

**Chrome carries no badge.** The guide's words are the only things on screen the engine did not
compute; they quote no figure without a source and wear no badge, because chrome must not borrow the
vocabulary of a costing. (The dateline and the countdown, which used to be the other two, went on
2026-09-27: a player does not need today's date to write a Budget.)

One thing the tab bar costs: a closed group's levers leave the document, so find-in-page no longer
reaches every lever at once. The attribution list beside the groups names every lever you have
moved, which is the question that was actually being asked.

## 14. The game: from ambition to reaction (ADR-0011, ADR-0012)

From Phase 8 the journey is a game in seven steps; Phase 9 (§15) renumbered them so that the
appointment is step 1: the appointment, the outlook, the Prime Minister, the package, the OBR's
forecast and the sums, the rabbit and Budget day. The budget still travels in the query string; the
playthrough travels beside it as `g=` (seed, stage reached, outlook, headroom target, themes,
priorities, delays, whether the envelope is open, the rabbit, an acknowledged breach) and `S=` (the
package as the OBR saw it). Both are absent until a seed is minted, so every older link is byte for
byte the same. The Phase 8 keys for protected promises, concessions, political capital and dropped
priorities (`pp`, `cn`, `cp`, `dp`) are retired: a link that carries them decodes without them
(ADR-0013). (Phase 24, §25: the seed, the outlook, the target, the delays, the envelope, the
add-ons, the acknowledged breach and `S=` are retired too. `g=` now carries the stage reached and
the priorities, and a link with a seed is read through `LEGACY_STAGE`. The outlook, the forecast,
the compromises and the rabbit below describe Phases 8 to 23.)

### The fifth badge

**Simulated** marks a judgement nobody published: what the Prime Minister wants, what a minister
says at a cut, how a market or a household reads the Budget, the kind of Budget it was. A simulated
line may quote a sourced fact and read an engine number and never produces a number of its own. It
is badged per item, forbidden on levers and presets, and distinct from commentary, which is sourced
words about a second-round effect. Roles only: no real person's words are invented.

### The outlook and the target

Stage 1 keeps the four forecast cards (§11) and adds a headroom target: £10bn, £20bn, £30bn or
whatever the rules leave. The target is a plan the game measures the player against, never a rule it
enforces. The £20bn threshold is stated as the advisers' rule of thumb, badged simulated, resting on
sourced facts shown beside it (Budget 2025's £21.7bn, March's £23.6bn, the OBR's typical five-year
receipts error of about £32bn, the Chancellor's letter to the Treasury Committee, the Bank's account
of gilt volatility), because no document publishes it.

### The Prime Minister

Step 3 is a conversation in data (`data/journey/pm.json`): what has already been done, then what
this Budget is for. From Phase 18 (§22) the player ranks up to three of eight priorities, in the
order ticked, and the Prime Minister reacts to each and reads the ranking back with the manifesto
red lines restated; nothing is funded here. The ways to deliver each priority come on the next
screen, costed one by one. The manifesto's promises are detectors over lever values (or, for the
fiscal rules, over the verdicts) with their sources, and they are fixed: every one binds from the
first screen to the last. `ambitionStatus` reports each priority delivered, part-delivered or
undelivered from the states of its options, and each promise kept or broken, with the lever named.

### The package, staffed

Every spending and welfare lever has a minister (`ministers.json`): asking while it is untouched,
saying what stops happening at a cut, making the case for more. The Prime Minister's schemes sit in
a Flagship programmes group on the spending screen, each with a minister of its own (ADR-0017); the
group became the New programmes family in Phase 26, so it does not collide with step 3's flagship
policies (§27). Advisers intervene from a closed list of predicates (`interventions.json`): a
promise broken, a priority undelivered, headroom below the target, a rule missed. From Phase 18 the
package opens on two guided screens (§22) and the desk is a side room behind them: the levers of a
chosen option are pinned to the top of their group wearing the option's name, the summary strip
keeps score, and the Political Adviser's press summary plants the clue the seed chose on the ways to
afford. Leaving the package for the forecast snapshots it.

### The forecast

Stage 4 is the seeded draw of ADR-0012: five outcomes weighted to the centre, each a choice among
published candidates for the sliders, with re-scoring keyed to sourced uncertainty. The page takes
the move apart in three engine runs so economy plus costings equals the whole, shows the re-scored
measures beside their original badges, and says which ambitions are now at risk. `M=` becomes the
OBR's; the outlook step becomes history; the scorecard grows an "OBR in October" reading.

### The compromises and the rabbit

The second screen of step 5 offers three routes, all of them levers, and a fourth only when a rule
is missed: the Director of Tax's three suggestions (from Phase 18 the ways to afford it not yet
chosen, ranked by the engine, red-tagged where they break a manifesto red line), what was chosen to
deliver with a later start year for its lever (`Settings.implementationYearByCode`), half the
distance or dropped, lowering the target, and acknowledging a breach with the Permanent Secretary's
reading of the Charter's escape clause. Step 6 offers eight little add-ons, going further on a
delivered priority, or keeping the headroom, each priced as the headroom it would leave; up to three
go in the speech.

### Budget day

The speech is assembled from fragments (`speech.json`) with every figure read from the outcome and
every title from data; a test checks each pound sign; the opening is the first-ranked priority's.
The reaction is the reception of §15: three audiences, each rated out of five with its reasons, plus
five households touched by stated levers. The close totals the engine's figures by incidence tag,
ranks the compromises against the snapshot, re-runs the final package under all five draws, and
names the kind of Budget from a closed list of badged judgements, with `{priority}` filled from the
ranking.

### What is still not modelled

Growth effects of the player's choices, market reactions as numbers, and anything a real Prime
Minister or minister said that was not fetched and registered. The game has views now; it has no
more numbers than it had before.

## 15. The guided game: plain English, hidden workings, three audiences (ADR-0013)

### The workings switch

Every source link, provenance drawer, breakdown table, expert switch and ready-made Budget sits
behind one "Show workings" switch in the header, off by default and remembered in the browser under
`btc.workings.v1`. The badges stay on show whatever the switch says; the footer says where the
sources went; the methodology and sources pages force the switch on. The contract of §1 is
unchanged: nothing is removed, and the tests run with the switch on so every assertion about a
source still holds. (The switch moved to the footer in Phase 23 and is withdrawn for now: §31.)

### The guide and the glossary

`data/journey/guide.json` gives every screen a step number, a title (the page's heading), and three
plain sentences: what you are doing, why it matters, what to do now, at most sixty words in all.
Words in square brackets are glossary references (`data/journey/glossary.json`). Since Phase 25 a
glossary word is a tap-to-open toggletip: a button that opens the glossary's short line beside the
word and closes on a second tap or Escape, so a phone reaches it as well as a mouse. Both are chrome
and carry no badge; a test forbids a figure in either unless it is sourced. The briefing's words
mark no glossary word since ADR-0031 (§30).

### The appointment

Step 1 briefs the new Chancellor on one screen: the Permanent Secretary on the rules and why they
matter, with headroom and the OBR's typical error as facts; the Chief Economic Adviser on what has
moved since March, with reading chips built from the context file's own figures by the same
`summariseReading` the assumptions table uses; the Political Adviser on a Prime Minister who wants a
Budget people notice and a manifesto that ties your hands, with the red lines listed from `pm.json`,
so the briefing, the levers' warnings and Budget day's judgement can never disagree.

### The warnings on the lever

A lever a red line watches wears a quiet tag that names the promise by its short name, a glossary
word ("Tax lock: no rise"; "Tax lock: keeps its words, strains its spirit" where a move would strain
it), so the line is learnt before it is tested; a crossed line turns the tag red, or amber where the
words are kept and the spirit tested. A lever inside a flagship the player chose wears "In your
flagship policies" while it counts towards it. Trimmed short of the ask, the Chief Secretary to the
Treasury says it is settled lower; moved the other way, it wears a red "Against your flagship
policy" (Phase 25). All are read through `promiseBreaks`, `promiseStrains` and `ambitionStatus`,
pure arithmetic over the package.

### The reception

`receptions` in `packages/engine/src/game/reception.ts` rates the Budget for three audiences. For
each rule of an audience it reads one figure from §12's readings, picks the first authored band
whose `upTo` the figure does not exceed, and takes the band's points. Since Phase 25 (ADR-0026) the
rating starts at three: one or two points either way move it one step, three or more two steps, and
it is then held under any fired band's `cap`. One reason is shown and it always agrees with the
rating: the capping rule when a cap binds, otherwise the biggest minus below three and at three, and
the biggest plus above three. When something pulled the other way, one line of eight words or fewer
names up to two rules by their `short` labels ("Counted against: Tax burden · Uncertified
costings"). Every rule, with its points, its reading, the decisions behind it and its sources, sits
behind "Why this rating (2 for, 1 against)". Every threshold, point and sentence is authored in
`data/journey/reception.json`, badged simulated, and each rule names the published anchor its
thresholds lean on; ADR-0013 records the first table and ADR-0026 the recalibration. A test checks
that every reason on screen is a band in the file with its placeholders filled, that a band quoting
a figure carries a source, that a broken manifesto pins the public at one whatever else happens,
that the shown reason never contradicts the rating, and, by property, that ratings stay in one to
five over random points and caps and over random packages.

## 16. One road, and the revenue menu (ADR-0014, ADR-0015)

### The road

`enterable(step, game)` in the engine says whether a stage may be opened: once the stage before it
has been left, always backwards, Budget day from the rabbit, and with no game only the sandbox (the
package and Budget day). Every page calls `useStageGuard`, which redirects an early arrival to
`furthestStep(game)` with the budget's query string; the progress rail at the top of every page
after the cover (§32) reads the same rule, so a stop is a link only when the guard would let it
through. With a game under way the package is two guided screens (the ways to deliver, the ways to
afford it) with the desk one link behind them (§22); in the sandbox it is the desk's two screens in
sequence (taxes, spending) with a button forward and a link back, and the progress line says which
screen ("Build your Budget · 2 of 2"), as it does for the forecast and the sums. The third screen of
Phase 10, the colleagues' letters, was retired in Phase 12 (ADR-0017). Since Phase 20 the journey
asks no Continues at all: every screen is a decision with one primary button (§23).

### The revenue menu

Every option is a published figure with its published caveat. In the tax groups, direct-badged: the
employer NICs threshold, vehicle excise duty, air passenger duty, tobacco duties, the Business Asset
Disposal Relief rate, abolishing the residence nil-rate band, insurance premium tax, and employer
National Insurance on pension contributions from HMRC's private pension statistics (£14,300m in
2024-25, grown with National Insurance receipts). Beside them, badged assumption (ADR-0017 moved
them from the letters' group into the tax groups): a flat 30% rate of pension relief by the
`weightedSum` method over HMRC's relief by marginal rate, and two repeats of certified Budget 2025
rises (investment income, gambling duties) by the `repeat` direction. Employer-side National
Insurance is not a manifesto red line here, on the government's reading of the lock; the Political
Adviser says on each such lever that the reading is contested. The Director of Tax's suggestions at
the sums rank the ways to afford it not yet chosen, each with its lever's badge (§22); a spending
saving is a cut and belongs to the spending route. The Business Asset Disposal Relief rate and
insurance premium tax are retired in §34.

### The pension extract

`packages/pipeline/src/extract-private-pensions.ts` reads HMRC's Table 6 CSV (every year, totals and
breakdowns) and the tidy Tables 6.1 and 6.2 CSV (the latest year, by marginal rate) into the
relief-extract shape. The three by-rate totals are sums of HMRC's five contribution-type rows and
say so. The validator keys relief extracts by source id, so the tax relief table and the pension
table can both be cited, and reproduces every relief toggle and every weighted sum from them.

## 17. The Budget 2026 menu (ADR-0017)

Phase 12 set the levers against what the reporting ahead of 28 October 2026 says is on the table and
added what was missing, wherever a published figure could carry it. Every addition is a certified
row, an HMRC statistic or a stated calculation on one, and the card says which.

| Code      | Group                     | Badge      | Built from                                                                                                 |
| --------- | ------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `brates`  | Business                  | mechanical | The OBR's business rates line (Table A.5), scaled by a percentage; UK-wide although the rates are devolved |
| `cgtdth`  | Capital gains             | assumption | The Resolution Foundation's £4bn a year for ending the death write-off with an exit charge: an upper bound |
| `hvcts15` | Wealth and property       | assumption | Budget 2025 line 54 repeated as a £1.5m band, set-up costs included                                        |
| `rvapr`   | Wealth and property       | direct     | Autumn Budget 2024 line 29 reversed, grown with the inheritance tax line for 2030-31                       |
| `bank5`   | Business                  | assumption | HMRC's £1.0bn of surcharge receipts at 3%, two thirds more for two points, grown with corporation tax      |
| `epl2`    | Business                  | assumption | Autumn Budget 2024 line 24 repeated, flat in cash for 2030-31                                              |
| `nic4`    | National Insurance        | direct     | HMRC's Class 4 main rate row; the tax lock watches it                                                      |
| `vatgas`  | VAT                       | assumption | A third of HMRC's relief cost less the annualised electricity cut, grown with VAT                          |
| `hmrc2`   | Budget 2025 decisions     | assumption | Budget 2025 line 59 repeated                                                                               |
| `rvplan2` | Spending Review decisions | direct     | Budget 2025 line 48 reversed on the spending side                                                          |
| `def3`    | New programmes            | assumption | (3% − the OBR's defence share) × nominal GDP, nought once the OBR's path reaches 3% in 2030-31             |

The employer threshold slider reaches the £6,000 being floated. The measures the reporting names
that no reachable document costs (a pension lump-sum cap, a social care levy, an ISA cap, holiday
lets into council tax, machine games duty) are not levers, under §1. The letters' screen and its
vocabulary are gone; eleven of its policies sit on the two screens and five are kept for the record
(§12).

## 18. Accessible, brief, and in order (ADR-0018)

Phase 13 reviewed the game against five tests, accessible for all, not too wordy, the Budget
process, realistic options and visible trade-offs, and built the top items under each. Nothing in
the arithmetic changed; what changed is who can reach it and how much they must read to do so.

- **Every screen can be reached.** Titles per screen, focus on the main region after a change of
  screen, a skip link first in the tab order, rule status in words, badges explained on every
  screen, levers as named groups with headings and described controls, the running list as a table,
  every scrolling table a named region, no meaning that lives only in a tooltip, 44px disclosures,
  chart labels 14px at the size they are drawn.
- **Fewer words.** A `SimulatedLine` may carry `short` (at most eighteen words), shown first with
  the full line one click behind; the footer is one line; headroom against the target is said once
  per screen; the compromise routes fit forty words; the glossary has twenty-six terms. Tests hold
  the widest tax tab to 500 visible words and the widest spending tab to 700, every minister line a
  newcomer reads to eighteen words, and Treasury shorthand (RDEL, CDEL, PSNFL, PSNB, AME, accruals,
  forestalling) out of the lines a newcomer reads.
- **The process, in order.** The OBR's forecast arrives in two rounds (the pre-measures forecast,
  then the measures scored); the context file's `decisionsSinceForecast` lists what the government
  has decided since March on its own figures; Budget day names Table 4.1, the forecast and the
  costings; the breach route quotes the Charter's escape clause; the nine department levers carry a
  `commitment`, protected or unprotected, sourced to EFO paragraphs 4.15 to 4.16.
- **Realistic options.** The 50p rate (`it50`) is an assumption: five times HMRC's one-penny row,
  which HMRC calls approximate beyond small changes. A lever may be `notOnTheTable`, worn as a quiet
  tag and sorted to the foot of its group (the six VAT base toggles); every card has "What this
  assumes". The health and social care levy (`hscl`) is a `statedProduct` on HM Treasury's 2021
  figure for the legislated 1.25% levy, £12 billion a year taken as 2024-25 and grown with National
  Insurance receipts; it scores the published rate only, because no registered source costs a higher
  one. (Re-costed in §26; retired in §34.)
- **Trade-offs in view.** Effects are verbs (raises, costs, saves; borrowing up or down); tables say
  worse or better; the package shows who pays and who benefits by the incidence tags, the
  interactions, milestones one click away, and Budget 2025's measures for scale (the net of the
  extracted Table 4.1 in the target year); the compromise screen re-ran the package under every
  forecast the draw could produce (both retired in Phase 24, §25); a reception rule may carry a
  `nudge`, the distance to the next better band in the reading's own unit, filled by the engine from
  an authored sentence.

## 19. The menu against the reporting, again (ADR-0019)

Phase 14 read the Budget reporting of 21 September 2026 against the menu and the unused published
rows in `data/derived/`, and built what could be built honestly.

- **Seven levers.** Keep VAT off electricity after March 2027 (`vatelec`, a `statedProduct` of the
  government's six-month £850 million and a factor of −2, grown with VAT, badged assumption; HMRC
  Notice 701/19 makes the zero rate temporary). National Insurance for workers over state pension
  age (`nicspa`, HMRC relief row `nic-s2`, £1.2 billion static, direct; breaks the tax lock).
  Partnership NICs (`nicllp`, CenTax's £1.9 billion in 2026-27 after behaviour, grown with National
  Insurance, assumption). Aligning capital gains with income tax (`cgtalign`, a `weightedSum` of
  CenTax's £14.3 billion on the 2025-26 base and minus the £2.5 billion the Treasury scored for the
  October 2024 rise, held flat in cash, assumption; every overlapping CGT card warns; retired in
  §34). The CGT lower rate (`cgtl`, three HMRC rows, direct, which score a ten-point rise as a
  loss). A charge on people who leave (`cgtexit`, CenTax's floor of £500 million, flat, assumption).
  Charging main homes (`cgtprr`, HMRC's £32.9 billion static relief cost, direct, tagged not on the
  table because what is floated is a cap above a value nobody has published).
- **Two tabs.** Capital taxes is now Capital gains and Wealth and property (tax by tax since §34),
  so the widest tab stays under the 500-word budget.
- **Words only.** The £1.5m band's reported home counts, the warehouse rates surcharge and online
  sales levy, the flat 10% estate levy and the pension lump-sum cap are named on the cards and in
  the briefings from registered press entries that say they carry words, not numbers. Machine games
  duty is reported and uncosted and appears nowhere but the decision record.
- **The Director of Tax** never suggests a `notOnTheTable` lever.
- **Readings as of 22 September 2026**: the 10-year gilt at 5.29%, borrowing to August £77.3 billion
  against a £69.2 billion profile, the Resolution Foundation's £10 billion headroom estimate quoted
  beside the advisers' rule of thumb.

The 23 September revision (ADR-0019) read an FT survey of the options in full and added relief at
the basic rate on pension contributions (`pens20`, a `weightedSum` of half the higher-rate relief
and five ninths of the additional-rate relief in HMRC's 2024-25 breakdown, grown with income tax)
and a doubled bank levy (`banklevy`, HMRC's £1.3 billion of 2024-25 receipts once more, grown with
corporation tax), both static and badged assumption; the £1.5m surcharge card now quotes Tax Policy
Associates' yield for the threshold beside its own equal-yield assumption.

## 20. The think tanks' lists (ADR-0020)

Phase 16 read the think tanks' proposals for the 28 October Budget (the Resolution Foundation, IPPR,
CenTax, the Joseph Rowntree Foundation, Tax Justice UK, the IFS Green Budget, Demos, the Centre for
Social Justice, the Adam Smith Institute, Onward) from their own documents and built nineteen cards,
every one a stated figure from the primary source, badged assumption.

- **One method for all of them.** Each card is a `statedProduct` (one published figure) or a
  `weightedSum` (a gross figure less what the same document reinvests, or less a certified line
  already scored), held flat in cash from the start year unless the card says what it grows with.
  `validate:data` reproduces every effect from the quoted term; a tampered figure fails.
- **Cautious where the source hedges.** An "up to" figure is scored at the lower published number
  (the 2% wealth tax at Tax Policy Associates' £18.5 billion, the reserves levy at IPPR's £5 billion
  floor, the child DLA assessment at the CSJ's lower bound) and the ceiling is named in words.
  Static figures say so and carry `static-not-yield`.
- **The alignment card re-costed.** CenTax's September 2026 figure, £19.7 billion in 2029-30 after
  behaviour on the OBR's current forecast, replaces the 2024 estimate net of the 2024 rise. (Retired
  in §34.)
- **The lock.** Rental NICs (retired in §34), abolishing the upper earnings limit and a 1% rate on
  zero-rated goods break the tax lock on the game's reading; a smoothed earnings link breaks the
  triple lock. The legal consideration on each card says the proposers read it the other way.
- **Two welfare tabs.** Working-age benefits and Pensioners and disability, so six more welfare
  cards fit inside the 700-word budget; every card has a minister whose figures are sourced.
- **Grown, netted, placed.** Where a step is ours it is on the card: JRF's first-year cost grown
  with the OBR's universal credit line, the Adam Smith Institute's four-year average placed in
  2027-28 and grown with property transaction taxes, HMRC's Motability relief row less the Budget
  2025 line on the same scheme.

## 21. Nothing before it can start (ADR-0021)

A measure that needs a new Act, a valuation regime, HMRC systems or the expiry of transitional
protections cannot take effect from the first April after the Budget, however the game's start year
is set. A lever may therefore carry `earliestStart: { year, text, sources }`, and the engine's start
year for that lever is the latest of the game's start year, the player's delay and that floor.
Nothing is counted before it; a player can delay a measure past its floor, never bring it forward.

- **The year is the source's, scored cautiously.** Tax Policy Associates expects an annual wealth
  tax announced at this Budget to apply first in 2029-30 and be paid in January 2031, so the wealth
  cards start in 2030-31, the year the cash arrives, as the OBR scores taxes paid the January after
  their tax year. The soft drinks levy (Budget 2016 to April 2018) and the digital services tax
  (Budget 2018 to April 2020) are the registered precedents for a new tax; the proposers' own dates
  ("by 2029/30", "in the long run, after any transitional protections are exhausted") set the
  welfare cards.
- **Payment timing counts too.** Capital gains tax on a year's gains is paid by 31 January after the
  tax year, and the OBR scores the cash when it arrives: Autumn Budget 2024 Table 5.1 line 27 scored
  the October 2024 rate rise at £90m in 2024-25 and £1,440m in 2025-26. The three think-tank capital
  gains cards (alignment with income tax, the charge at death, the charge on leavers) start in
  2028-29 for that reason; HMRC's ready-reckoner rows on the two certified capital gains cards
  already carry the lag inside their published years and need nothing.
- **The arithmetic is untouched.** The effect map stays as the method reproduces it and the early
  years are zeroed at run time. Set-up costs stay in words.
- **The card says so**: an "Earliest start" tag, the reason under "What this assumes", the year in
  the headline, and "nothing yet; from 2030-31 raises £18.5bn" where the target year sees nothing.
  The running list and the Budget-day table add "from 2030-31" beside the £0.0bn; the Director of
  Tax and the OBR's re-scored table leave such a measure out.

## 22. Advice and direction (ADR-0022)

The middle of the game is guided. After the outlook the Chancellor ranks up to three of eight
priorities with the Prime Minister, then meets two screens of costed options before the desk: the
ways to deliver each priority, proposed by the minister or adviser who leads on it, and the ways to
afford it, grouped by who pays. The desk of every lever is one link away from either screen and is
never the default while a game is under way.

- **An option is a bundle of the game's own levers** (`data/journey/options.json`: 29 ways to
  deliver, 26 ways to afford, 8 add-ons), one or two levers at stated values, none of them the
  default. No lever appears in more than one option anywhere (revised 2026-09-26: the add-ons used
  to share levers with the ways to deliver), so no screen can light or undo another's option.
  Choosing an option moves its levers; putting it back restores their defaults.
- **Two options that count the same money cannot both be chosen.** An option may name the options it
  conflicts with, each pair authored once with the reason in the levers' own words (defence at 3%
  now and the Investment Plan gap; two PIP reforms on one caseload; the CGT package and the charge
  at death; a fuel duty cut and the restored uprating). While one is in the Budget the other's card
  is blocked and reads "Instead of {other}" with the reason; with both in from the desk, both cards
  warn and either can be put back. Softer overlaps are the levers' authored interactions, read from
  either side: a card says "Overlaps with {other}" before either is chosen and quotes the
  interaction once the other has moved. The compromise step never suggests a blocked option.
- **Whether an option is on is read from the levers**, never stored: on when every lever is at or
  beyond the option's value in its direction, adjusted when some lever has moved but not to there,
  off otherwise. The desk and the guided screens therefore never disagree, a lever fine-tuned on the
  desk shows on its card as "Adjusted on the desk", and a shared link needs no new key.
- **Every card is priced against the Budget as it stands** (revised 2026-09-26; each used to be
  priced on its own): the engine re-run with the option's move made on top of everything else
  chosen, under the game's own conditions, read as "Raises £9.9bn · leaves £14.2bn", "Costs £2.2bn ·
  leaves £4.5bn", "Saves £4.5bn", "Borrowing up £13.4bn; the current budget is unchanged" for
  investment, or "Nothing until 2030-31, then raises £18.5bn" for a measure that cannot start before
  the target year (§21). "Leaves" is the headroom the strip will show once the option is ticked,
  debt-interest feedback included; an option already on says instead what the Budget would have
  "without it". The year is said once per screen. The card also carries the badges of the costings
  behind it, the manifesto red line it would cross and its earliest start.
- **The compromise step reads the same options**: the Director of Tax's suggestions are the ways to
  afford it not yet chosen, ranked by the headroom each buys; the spending route lists what was
  chosen to deliver, each with a later start, half the distance or dropped. The add-ons are eight
  small costed announcements on levers no other option moves, up to three in the speech, each priced
  like every other card against the Budget as it stands, the other add-ons included.
- **The words are the advisers' and the ministers'**, simulated, sourced and shown short first; the
  figures are the engine's. Priorities replace themes in the speech, the reception and the verdict,
  and an old link's `th` values map to the priorities that took their place.

## 23. The Westminster journey (ADR-0023)

Phase 20 redesigned the presentation and the road without touching the engine, the data's numbers or
the state. The seven steps are the ones the player is told: become Chancellor, your starting
position, set your priorities, build your Budget, respond to the forecast, final choices, what your
Budget means. (From Phase 24 the road is six steps, §25: the forecast, the compromises and the
add-ons are gone, and the bar has no target. The rules below still hold on every screen.) The rules
that hold every screen to the same shape:

- **One screen, one decision, one primary button.** The hand-off beats and their Continues are gone
  (the `beats` module with them); the desk's briefing sits folded at its head. The progress line
  says "Step n of 7", names the step, and counts a step's screens ("Build your Budget · 2 of 4"); a
  side room off the road, the desk, is named on the line rather than counted.
- **No tab on the main road.** Step 4 is one screen per ranked priority (`/budget/deliver`,
  `/budget/deliver/2`, `/budget/deliver/3`) and then one screen to pay for it, the five who-pays
  groups stacked with a running total in each heading, the first three ways of each group on show
  and the rest under "n more ways". The desk keeps its tablist and is reached only through "More
  policies", carrying in the router's state the exact screen to return to.
- **The state is the link.** Nothing new is stored: going back, the progress line's links and the
  review's "Change" links all land on a screen with every choice intact, because the Budget lives in
  the query string (§10). `/review` is an alias of the rabbit stage, so no `st.` index moved and
  every shared link still decodes. Arriving on Budget day marks the game finished.
- **Detail expands in place.** "More policies", "The morning papers", the stress test, "Read the
  speech", "Who feels it" and "Budget documents" are `details` elements, closed on arrival,
  keyboard-openable, and they never hold a badge or a figure the visible screen relies on. ("Why
  this matters", the guide's reasons and glossary list, went on 2026-09-27: the guide says what to
  do, and the two words a newcomer must know are explained where they are used. "See the numbers"
  and "Why about £20bn?" went the same day: the starting position says in words what has been
  promised since March and what has cut the headroom, asks its two questions outright and explains
  headroom under "What is headroom?"; the sliders and the forecast's tables sit behind the Show
  workings switch; the priorities screen writes the theme of the Budget from the ranking in place of
  the Prime Minister's opening lines.)
- **The score stays in view.** A slim sticky bar on the building, compromise, add-on and review
  screens reads the engine's headroom in the target year against the margin the player set, the
  priorities delivered, the promises kept and the rules met; a card's "leaves £X" is the figure the
  bar shows once the card is ticked, to the pound.
- **The compromises follow the headroom, one question a screen.** Short of the margin the player set
  out to keep, or with a rule missed, the three screens are the sums: "Will you raise more tax?"
  (the ways to pay not yet chosen, ranked by yield), "Will you spend less, or later?" (what was
  chosen to deliver, each with a later start, half the distance or dropped, and who feels it) and
  "Will you keep less headroom?" (the target, and, only when a rule is missed, borrow and say so).
  With room to spare and every rule met they are "Will you do more for your priorities?" (the ways
  to deliver the ranked priorities not yet chosen: `deliverSuggestions`, the first open way of each
  priority in rank order, then the second of each, a way blocked by one already in the Budget
  skipped, each priced against the Budget as it stands with the headroom it would leave), "Will you
  ease off a tax rise?" (the ways to pay already chosen, each with what dropping it would leave) and
  "Will you keep the extra headroom?" (the target, with the Chief Economic Adviser's case for
  keeping the margin). Taxes before spending in the sums (Phase 23); the headings carry no figure,
  because the bar above them says the gap. The forecast's button says which mood follows ("Respond
  to it" or "Make the most of it"), and the mood is read again on every screen as the headroom
  moves: ease off the only tax rise on the second screen and the second screen of the sums is in its
  place.
- **Half the words (ADR-0023, revised 2026-09-27).** Every screen of the road is one heading, one
  line of at most ten words, the choices and one button. One adviser or minister speaks on a screen,
  in a short form of at most fourteen words, and every other simulated line folds (from Phase 23
  each option card carries its adviser's line instead, and no voice sits at the top of those
  screens; §24); a card is its title, badge and figure, with the lever's headline and the proposer's
  line behind "More about this"; the bar says the headroom, the year and the target once, and a
  broken promise or a missed rule only when there is one; on Budget day each audience shows its
  rating and its strongest reason with the rest behind "Why this rating", and the close its kind in
  one sentence with the rest behind "The close in full". Every cut line keeps its badge and its
  sources where it shows. The budgets test measures each screen with the folds closed and pins it;
  the words test checks every short form against its limit.
- **The Budget in three sentences.** Budget day opens with what was prioritised (the priorities'
  nouns), who pays (the largest payers by the incidence tags) and what was accepted, in this order
  of weight: a rule missed, a promise broken, a target not kept, a measure moved after the forecast.
  Every clause is read from the engine or the player's own choices and the card wears the mechanical
  badge; the reactions and the close beneath it are unchanged.
- **Identity.** Commons green (`--accent`), warm paper, charcoal ink, restrained brass, Budget red
  for the one button that delivers and for the Budget box on the opening (gone in §31, drawn afresh
  in §32); the page set like an official paper (ADR-0023, revised): Source Serif 4 (self-hosted,
  OFL) for the body and Fraunces (self-hosted, OFL) for the headings, the three sentences and the
  step numerals; hairline rules instead of boxed cards, square corners, small-capital labels instead
  of pills, a paper header under a green rule, and seven numerals on a rule for the road. Every text
  pairing holds 4.5:1 (re-audited after the change: the badge inks sit at 6.3:1 or better on the
  paper, green at 6.2:1, brass ink and the muted numerals at 5.6:1), every control 44px, and the
  reduced-motion rule stands.
- **Word budgets, measured then pinned** (`apps/web/src/journey/budgets.test.tsx`): visible words
  with the folds closed, the road and the footer left out, on 2026-09-26: the opening 60, the
  starting position 267, the priorities 192, a priority screen 244 to 316, paying for it 564, the
  forecast 126, the sums 302, the add-ons 391, the review 121, Budget day 529; each pinned with
  about a tenth to spare. The playtime estimate (ADR-0023) reads the same screens at 200 words a
  minute plus ten seconds a decision and three a screen change, once for everything visible (18
  minutes) and once for the skim a decision needs (11½ minutes); it is an estimate from the rendered
  screens, not user testing.

## 24. Plain words, real questions, a guided repair (ADR-0024)

- **The content rules.** A screen that asks for a choice asks it as a question, in the second
  person, and the answer is the button. No sentence a player meets with the folds closed runs past
  twenty words; everyday words for things, a term of art only where it is the name of the thing and
  then explained in place. An option is named for what it does ("Put a penny on the basic rate of
  income tax"). Nothing is for the player to discover: the fact a screen turns on is on the screen,
  and folds hold detail, never the point. The badges read Official figure, Worked out, Assumption,
  Commentary and Game judgement; their meanings and the honesty contract are unchanged.
- **The chrome.** The header is the name of the game and the two reference pages; the footer is the
  utility row (one line on the figures, the Show workings switch, the way to every lever, Sources
  and licence, what the badges mean). The dark theme, the dateline and the countdown are gone.
  (Since §31 the header is the name alone; since §32 the footer is one link.) The guide is a heading
  and one line per step.
- **The starting position** briefs in three figures and one line on the rules, with the Charter's
  words one fold away; says what has been promised since March and, honestly, what has cut the
  headroom (dearer borrowing and higher inflation; the three promises moved money); asks two
  questions outright, which forecast to plan on and how much headroom to keep, with "What is
  headroom?" beneath. The sliders and the readings table are workings.
- **The theme** of the Budget is written from the ranking by a pure helper ("A Budget for defence
  and the cost of living") for the Comms team and the advisers, in place of the Prime Minister's
  opening lines.
- **Every option** has a plain title and one adviser's line of at most twelve words, badged Game
  judgement and sourced, saying who proposed it and one judgement of cost and effect; a size word is
  tested against the engine's own figure for the option (big at £5bn or more, small at £1bn or less)
  and no line carries a figure. No adviser speaks at the top of an option screen.
- **Amber.** A promise's `strains` list names the levers that keep its words and test its spirit
  (the employer-side National Insurance levers and the new 50p rate; the health and social care levy
  until it was retired, §34). The engine reports strains beside breaks all the way to the verdict;
  the cards and the desk show an amber tag; the reception loses a point for a strain without pinning
  the public at the floor. `rebellionRisk` weighs breaks only, a recorded follow-up.
- **The compromises** are three screens, one question each, taxes first (§23 above): raise more tax,
  spend less or later, keep less headroom; or, with room to spare, do more for the priorities, ease
  off a tax rise, keep the extra headroom. The mood is read again on every screen.
- **The readability test** (`apps/web/src/journey/readability.test.ts`) reads fifteen sets of words
  a player meets with the folds closed and holds every sentence to twenty words and every set to a
  Flesch-Kincaid grade of seven or below (measured between about 1 and about 7, ADR-0024). The words
  test's jargon rule gained the words of the trade (outturn, consequentials, fiscal mandate,
  deleveraging, uprating, incidence) and reads every visible set; every reception band is twenty
  words or fewer. Word budgets and the playtime estimate are re-measured and recorded in ADR-0024
  (about ten minutes, an estimate, not user testing).
- **Revised by Phase 24 (§25).** The starting position's two questions went with the forecast guess,
  and the three compromise screens with the reveal; the sums are made on step 4's two fine-tuning
  screens, taxes first and then spending. The readability test reads twelve sets.

## 25. One estimate, six steps, curated levers (ADR-0025)

- **One estimate.** Every game plans on one figure: the headroom on today's estimate, the OBR's
  March forecast brought up to date for today's borrowing costs and prices with the OBR's own
  sensitivities. The settings come from the `gap` rule (§11): the 10-year gilt yield at 5.29%
  against the OBR's 4.5% gives rates +0.75; RPI from the August 2026 comparison, 3.3% against the
  OBR's 2.8% on average over 2026 to 2030, gives +0.5; growth stays on the OBR's path (the authored
  rule). That leaves £6.8bn of headroom on the stability rule in 2029-30, against £23.6bn in March,
  badged Assumption. The briefing says why the headroom fell: the three promises made since March
  moved money, and dearer borrowing and higher inflation cut the margin. Nothing is chosen on the
  briefing; the estimate is fixed for the game, and a sandbox can still set its own economy on the
  desk.
- **No target.** The rules are the line. The bar reads "rules met" or names the rule missed. The
  markets' own headroom bands mark a thin margin (under £10bn) and an ample one (£20bn or more,
  "cautious"); the two thresholds are exported by the engine and a test pins them to the bands.
- **Six steps.** Briefing (the cover, then the briefing), Set your priorities, Flagship policies
  (one screen per ranked priority), Fine-tune tax and spend (two screens), Deliver the Budget (the
  review and the red button), Feedback (Budget day). The desk of every lever is step 4's side room.
- **Curated levers.** `data/journey/finetune.json` hand-picks twenty-six taxes in five who-pays
  groups and nineteen spending levers in four groups, each with a plain title, an adviser's line and
  the move that line judges. The validator checks each lever is live, on its own side, once; each
  move reachable and not where the lever rests; each tax in the who-pays group its incidence tag
  names; the adviser speaking on this step. At rest a card says what its move would do against the
  Budget as it stands and the headroom that would leave; moved, it shows the lever's own effect. The
  first three levers of a group are on show with any moved before arrival; a lever moved inside the
  fold stays there until the next visit. (Since §34 the taxes go tax by tax, and a tax's section is
  its family.)
- **Retired.** The forecast cards and targets, the seeded draw and its re-scoring (ADR-0012), the
  compromise screens, the add-ons, the ways to pay as option cards, and the snapshot. Old links
  still open: a link carrying a seed is read through `LEGACY_STAGE` (the forecast opens fine-tuning;
  the compromises and the add-ons open the review), its retired items are ignored, and its economy
  is replaced by the estimate with a warning on the desk. The retired routes redirect with the query
  kept.
- **Measured** (ADR-0025): word budgets from 27 words (the cover) to 711 (fine-tuning tax with a
  folded lever moved in every group); readability grades from 3.2 to 6.7; playtime nine screens and
  eight decisions, about nine minutes at the midpoint, an estimate and not user testing.

## 26. A review against four goals, and the fixes (ADR-0026)

Phase 25 reviewed the Phase 24 game against four goals the user set: that it reflects how a Budget
is made, that most of the British electorate can understand it, that it shows trade-offs and makes
the player think in the round, and that its feedback shows a Budget's pros and cons. Ten reviewers
and a completeness critic found 108 findings that survived two independent checks. The fixes, in
nine commits:

- **Prices.** Ten relief-cost levers read "raises at most". Two costings are stated arithmetic,
  badged Worked out: National Insurance on employer pension contributions counts the private
  sector's part only, HMRC's £14.3bn less its £6.5bn on public sector schemes, times 15 ÷ 13.8,
  grown with nominal GDP (about £10.1bn in 2029-30, where it read £20.0bn); the levy is 1.25 times
  the game's own one-point NICs rows (about £26bn, where it read £16.8bn). A fuel duty freeze toggle
  (HMRC's 1% rows times the April 2027 rise the baseline plans); keeping VAT off electricity on the
  curated tax screen; `excludes` pairs (§6).
- **One price.** `optionPrice` gives a choice's change to the bar's headroom in the target year,
  interest included, and the card, the review, the speech and the close all read it. A move made
  only of investment is priced on the debt rule. `reconcile` takes the headroom from the estimate to
  the bar through taxes, day-to-day spending and interest, exactly, and the review says so in one
  line.
- **Graded delivery.** Each flagship way says whether it delivers its priority in full or makes a
  start, with a sourced reason (Game judgement): 19 in full, 10 a start. A priority is delivered,
  settled lower, started or not funded, and the bar reads "1 of 2 priorities delivered · 1 started".
  Only a full delivery scores with the public.
- **The audiences** read from before the Budget, see cuts one by one, count felt taxes, hold at one
  (markets) or three (the others) when a rule is missed, and rate on the scale of §15. The card
  shows one reason that agrees with its rating and a counted line for the other side.
- **Budget day.** The three sentences, the close and the speech are built from the engine's figures
  and the player's choices (`statement.ts`, `verdict.ts`, `speech.ts`); a consistency test runs
  seven Budgets through them. The speech owns the forecast; the Leader of the Opposition replies in
  one line with no figure.
- **The briefing** says what headroom means, its year, about £240 for each household (Worked out)
  and the advisers' yardstick in words (Game judgement, scored by nothing). "Already on your desk"
  lists the defence plan's last £4.7bn and the electricity VAT cut ending in March 2027. A glossary
  word opens by tap or keyboard. (Phase 28 set the briefing in three parts: §29; ADR-0031 made it
  plain copy: §30.)
- **Step 4** shows one figure line on a resting card, in the conditional and in plain ink, growth in
  words, and sliders held to the 2p their sources vouch for (`sourceRange`; the desk goes on, badged
  Worked out past it). England-only budgets are said once a screen, with Scotland's own income tax
  and benefits noted where they apply.
- **Households** name the groups whose levers reach them (`exposure`) and say "Nothing aimed at us
  by name that we could see" rather than "untouched" when a measure in those groups moved. **The
  Prime Minister** signs off the review in one line, first match: a rule missed, a promise broken
  with room to spare (worked out by putting the breaking levers back), a promise broken, a scored
  strain. **The markets' fold** says what the biggest measure may do to growth (a `growth` note,
  macro only) and, worked out, what extra borrowing adds to debt interest. A 0-point band marks new
  tax money that arrives late. Climate is said where a registered source says it: fuel duty, air
  passenger duty, car tax. The priorities screen gives the scale of one priority in full before
  anything is chosen.
- **The bar** announces what changed, once a slider settles, through one polite status region, and
  while it is sticky the page's scroll padding keeps a focused control clear of it.

**What it did not do.** Step 4 is still about 7.7 phone screens tall; fewer cards on show at rest
would be needed for two or three. Borrowing past the rules still rates above a felt tax rise with
the backbenchers and the public, though never above paying from the top, and always below paying
with the markets. ADR-0026 has the before-and-after ratings of sixteen Budgets, the word budgets,
the readability grades (sixteen sets, all at grade seven or below), the playtime (about ten and a
half minutes at the midpoint, from about nine) and the walk.

## 27. Policies all the way through (ADR-0027)

Phase 26 made every choice in the game a policy: a tick, or a size. The user asked for no sliders,
and for a policy to come in small, medium and large where a size makes sense.

- **Every lever on step 4.** All 108 policy levers are on the two fine-tuning screens, 76 taxes in
  the five who-pays groups and 32 spending levers in four, as 141 policies. A lever that moves both
  ways has one policy each way, the way that improves the public finances first; its other way waits
  in the group's fold, and choosing one clears the other. The hand-picked levers keep their places
  on show; the rest are one fold away, under their family ("Income tax", "VAT"), and a fold's cards
  mount only while it is open. Since §34 the tax screen goes tax by tax, 67 taxes in eleven
  sections, and a tax is one scale; the spending screen kept both ways until §36 put it in decisions
  too, each budget one scale.
- **Sizes** (`finetune.json`) are settings of the lever, checked by the validator: in range, on its
  steps, all one way. Small is the usual step, medium twice it, large five times it, capped at the
  range; where HMRC publishes points the sizes sit on them. VAT's range reaches +5 points, so
  putting it up reads 21%, 22% and 25%. A size past the range its source vouches for is
  straight-line arithmetic on HMRC's row, badged Worked out with its caveat.
- **The card** (a row in its decision’s one card since §36) prices its smallest size at rest, in the
  conditional, and the lever's own effect once chosen. A lever a chosen flagship holds shows once,
  as a line with the way back to change the flagship, so step 4 never undoes one silently.
- **Pick one.** Where two levers' own texts say they count the same money or cancel, the pair is
  `excludes`: 22 pairs (fifteen since §34, seventeen since §35), each authored once, read from
  either card, with a one-tap swap; since §35, one choice among radios in a decision, or a line
  saying what choosing takes out.
- **What went**: the desk and its sandbox, the ready-made Budgets, the two expert switches (every
  Budget counts the interest on its own borrowing, §5, and is judged by the rules as they stand),
  the levers' `order`, the desk's briefings and its two step names. A link with measures and no game
  opens the briefing and starts the game with them; what a link could not carry is said once, on the
  screen it opens. The desk's old addresses open the step-4 screen that took their levers.
- **Measured** (ADR-0027): step 4 on a phone is 6,010px for tax and 5,874px for spending, 7.7 and
  7.5 screens; the fine-tuning screens read at grade 5.7; the playtime estimate is about ten and a
  half minutes at the midpoint, as before.

## 28. Basic and advanced (ADR-0028)

Phase 27 gave the game two modes. A first game is played in basic mode, which suggests only the best
ideas; advanced mode is the whole game. The user asked for it: "Default to a basic mode, they can
then go to an advanced mode if they'd like. Basic mode, only suggest the best ideas."

- **The shortlist is a judgement**, and says so: each screen's adviser picks a few ideas, badged
  Game judgement, and each pick's reason is its own sourced adviser line. Step 4 picks eight taxes
  of ninety-five (still eight, two of them new, since §34) and seven spending policies of forty-six;
  step 3 picks one or two ways to deliver each priority, thirteen of twenty-nine (`shortlist: true`
  in `finetune.json` and `options.json`).
- **The rules make it checkable.** A pick moves 2029-30 headroom by at least £1bn at its smallest
  size on today's estimate, priced as its card prices it (a test, since it needs the engine); counts
  by 2029-30; is on the table; breaks no promise at any size (a strain is allowed, and shown); and
  never counts the same money as another pick or a lever already on the desk. Step 4 picks one way
  per lever, six to ten a screen, one in every group (every spending group since §34); step 3 one or
  two a priority, at least one in full. `validate:data` names each way a pick can break a rule.
- **The desk rule.** The levers on the desk (keeping VAT off electricity, the defence plan's gap)
  are always on show in basic mode, so nothing that names them points at something hidden: the
  briefing did until ADR-0031, and the review still lists the ones a Budget leaves. They are not
  picks.
- **What basic mode shows.** Step 4: the picks, all on show with no decisions to open (since §36 one
  card a section, the details in one fold). Step 3: the picks and a way that moves a lever on the
  desk. The briefing: the headroom and what it means, the yardstick, the rules in one line and the
  desk; the explanations wait for advanced mode (Phase 28 puts them in both modes: §29; ADR-0031
  makes the briefing the same in both: §30). On every trimmed screen one button swaps the modes and
  keeps its focus.
- **Nothing chosen hides, and nothing is uncounted.** A screen shows whatever was chosen when it
  opened or when the mode last changed. The bar, the review, the priorities' price line and Budget
  day read every idea in either mode.
- **The mode is the viewer's**, remembered in the browser and never in a link; "Advanced mode" sat
  in the footer beside "Show workings", and neither moved the other, until both switches were
  withdrawn for now (§31); the screens' own buttons change the mode.
- **Measured** (ADR-0028): step 4 on a phone is 3,704px for tax and 4,263px for spending in basic
  mode, against 6,066px and 5,930px in advanced; a first game in basic mode is an estimated 8½
  minutes at the midpoint, against 10½ in advanced, so the cover said "About 9 minutes" (until §31).

## 29. The briefing in three parts (ADR-0030)

Phase 28 set the briefing out as the user asked, in three parts and in both modes: your headroom,
what headroom is, and how it is calculated. "Already on your desk" followed, until ADR-0031 (§30).
The same day the user rewrote its words; what follows is the page as it then read (ADR-0030's
revision), before the plain copy of §30. Its line under the heading: "The headroom you have to play
with, and the rules you need to meet to keep markets onside."

- **Your headroom.** Today's estimate, "You start with £6.8bn of breathing space in 2029-30"
  (Assumption), and the OBR's record: "Since 2010, Chancellors have kept about £29bn on average"
  (Official figure; the November 2025 outlook, paragraphs 7.6 and 7.11, with past margins put in
  today's terms by the OBR's own rescaling in Chart 7.3). Then why: "This builds in some safety for
  adverse economic impact" (Commentary: the same outlook, paragraph 1.30, and the Chancellor's
  letter to the Treasury Committee). Then what reaching the record would take: "This means this
  Budget will need to find around £22bn to build in a sensible buffer" (Game judgement). The £22bn
  is the record less the estimate, filled from the data; the line goes should a rebase put the
  estimate above the record. On 2026-09-30 the line was softened, in the user's words, and names no
  figure now (§30).
- **What headroom is.** The two rules in one line; what headroom is; and one paragraph on what the
  government plans to sell to lenders this year, £246bn of gilts (Official figure: HM Treasury's
  revision of the Debt Management Office's remit, April 2026, paragraph 2.3), said as funding its
  borrowing and repaying old gilts, since gilt sales are gross financing, not borrowing, and why
  lenders care, in words with their sources (Commentary). Each part of the paragraph wears its own
  badge.
- **How it is calculated.** First in words: "Since March, interest rates and inflation have been
  higher than expected. This means the government is paying more money to borrow, and paying more on
  debt linked to inflation." Debt, not spending: the inflation row is the OBR's RPI sensitivity,
  which the OBR ties to debt interest on index-linked gilts (the March 2026 outlook, paragraph 4.27
  and Table 4.8), while benefits rise with CPI, which the estimate does not move. The line's sources
  are the gilt yield and prices against what the OBR assumed, and that paragraph. Then the rows.
  `fromForecast` reads the estimate's outcome: the March forecast's own headroom (the vintage's,
  checked against the OBR's Table 5.1; Official figure), then each economic setting's attribution
  row turned into a change of headroom (Assumption: the setting is ours, the sensitivity the OBR's),
  coming to the estimate exactly. On today's data: £23.6bn, less £11.3bn for higher interest rates
  and £5.5bn for higher inflation, is £6.8bn, and the rounded rows add up as shown. Each step is
  named by the way its setting moved. The first row's "OBR's" opens the OBR's full name, since a
  basic page names the OBR first there. Nothing is scored against the buffer line or anything else
  here; the £10bn line stays the markets' thin line on Budget day and the review's yardstick.
- **Advanced mode** added three folds, until ADR-0031 (§30): the rules in the Charter's words; what
  changed since March (the gilt yield and prices against what the OBR assumed, and the three
  decisions each paid for by moving money); and why forecasts move (the Chief Economic Adviser's
  note, with estimates on both sides).
- **The figures are data, the words templates.** The context file's `briefing` object holds the two
  published figures, each with its paragraph, page and quote; `validate:data` refuses a figure
  without a quote, and gilt sales for any year but the one the context is dated in (`fyOfDate`). The
  words are in `briefingWords.ts`, with glossary marks and placeholders and no figure typed in; the
  readability test reads them (grade 5.1). The line under the heading is the guide's, and the
  briefing's alone may run to eighteen words.
- **What went**: the heading "The Treasury's briefing", the source line, what the headroom comes to
  for each household, the "Since March" section (now a fold) and the advisers' £20bn sentence; then,
  in the user's rewrite, the advice to keep more than £10bn and the rules line's second sentence.
  The yardstick is the review's alone.
- **Measured** (ADR-0030): 205 words in either mode, against 159 in basic mode and 237 in advanced;
  on a phone, 2.6 screens of 780px in basic mode and 2.7 in advanced. In the user's words: 232 in
  either mode, and 2.7 and 2.9 screens.

## 30. The briefing as plain copy (ADR-0031)

Later on the same day the user asked for a plainer briefing: no badges, no dotted words that open a
definition, "The debt rule" in place of "About the fiscal rules", and without the folds on March and
on forecasts, "Already on your desk" and the line that switched to the short briefing. The request
is read as the briefing's alone; every other screen is as it was.

- **The badges wait for the workings.** On the briefing a badge shows only with Show workings on,
  beside its sources, exactly as before; with the switch off the page is plain copy, and its words
  say which figure is the OBR's and which is ours. The contract is unchanged: every figure is still
  an official number or a stated calculation, one switch away from its badge and its source. (The
  switch is withdrawn for now: §31.)
- **No word opens a definition.** The briefing's words carry no glossary marks, and a test fails on
  one. The glossary and its toggletips elsewhere (the manifesto, the tax lock and the rest) are
  unchanged. The OBR's name is no longer a tap away in the first row.
- **The debt rule**, a fold under the rules line in both modes, and since 2026-09-30 a paragraph of
  the running text straight after the rules line, in plain type and opening with which of the two
  rules it is: "The second rule is the debt rule. Government debt must be a smaller share of the
  economy in 2029-30 than the year before. Critically, this includes any borrowing for investment as
  well as day-to-day spending." The user wrote "in 5 years or end of parliament"; the line gives the
  rule's own target year from the verdict, which the Charter sets as 2029-30 until that is the
  forecast's third year, then the third year (paragraph 3.7), and "than the year before" is the
  rules file's plain English for "falling". With the workings on, it quotes the Charter.
- **What went.** The folds on what changed since March and on why forecasts move: the calculation's
  opening line and rows carry the first, and the OBR's typical error the second, on Budget day. The
  three decisions since March stay in the context file but on no screen, and the readability set
  that read them went. "Already on your desk": the review still lists what a Budget leaves on it, so
  basic mode's desk rule stands. The line that switched the briefing: it is the same in both modes.
- **A softer buffer line** (2026-09-30), in the user's words: "This means this Budget will likely
  need to increase the headroom to build in a sensible buffer." It names no figure, so the £22bn,
  the record less the estimate, is gone from the page; it keeps its Game judgement badge and its
  source, both with the workings on, and still shows only while the estimate is below the record.
  Nothing is scored against it.
- **Measured** (ADR-0031): 175 words, against 232; grade 4.6, against 5.1; on a phone 1,752px in
  both modes, 2.2 screens of 780px, against 2.7 and 2.9 (4.1 screens with the workings on). With the
  debt rule in the text and the softer buffer line (2026-09-30): 206 words, grade 4.7, and on a
  phone 1,608px, 2.1 screens, against 1,500px and 1.9 the day before. Then said to be the second
  rule, in plain type: 210 words, grade 4.8, and 1,632px.

## 31. A plain cover and a flat footer (ADR-0032)

Looking at the cover on a phone, the user asked for the Methodology and About links in the footer
only, the cover without its eyebrow, bullets and "silly image", and a much flatter footer, the
switches for advanced mode and the workings withdrawn for now.

- **The cover** is "It's your Budget now.", the premise in one sentence and "Build my Budget". The
  Budget's date above the heading, the playtime and "Six steps", and the Budget box went.
- **The header** is the name alone, the way home.
- **The footer** is one row: "Methodology", "About & sources" and "Sources and licence", which lands
  on the About page's licence, moved above the long table of sources. A link to part of a page now
  scrolls to that part.
- **The workings** are off on every game screen, with no switch to turn them on; the reference pages
  still show them. The preference moved to `btc.workings.v2`, so an old "on" cannot stick with no
  way off; the page tests set it, keeping the code tested for the switch's return.
- **The modes** change by the button on each screen basic mode trims, remembered as before; the
  footer's switch went.
- **The badges** are plain labels, their meaning in their title; the Methodology page's "Five kinds
  of number" explains them, one link away in the footer.
- **Measured** (ADR-0032): the cover reads 19 words; on a phone it is one screen, the footer 93px at
  360px (two rows) and 49px from about 400px wide (one), and the briefing 1,549px (2.0 screens).

(Since §32 the cover carries a new Budget box and no road, and the footer is one link, to the About
page, which names the five kinds of number and links on to the Methodology page.)

## 32. An invitation, then the road, and one link (ADR-0033)

The user asked for a more inviting cover: progress shown only once the game starts, and clear about
where you are; the red Budget box as the cover’s focal point; and one understated footer link to the
information behind the game, organised.

- **The cover** is the invitation, not a step: the Budget box, "It’s your Budget now.", the premise
  and "Build my Budget", with no step count and no road. On a phone the box stands above the words
  with the button in view; from 720px the words take the left and the box the right.
- **The Budget box** is inline SVG coloured by six tokens: a flat despatch box in red leather with
  gilt tooling, a brass handle, lock and corners, tilted on a disc of Commons green with three
  flashes. It carries no emblem, no words and no motion, and is hidden from screen readers.
- **The road** starts on the briefing. Every screen after the cover names its step ("Step 2 of 6 ·
  Set your priorities") above six square marks. A step done is a tick, the step you are on a filled
  numeral, a step opened ahead an outlined numeral, and a step not yet open a dashed one; the rule
  between them is solid behind you and dashed ahead. A step is done when it is behind you or short
  of the furthest step reached, and the marks read the guard’s own rule.
- **The footer** is one link, "About the game & sources", to the About page. Under a contents list
  it sets out the game, how the numbers work (the five kinds of number and a link to the Methodology
  page), what the game does not do, the licence and every source.
- **Measured** (ADR-0033): at 390×664 the button ends 471px down, and at 360×640 498px down. On a
  phone the road is 67px and the footer 49px, and the briefing is 1,500px (1.9 screens).
- **Revised the same day**: the cover fills the screen, the invitation centred between the header
  and the footer’s link at the foot of the screen, with the box and, on a tall phone, the heading
  sized by the screen’s height. Nothing scrolls on a 375×553 phone, and on 412×788 the button ends
  620px down.

## 33. No badges (ADR-0034)

On 2026-09-30 the user asked for the badges to go everywhere. No screen carries one now: not the
flagship cards, step 4's policies, the lines of the advisers, the ministers and the Prime Minister,
the review, Budget day, the provenance drawers or the reference pages. The first flagship screen's
line on what the badges meant went with them, and so did the component, its styles and its colours.

- **What stays.** Every figure and line still records its kind in the data (`badge`); the validator
  and the tests hold each to it, and the markets' credibility rule still reads which costings are
  our own arithmetic. The tags that say what a choice does (the manifesto's red and amber, a promise
  to the Prime Minister, an earliest start) are not badges, and stay.
- **Where the words carry it.** A judgement is said in a role's voice; the speech's strip says every
  sentence in it is a game judgement; our own arithmetic says so where it is explained; a size past
  its source's range says so in its caveat; and a provenance drawer's carried-forward settlement now
  ends "our assumption", where a badge said it alone. The About page gives the five kinds a sentence
  each, and the Methodology page names them in words.
- **What is lost.** On the flagship cards and step 4's policies nothing now shows which costing is
  HMRC's or the Treasury's and which is a think tank's figure or our arithmetic, and with the
  workings withdrawn (§31) no screen shows a figure's source either. ADR-0034 records this as a
  deliberate departure from §1, with its risks.
- **Measured** (ADR-0034): every screen that wore badges reads fewer words. The flagship screens
  read 171, 170 and 153 words, against 205, 182 and 165; step 4's tax screen 592 and its spending
  screen 554 at rest, against 615 and 582; the review 204, against 213; Budget day 190, against 199;
  the priorities 172, against 178. Each budget is re-pinned with a tenth to spare, and `walk37`,
  which fails any screen with a badge, is clean.

## 34. Taxes by tax (ADR-0035)

On 2026-09-30 the user asked for the tax screen to be arranged around taxes, in decisions with
sub-decisions, with VAT as the example; for nine taxes to be taken off the table; and for two cuts
to be added.

- **Eleven taxes, twenty-six decisions.** On the tax side of `finetune.json` each group is a tax,
  `{ id, label, decisions }`, and each decision `{ id, title, items }`; the spending side keeps
  `groups[].items[]`. A section's label is the family (the lever file's `group`) of every tax in it,
  and the validator says so when one is not (`tax lever X is in the F family, not S`), so the family
  is the one record of which tax a lever is. A decision holds one to seven taxes (eight since §35)
  under a title of at most six words, and a tax not on the table comes last in it: 67 taxes, 87
  policies. The who-pays groups and their rules are gone; a tax's incidence tag still says who pays
  it, on the review and on Budget day.
- **Advanced mode** shows the eleven sections and 26 decisions, all closed. A decision is a button
  in an h3 with `aria-expanded`, its title beside a status: where a one-scale decision stands ("20%
  as planned", "22% · raises £19.8bn"), or how many choices another holds ("4 choices", "1 chosen ·
  raises £2.4bn"). Opening it mounts its cards, at h4 (one card, a row a choice, since §36); a
  decision holding a tax that had moved when the screen opened, a flagship's included, starts open.
  A section's heading counts what moved. It is a heading's button and not a `details` so that a
  screen reader can move from decision to decision by heading and hear which are open, and so that
  the word budgets, which leave folds out, count the titles and the open cards.
- **Basic mode** shows the eight picks under seven taxes, in section order; wealth tax, stamp duty,
  business taxes and the tax gap have no pick and are left out unless something in them was chosen.
  Only a spending group must now have a pick (§28).
- **One scale for a tax.** Every tax with sizes is one card whose radios are its levels in order,
  the planned level among them: "15% · 18% · 19% · 20% as planned · 21% · 22% · 25%" for VAT. The
  levels are the lever's default and every size its ways come in, sorted and each once
  (`scaleLevels`), and each radio is named by the level it sets. At rest the card prices the nearest
  level each way on a line of its own; choosing the planned level puts the tax back; a level no
  radio names, from an old link, reads "Now 23%". A card blocked by a tax that counts the same money
  prices the swap, and Swap sets its nearest level (since §35 it says what choosing would take out
  instead, and still moves). The spending screen kept two policies a lever, and Small, Medium and
  Large, until §36.
- **Nine taxes off the table**: the health and social care levy, insurance premium tax, dropping the
  salary-sacrifice cap, capital gains at income tax rates, a lower VAT registration threshold,
  National Insurance on landlords' rent, the Business Asset Disposal Relief rate, last year's
  cancelled fuel duty rise and undoing last year's gambling duties. Each is deprecated and filed as
  "Shelved", its costing and its tests kept, the way the levers shelved in Phase 12 were (§17).
  Everything live that named them went, which leaves fifteen pairs that count the same money, from
  twenty-two (seventeen since §35). An old link carrying one opens without it and says so. The two
  basic picks that went, the levy and capital gains alignment, are replaced by a point on employer
  National Insurance and capital gains tax at death; "Put up fuel duty" takes the retired card's
  emissions clause, on the same HMRC source.
- **Two cuts.** The personal allowance can come down by £100 or £1,250, on HMRC's published rises
  with the sign reversed (lookup points with `multiplier: -1`, as inheritance tax's cuts are), which
  the card's assumptions say HMRC does not publish; it neither breaks nor strains the tax lock,
  which names rates. Class 4 National Insurance can come down by 1, 2 or 4 points on HMRC's
  symmetric one-point row. The couple and the tradesperson pay a lower allowance, and the
  tradesperson gains from a Class 4 cut. The lookup points' note and the provenance drawer now say
  each point is worked from a published figure, not that HMRC published every point.
- **Measured** (ADR-0035): the advanced tax screen reads 405 words at rest on the walk's game,
  against 592, and 1,030 with choices in six decisions, since an open decision shows every choice in
  it; basic mode reads 352 and 536. The fine-tuning screens read at grade 5.3, from 5.7. On a phone
  the advanced tax screen is 2,764px on arrival, 3.5 screens, against 5,481px; basic mode's is
  3,372px, against 3,210px. `walk38` is clean at 1300px and 360px, in light and with reduced motion.

## 35. Contradictions under one decision (ADR-0036)

On 2026-09-30 the user said the decisions should resolve contradictions too, since contradicting
choices would come under one decision. Asked how, they chose one choice among radios where two ticks
contradict, and elsewhere a choice that takes the others out and says so first.

- **Contradictions sit together.** “Charge 1% VAT on everything now zero-rated” moves to Remove an
  exemption, beside the five exemptions it covers, so a decision holds one to eight taxes. Undoing
  the 2024 rise in capital gains tax now excludes moving either rate on gains, which makes seventeen
  pairs that count the same money (§6). Only VAT off gas and full VAT on home energy still sit in
  different decisions, where the user put them.
- **One choice.** A decision may declare `alternatives: [{ name, codes }]`: two or more of its ticks
  that exclude each other and nothing else, none set by a flagship, side by side in its order. The
  validator checks each of these, and names two ticks in one decision that exclude only each other
  but are not declared. Four sets are declared: the wealth tax, the rate of pension tax relief, the
  rates on dividends, savings and rent, and capital gains that go untaxed. The screen draws a set as
  a group under its name, “As planned” first and each tick’s card after it with a radio in place of
  its box (each a row since §36). The radios share a name, so choosing one takes the others out and
  the arrow keys move through them. While one is chosen the others are priced “If you choose it
  instead”, the swap read as one move. An old link that carries two of a set checks the first, and
  both warn that they count the same money twice.
- **Taking out.** Any other card whose partner is in the Budget says so before it is touched, naming
  what it would take out (“Choosing this takes out …”, or on a scale “Choosing a level here takes
  out …”), then giving the first partner’s reason (since §36 it names those in its own card by their
  short names, and leaves the reason to the card’s fold). It still moves. Its prices count the
  partners as gone, “instead”, and choosing it puts them back where they rest. The line describes
  the control (`aria-describedby`), so a screen reader hears it first.
- **Flagships.** Where a flagship the player chose holds the partner, the card still will not move
  and offers “Change it”, the way back to that flagship (§27), since step 4 never undoes a flagship.
  Step 3’s ways to deliver a priority keep “You can’t have both” and its swap.
- **Basic mode** has no decisions, so a pick there takes out rather than offering radios.
- **Words.** Five reasons that ran past twenty words are shorter, and every reason, as a take-out
  line reads it, joins the readability test at grade 5.9; the fine-tuning screens read at 5.2. The
  advanced tax screen with choices in six decisions reads 925 words, from 1,030, pinned at 1,020,
  and the other screens are unchanged. `walk39` is clean at 1300px and 360px, in light and with
  reduced motion.

## 36. One card a decision (ADR-0037)

On 2026-09-30 the user asked for every decision to work like the rates: one card, and inside it a
box for each thing it could apply to, “remove vat exemptions” and a checkbox for each exemption.
Asked what each option should show, they chose a row each with the adviser’s line once ticked; asked
about the spending screen, both screens in this round.

- **Spending in decisions.** The spending screen goes section by section, as the tax screen does
  (§34): four sections by what the money is for, nine decisions (“Change health, schools and
  defence”, “Fund a new programme”, “Reverse a decision”), each closed until opened, those holding a
  lever that had moved when the screen opened open from the start. Each budget is one scale with the
  plan among its levels, from 5% less to 5% more (public investment from 10% less to 20% more), so
  Small, Medium and Large leave the game (§27); at rest it still says how it grows after rising
  prices. The groups’ folds and their family subheads went. The 2025 PIP cuts move beside the reset
  they contradict, so each of the spending screen’s three pairs sits in one decision, as taking out
  rather than radios, since a flagship sets one lever of each (§35). A spending section needs a pick
  (§28).
- **A short name for every choice.** Inside its decision a choice goes by a short name in the
  decision’s terms, “Food” under Remove an exemption, from the item’s `label` (at most 48 characters
  and seven words), or else its plain name or its policy’s title. No two in a decision share one.
  Everywhere else a lever keeps its plain name.
- **One card, a row a choice.** An open decision is one card. A tick is a box, its short name and
  what choosing would do (“would raise at most £32.5bn”); a lever with levels is a row of them,
  priced at the nearest level each way. No row shows headroom, which the bar keeps. Chosen, a row
  says what it does in the target year (“raises at most £32.5bn in 2029-30”), and only then do its
  adviser, a budget’s minister and Undo appear. What the rows share is said once at the top of the
  card: what “at most” means for a relief’s cost, and which rule investment counts against. The
  promises that watch a row, its flagship, “Not on the table” and any warning that applies now stay
  on it; everything else about each lever (its headline, cash, milestones, tags, what it counts the
  same money as, what it assumes and, with the workings on, its sources) waits under one fold a
  card, “More about these”.
- **Taking out, in a card.** A row that would take out another beside it names it by its short name
  and leaves the reason to the fold; one in another decision it names plainly, with the reason
  (§35). A set of radios is a set of rows. A lever a chosen flagship holds is a row naming the
  flagship, with the way back to it.
- **Basic mode** has no decisions: each section is one card of the adviser’s picks, a row each under
  its policy’s title.
- **Measured** (ADR-0037): the advanced tax screen reads 292 words at rest on the walk’s game, from
  405, and 459 with choices in six decisions, from 925; spending 388, from 496, and 592, from 842;
  basic mode 196 and 321 for tax and 270 and 421 for spending. Opened one at a time at 360px, the
  tax screen’s 26 cards show 1,321 words, from 3,372, and the spending screen’s nine 829, from
  1,739; Remove an exemption falls from 441 words to 117, and cards of ticks fall to between a
  quarter and a third, scales less. The fine-tuning screens read at grade 4.9. On a phone the tax
  screen is 2,788px on arrival, unchanged; with the walk’s two flagships the spending screen is
  3,686px, from 4,615px, and basic mode’s screens 2,569px and 2,890px, from 3,396px and 3,823px; on
  a phone a row’s tags sit below its name, not beside it, so the name and price keep the full width.
  `walk41` is clean at 1300px and 360px, in light and with reduced motion.
