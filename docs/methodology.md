# Methodology

This document is the single description of how Be the Chancellor turns choices into
numbers. Anything the app displays should be explainable from here; if it is not, the
methodology is wrong or the app is.

## 1. The honesty contract

Every figure on screen wears one of five badges (the fifth, for the game's own judgements, was
added in Phase 8 under ADR-0011):

| Badge                       | Meaning                                                                                                                                                                                                                              | Examples                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Direct costing**          | An official estimate of the direct effect of a policy on receipts or spending, reproduced from HMRC, HM Treasury or the OBR, with the transformation steps shown.                                                                    | HMRC ready reckoner: 1p on the basic rate of income tax; HMT Budget 2025 scorecard lines.                     |
| **Mechanical**              | Arithmetic that follows from the direct costings and the baseline, with no behavioural judgement.                                                                                                                                    | Adding deltas to the OBR path; debt interest on extra borrowing; ratios to GDP.                               |
| **Assumption**              | A number the player or the tool chooses, using published sensitivities where they exist.                                                                                                                                             | The interest-rate, growth and inflation sliders; the uprating of ready-reckoner figures beyond their horizon. |
| **Second-round commentary** | Behavioural and macroeconomic effects described in words and direction only, with sources. Never a number of our own.                                                                                                                | "Large CGT rises can lose revenue because people delay disposals (HMRC)."                                     |
| **Simulated**               | A judgement nobody published, in a role's voice: what the Prime Minister wants, what a minister says at a cut, how a market or a household reads the Budget. May quote a sourced fact and read an engine number; never produces one. | "That is the tax lock, Chancellor." The kind of Budget named at the close.                                    |

The engine never adds a behavioural or macroeconomic knock-on of its own. Where HMRC's
direct costings already include a standard behavioural response (they do, for example, for
income tax and CGT), the lever says so.

## 2. Vocabulary

- **Fiscal year.** April to March, written `2029-30`. Economy series from the OBR are calendar
  years and are displayed only; they never enter fiscal arithmetic.
- **Receipts.** Public sector current receipts: taxes plus interest, dividends and other income.
- **TME.** Total managed expenditure, split into departmental expenditure limits (**DEL**,
  planned in Spending Reviews: resource **RDEL** for day-to-day spending and capital **CDEL**
  for investment) and annually managed expenditure (**AME**: welfare, debt interest, locally
  financed spending and other demand-led items).
- **PSNB.** Public sector net borrowing: TME less receipts. The deficit.
- **PSNI.** Public sector net investment: capital spending less depreciation.
- **Current budget deficit.** PSNB less PSNI: day-to-day spending less receipts. A negative
  value is a surplus. The stability rule is a test on this line.
- **PSNFL.** Public sector net financial liabilities: financial liabilities less financial
  assets (including student loans and funded pension assets). The investment rule's debt
  measure. **PSND** (public sector net debt) is the older headline measure and is displayed
  for context only.
- **Headroom.** The margin by which a rule is met in its target year, in £ billion. It is a
  forecast quantity and moves with every forecast revision.
- **Vintage.** One OBR forecast, stored as a versioned data set (`data/vintages/<id>/`). The
  current vintage is `obr-2026-03`, the March 2026 Economic and fiscal outlook.

## 3. Two GDP denominators

Flows (receipts, spending, borrowing, the current budget) are expressed as a share of
financial-year nominal GDP. Stocks (PSNFL, PSND) are expressed as a share of GDP centred on
the end of the financial year (the average of two adjacent years), which is about 1.5% higher.
The vintage carries both series. Using one for everything would misstate PSNFL by more than a
percentage point of GDP. Until the OBR's supplementary tables are committed, both series are
derived from published £ billion figures and rounded shares and are flagged `provisional`.

## 4. The fiscal rules

The Charter for Budget Responsibility (Autumn 2025 edition, in force February 2026) sets:

- **Stability rule.** "The current budget must be in surplus in 2029-30, until 2029-30 becomes
  the third year of the forecast period. From that point, the current budget must then remain
  in balance or in surplus from the third year of the rolling forecast period." Once rolling,
  HM Treasury defines balance as "a range: in surplus, or in deficit of no more than 0.5% of
  GDP", and if that range is used "the current budget must return to surplus from the third
  year at the following fiscal event".
- **Investment rule.** PSNFL "is falling as a share of the economy by 2029-30, until 2029-30
  becomes the third year of the forecast period. Debt should then fall by the third year of the
  rolling forecast period."
- **Welfare cap.** Spending on capped welfare must stay within a cap (£194.5 billion in
  2029-30) and a margin (5%). It is formally assessed at the first Budget of a Parliament and
  monitored at other Budgets, so the verdict has three states: within the cap, above the cap
  but within the margin, above the margin.

The OBR formally assesses the rules once a year, at the autumn Budget. The Chancellor may
suspend them in a significant negative shock, after asking the OBR to assess its severity.

**Target-year logic.** The engine derives the target year from the vintage. The forecast
period is the five financial years after the year in progress. If its third year is on or
after 2029-30, the rules are rolling and the third year is the target; otherwise the target is
2029-30 and the stability rule requires a surplus. For the March 2026 vintage the third year is
2028-29, so the fixed 2029-30 target applies. From the Budget of 28 October 2026 the forecast
will run 2027-28 to 2031-32, the third year is 2029-30, and the rolling form applies. The app
can preview that form on the March baseline (`assessAsOf: nextBudget`).

**Headroom is shown two ways once rolling:** against zero (a surplus) and against the 0.5%
tolerance. Which one the OBR will headline has not been settled publicly.

## 5. Calculation spine

All internal arithmetic is in £ million by fiscal year. `Δ` means the change from the
baseline caused by the player's choices.

1. **Lever effects.** Each lever's costing yields ΔR (receipts), ΔC (current spending),
   ΔK (capital spending) and ΔW (welfare inside the cap) by year. Receipts positive means
   more revenue; spending positive means more spending. Source signs (HMRC "yield", HMT
   "reduces borrowing") are converted at extraction time and the conversion is recorded.
2. **Macro assumptions.** Each slider multiplies an OBR sensitivity (ΔPSNB by year per unit)
   by its setting. The growth slider also compounds both nominal GDP denominators; the
   interest-rate slider also raises the marginal rate used in step 4.
3. **Primary borrowing.** ΔB^prim = ΔC + ΔK − ΔR + ΔPSNB^macro.
4. **Debt-interest feedback** (mechanical, toggle, default on). With marginal rate r and a
   half-year convention, ΔB_t = (ΔB^prim_t + r_t·ΔD_{t−1}) / (1 − r_t/2), and the stock of
   extra debt ΔD_t = ΔD_{t−1} + ΔB_t. The interest line ΔI_t = ΔB_t − ΔB^prim_t is shown
   separately and never folded into a lever's costing.
5. **Aggregates.** PSNB = baseline + ΔB. PSNI = baseline + ΔK. Current budget deficit =
   PSNB − PSNI, so capital spending changes the current budget only through interest.
6. **PSNFL.** PSNFL_t = baseline PSNFL_t + Σ_{s≤t} ΔB_s. The baseline already contains the
   OBR's valuation effects and financial transactions, which are held fixed.
7. **Ratios.** Flows over financial-year GDP; stocks over centred GDP; computed, never stored.
8. **Verdicts.** Stability: current budget deficit at the target year against zero (fixed) or
   0.5% of GDP (rolling). Investment: change in PSNFL as a share of GDP between the year
   before the target and the target year must be negative; headroom is that change times
   centred GDP. Welfare cap: inside-cap spending in the cap year against the cap and margin.
9. **Attribution.** Each lever's contribution to the target-year current budget and borrowing
   is reported separately, then the macro assumptions, then the debt-interest line.

## 6. Direct costings and uprating

Tax levers use two official sources, both committed under `data/raw/` with their hashes:

- **HMRC, _Direct effects of illustrative tax changes_, June 2025.** One row per illustrative
  change (for example "Change basic rate by 1p"), £ million for 2026-27, 2027-28 and 2028-29,
  for an April 2026 start on HMRC's Spring Statement 2025 indexed baseline. HMRC's figures are
  direct effects on the tax concerned and closely related bases, include HMRC's standard
  behavioural response, and exclude wider economic effects. The July 2026 edition was deferred
  while HMRC reviews key assumptions, after the Office for Statistics Regulation asked for more
  transparency about pre- and post-behavioural estimates.
- **HM Treasury, Budget 2025 Table 4.1 policy decisions.** Certified costings of each Budget
  measure to 2030-31, positive when they reduce borrowing. The "reverse a Budget 2025 measure"
  toggles use these lines with the sign reversed.

The pipeline extracts both tables to `data/derived/`, and every lever cites the rows or lines it
uses. A validation step rebuilds each lever's per-unit table from the cited rows and fails if it
differs, so the numbers in the app cannot drift from the published ones.

### Costing kinds

- **Linear per unit.** Effect = setting ÷ unit size × published effect per unit. Asymmetric
  rows (a rise "yield" and a cut "cost") are kept separate and chosen by the sign of the setting.
  Combined levers (employee plus self-employed NICs, petrol plus diesel) sum their rows.
- **Lookup table.** Where HMRC says changes are non-linear (capital gains tax, the personal
  allowance, the higher-rate threshold), the lever uses HMRC's published points only, interpolates
  in a straight line between them and never goes beyond the largest published change.
- **Schedule.** Dated effects by year, used for the Budget 2025 reversals; nothing applies before
  the start year.

### Uprating (ADR-0004)

HMRC's years run from April 2026. The game's measures start in April 2027 (the first April after
the Budget of 28 October 2026) and the rules bite in 2029-30, so each published profile is carried
forward:

1. Published year k applies to `start year + k − 1`.
2. Each value is multiplied by the growth of the relevant OBR receipts head between the published
   year and the target year: receipts head in £ million = share of GDP (EFO Table 3.1) × nominal
   GDP.
3. Beyond the third published year, the third-year figure grows with the same head.
4. Every step is recorded and shown in the provenance drawer beside the raw figure.

Worked example, basic rate +1p, start April 2027, income tax receipts (£m) 2026-27 360,810;
2027-28 383,035; 2028-29 396,572; 2029-30 414,251; 2030-31 432,244:

| Year    | Published (year taken) | Factor                    | Used  |
| ------- | ---------------------- | ------------------------- | ----- |
| 2027-28 | 6,900 (2026-27)        | 383,035 ÷ 360,810 = 1.062 | 7,325 |
| 2028-29 | 8,250 (2027-28)        | 396,572 ÷ 383,035 = 1.035 | 8,542 |
| 2029-30 | 8,200 (2028-29)        | 414,251 ÷ 396,572 = 1.045 | 8,566 |
| 2030-31 | 8,200 (2028-29)        | 432,244 ÷ 396,572 = 1.090 | 8,938 |

So a penny on the basic rate adds about £8.6 billion to 2029-30 headroom before the small interest
saving on lower borrowing. The receipts shares are published to 0.1% of GDP, so factors carry
about ±1% of rounding noise. The level of HMRC's baseline is not rebased to March 2026; that
correction waits for the March 2025 receipts tables.

Head used by tax: income tax levers and the threshold-freeze reversal → income tax; NICs → NICs;
VAT → VAT; corporation tax → onshore corporation tax; capital gains, inheritance and stamp duty
→ capital taxes; fuel duty → fuel duties; alcohol → alcohol and tobacco duties; insurance
premium tax → other taxes.

### Interactions

HMRC notes that rate and threshold changes are only approximately additive, and two levers can
touch the same tax (fuel duty rates and the fuel duty freeze reversal). Authored interaction
notes appear when both levers of a pair are moved; they change no numbers.

### Spending levers (ADR-0006)

Spending levers add a third source, the **Spending Review 2025 departmental DEL tables** (HMT,
June 2025; `data/raw/hmt-sr25/`), and reuse the other two on the spending side.

- **Percentage of a baseline path.** Eight departments and an "all other" residual scale their
  Spending Review resource settlement (resource DEL excluding depreciation, Table 5.3, published
  in £ billion and converted to £ million at extraction): effect = setting ÷ 100 × baseline, from
  the start year. The Spending Review stops at 2028-29, so 2029-30 and 2030-31 carry the 2028-29
  settlement forward with the growth of the OBR's total RDEL (594,200 ÷ 581,800 = 1.021 for
  2029-30; 614,200 ÷ 581,800 = 1.056 for 2030-31). That extension is an assumption and is marked
  as one in the drawer: the OBR says the same envelope implies real cuts to "unprotected" budgets
  (EFO paragraph 4.16), so the pro-rata path is probably too high for those departments and too
  low for protected ones. The residual is the published total less the eight rows, rebuilt by the
  validator from the cited rows. The investment lever and the four welfare lines scale OBR forecast
  series directly (Table 4.1 CDEL; Table 4.6 components), which need no extension.

  Worked example, Health and Social Care +1%: plan 221,322 (2027-28) → 2,213; 231,977 (2028-29) →
  2,320; extended 231,977 × 1.021 = 236,921 (2029-30) → 2,369; 244,896 (2030-31) → 2,449 (£m).
  The OBR's total RDEL (582bn in 2028-29) is higher than the Spending Review total (568bn) because
  of later decisions and forecast adjustments; the lever scales the department's line and the OBR
  total remains the baseline aggregate.

- **Signs on the spending side.** Spending positive means more spending. An HMRC "cost" row
  (child benefit rates) is therefore positive and a "yield" row negative, the reverse of the tax
  side. A Budget 2025 scorecard measure that raised spending has a negative scorecard value;
  reversing it saves that amount, so the schedule equals plus the summed lines (minus them on the
  receipts side). The validator applies the side-aware rule, so a wrong sign fails `validate:data`.

- **Welfare cap by line.** The cap covers most welfare except the state pension and the payments
  most sensitive to the cycle. Pensioner spending is treated as outside the cap and the other lines
  as inside, which misplaces small parts of each (pension credit, winter fuel payments and
  pensioner housing benefit are inside; jobseeker payments are outside). Check against the EFO:
  2029-30 welfare 389.9bn less inside-cap 199.2bn leaves 190.7bn outside against pensioner
  spending of 187.5bn.

- **Investment.** Capital changes add to borrowing and to net financial liabilities and reach the
  current budget only through debt interest, which is the framework's design and the reason the
  attribution list carries a borrowing column. Depreciation on new assets and the financial
  transaction share of capital DEL are not modelled.

- **Barnett consequentials are described, not computed.** A change to a comparable department's
  budget would change the block grants to Scotland, Wales and Northern Ireland by the change ×
  comparability factor × population share (Statement of Funding Policy, June 2025, paragraphs
  3.9-3.18 and Annex B). Each comparable department carries that note with its factors; the
  numbers exclude it, and the "all other" residual includes the block grants themselves.

## 7. Assumption sliders

The sliders use the OBR's published sensitivities for the March 2026 forecast: a sustained
1 percentage point rise in Bank Rate and gilt yields adds about £15 billion to borrowing in
2030-31; 0.1 percentage point a year on nominal GDP growth is worth about £8 billion by
2030-31; 1 percentage point on RPI inflation adds about £11 billion (a fall removes about
£10 billion). The OBR publishes end-year figures; the year-by-year path is our stated
assumption and is flagged as such in the data.

## 8. Uncertainty

The OBR's average absolute five-year forecast error for receipts is 0.9% of GDP, roughly
£32 billion in 2030-31, larger than any recent headroom. The app shows headroom beside that
figure so that a "pass" reads as a forecast, not a fact.

## 9. Not modelled

Growth effects of the player's choices; market reactions to the fiscal stance (Budget day
describes what commentators watch, it does not predict what they do); Barnett consequentials
(described under each department, never added to the number) and the devolved governments' own
choices; departmental underspending against plans; the effect on the rules' debt measure of
reclassifying a body into the public sector; depreciation on new capital spending.

## 10. Reproducibility

`packages/engine` has golden tests that reproduce the OBR baseline with no policy changes,
property tests for the accounting identities, and unit tests for the rule logic. Everything
under `data/` is validated against the engine's schemas, and `data/derived/` is regenerated
by the pipeline in CI and compared with the committed files.

## 11. The guided journey (ADR-0007)

From Phase 4 the app is a walk-through rather than a single sandbox page: **Start** (the
scenario: appointed Chancellor, Budget on 28 October 2026), **Step 1 Assumptions**, **Step 2
Taxes and spending** (two tabs under a scorecard) and **Step 3 Budget day**. The budget travels
between steps in the URL's query string, so any step can be linked to; old `/b` links redirect
into the taxes tab.

### Advisers

Five roles, no people: Permanent Secretary, Chief Economic Adviser, Director of Tax, Director of
Public Spending and Political Adviser (`data/journey/advisers.json`). Everything they say is an
authored paragraph in `data/journey/briefings.json` with at least one source per paragraph, or
an existing lever consideration; the validator checks that every adviser exists, speaks on the
step, and that every group briefing names a real lever group. On Budget day the closing notes
are the considerations of the levers the player moved, routed to an adviser by kind:
behavioural and interaction notes to the tax or spending director, macro and market notes to the
Chief Economic Adviser, administrative notes to the Permanent Secretary, distributional,
devolution and legal notes to the Political Adviser. No text is generated.

### The assumptions step and the suggestion rule

`data/context/2026-09.json` holds dated readings, each with the OBR's March figure and the
latest figure and their sources: the 10-year gilt yield (Bank of England), Bank Rate, real GDP
growth, CPI and RPI (averages of independent forecasts compiled by HM Treasury, plus ONS
outturns) and borrowing. Readings that drive a slider carry a suggestion rule. The `gap` rule
is mechanical: latest minus OBR (the mean over shared years for a series), rounded to the
slider's step and clamped to its range; with the September 2026 readings that gives +0.75
points on the rates slider (5.35% against 4.5%) and +0.5 on RPI (an average gap of 0.46). An
`authored` rule carries a value and its reasoning, used for growth, where weaker real growth and
higher inflation roughly cancel on nominal GDP. Suggestions are badged as assumptions; the OBR's
own path is one click away.

### Four sets of assumptions, one method (ADR-0010)

From Phase 7 the step is a choice between four cards rather than three sliders. Each is one
stated rule over published rows, run through the same rounding and clamping as the suggestion
rule above; none of the four settings is authored, so tampering with a published figure moves
the card.

| Card                               | Rule                                              | rates | growth | RPI  | Headroom |
| ---------------------------------- | ------------------------------------------------- | ----- | ------ | ---- | -------- |
| Keep the March baseline            | The OBR's own forecast, unchanged                 | 0     | 0      | 0    | £23.60bn |
| Your Chief Economic Adviser's view | Latest reading − OBR (the `gap` rule)             | +0.75 | 0      | +0.5 | £6.85bn  |
| An optimistic analyst              | The least harmful published figure on each slider | −0.5  | 0      | 0    | £31.10bn |
| A pessimistic analyst              | The most harmful                                  | +0.75 | 0      | +1.0 | £1.35bn  |

The two analysts are not bound to one row of one table. For each slider the candidates are the
OBR's own assumption, the adviser's reading, and the lowest and highest published rows of the
comparison; the optimist takes the kindest of them and the pessimist the cruellest. **Which
direction is harmful is derived, not authored:** each macro lever names a `costing.sensitivityId`,
and the sign of that sensitivity's `effectOnPsnbGbpm` says whether turning the slider up raises
borrowing (`psnbDirection` in `packages/engine/src/costing/sensitivity.ts`; `validateVintage`
rejects a table whose years disagree in sign).

Because the adviser's own setting and the OBR's default sit in that pool, the cards come out
ordered by construction: the pessimist can never leave more headroom than the baseline or the
adviser, and the optimist never less. An earlier version bound each analyst to a single published
row and shipped a pessimist leaving £8.8bn against the adviser's £6.85bn, because the comparison's
gloomiest Bank Rate figure is milder than today's gilt yield. ADR-0010 records why explaining that
on the card was the wrong fix.

The two analysts read _Forecasts for the UK economy: a comparison of independent forecasts_
(HM Treasury, August 2026), which prints a Highest row, a Lowest row and the OBR's own row in
the same table: Table M4 for the official Bank Rate and Table M3 for RPI, both annual averages
for 2026 to 2030. HM Treasury permits the averages and ranges to be reproduced if reproduced
accurately and not in a misleading context; individual forecasters' rows are their copyright and
are not used here.

Three things about those figures are stated on the cards rather than smoothed over.

1. **The gloomiest published figure for interest rates is not a forecast.** The rates slider moves
   Bank Rate and gilt yields together. The adviser reads the 10-year gilt yield, because gilt
   yields drive debt interest; the comparison publishes no gilt yield at all, and its Bank Rate
   range tops out milder than the market, so the pessimistic card takes today's 5.35% reading.
   Each published range therefore carries its own comparator row (`alternatives.against`) and a
   note naming the basis, and the schema makes both mandatory.
2. **There is no optimistic case on RPI.** The lowest published path is 0.18 points below the
   OBR's on average, which rounds to nothing at the slider's half-point step: not one forecaster
   in the comparison sees RPI materially below the OBR, and on the quarterly basis the lowest
   2026 forecast is above it.
3. **Growth stays on the OBR's path on every card.** The comparison publishes no medium-term
   range for nominal GDP. Adding its highest real growth to its highest GDP deflator would splice
   different institutions into a path nobody published, which is exactly the invention ADR-0002
   forbids; its short-term nominal GDP range covers 2026 and 2027 only and exceeds the slider's
   whole range several times over.

A highest or lowest row is a per-cell extreme, so no single institution holds a card's whole view,
and the pessimist's rates figure is a market reading rather than a forecast at all; the cards say
so rather than claiming an analyst forecasts any of it. Every card shows the headroom it would
leave, which is how the step teaches that a Chancellor can buy headroom by picking the rosier
forecast. The three sliders remain behind a disclosure, with their readings and provenance drawers
intact; a permalink whose settings match no card shows _your own figures_.

### The scorecard

For the stability rule's target year: headroom (the big number, against the OBR's March
figure and the typical forecast error), the three verdicts, the current budget balance,
borrowing, net financial liabilities as a share of GDP and borrowing as a share of GDP, each as
March → yours. All come from the same outcome the verdict cards use.

### Levels, not deltas

Controls show the level a setting moves to: "20% → 21%", "£12,570 → £13,070", "£50,270 →
£55,297", "57.95p → 60.85p", "£232.0bn → £236.6bn in 2028-29". The level is display metadata
(`control.level`: baseline, unit, add or percentage change, source), or for
percentage-of-baseline levers the baseline path itself. The engine still costs the change, the
permalink still stores the change, and no baseline enters the arithmetic. Inheritance tax is a
select (abolish, 30%, 35%, 40%, 45%, 50%); the engine snaps a select to its nearest offered
option, so a hand-edited link cannot land between options.

### New direct costings in Phase 4

- **VAT base-broadening toggles** (food, domestic energy, children's clothing, printed matter,
  passenger transport, new homes) use HMRC's _Estimated cost of tax reliefs_ (January 2026,
  Table 2, 2025-26), carried forward with the OBR's VAT receipts path. HMRC's caveat is quoted
  on every toggle: the figures "do not represent the gain to the exchequer should a relief be
  abolished". They are shown as the static cost of the relief; the true yield would be lower.
- **Reversing the October 2024 CGT rate rise** and **cutting the additional-dwellings stamp
  duty surcharge back to 3%** use Autumn Budget 2024 Table 5.1 (lines 27 and 25) with the sign
  reversed for 2027-28 to 2029-30 and the capital taxes head for 2030-31; the CGT line bundles
  the Business Asset Disposal Relief and Investors' Relief changes, which the toggle says.
- **Inheritance tax abolition** removes the OBR's forecast inheritance tax receipts (EFO Table
  A.5, now in the vintage as `receiptsByTax`) year by year; rises use HMRC's 1 percentage point
  row and cuts mirror it, an assumption the drawer states.
- **Insurance premium tax** is retired: its code stays reserved and old links decode with a
  warning.

## 12. Policies nobody has costed, and Budget day (ADR-0008)

### Arithmetic we do ourselves

The policies your colleagues in Parliament campaign for have no certified costing, because
none of them is government policy. Rather than print a slogan with no number, the repository
does the arithmetic and shows it. Each such lever carries a `derivedFromPublished` raw source
naming the method and its published inputs, and `checkRawSourceConsistency` reproduces the
schedule from them: an edited figure fails exactly as a tampered HMRC row does.

| Method          | Arithmetic                                                | Example                                                                  |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `gdpShareGap`   | (target share − forecast share) × nominal GDP             | Defence at 5% of GDP: (5% − 2.88%) × £3,510.6bn = £74.4bn in 2029-30     |
| `upratingGap`   | benefit line × compounding ratio of two uprating paths    | Triple lock to CPI: caseload growth is in both paths, so it cancels      |
| `statedProduct` | published quantities multiplied out, each with its source | Free school meals: 4.44m pupils × £505 a pupil                           |
| `seriesProduct` | published year series multiplied year by year             | Free tuition: fee-loan outlay × the share not already scored as spending |

All of these are badged **assumption**, never direct. The one exception is the 50% income tax
rate, which is five one-penny steps of HMRC's own additional-rate row and keeps its direct badge.

Two figures rest on a contested base. Their cards say so, in the headline, before the number:
the wealth tax, because the Wealth Tax Commission says its own work "has been constrained by a
lack of reliable data on individuals with total wealth above £10 million" and because the Office
for National Statistics publishes nothing above the top 1% threshold of £3.1m and had that
survey's accreditation suspended in 2025; withdrawing benefits from foreign nationals, because
96.2% of the universal credit caseload is settled here, protected by the withdrawal agreement or
holding indefinite leave, and people subject to immigration control already have no recourse to
public funds.

### Financial transactions

Cash paid for a financial asset is borrowed and carries interest, but it is not expenditure:
"there is no change to overall indebtedness ... Hence there is no expenditure and the transaction
has no impact on PSNB" (ONS, public sector finances methodological guide, 5.1.3). A lever with
`classification.psnflTreatment: 'financialTransaction'` routes its amount to a channel that
enters the debt-interest base and nothing else, so neither borrowing nor net financial
liabilities move. Buying the water companies at Defra's own £100bn therefore costs £100bn of
gilts and about £5bn a year of interest, and leaves the stability rule almost untouched. Free
tuition is the mirror: it converts a loan into a grant, moving money out of a financial
transaction and into spending.

A schedule may be `once`, paid in the implementation year only, for a purchase rather than a
programme. A spending classification may carry a `capitalShare`, because a defence uplift is not
all day-to-day money: the Spending Review's own settlement is 43% capital, and capital does not
count against the stability rule.

### Budget day signals

`computeReactions` is a pure function from the outcome and the lever set. Each signal reads one
number (headroom, headroom against the OBR's typical forecast error, the change in borrowing, the
change in the debt path, the change in the tax take, how many recommendations were adopted, how
many Budget 2025 decisions were reversed, the two rule statuses) and picks the first band whose
threshold the reading does not exceed. Every word shown lives in `data/journey/reactions.json`
with its sources, and a test asserts that no signal text exists outside it. The reading that
chose the band is printed beside the text.

The public panel is not a band: it carries the distributional considerations of the levers the
player moved, in their own words and with their own citations, ordered by the size of the measure.

## 13. The desk (ADR-0009)

The interface is a desk in the Treasury: paper on green leather, manila folders, rubber-stamped
verdicts, a countdown to 28 October. None of it is an image or a webfont; paper grain is two
hairline gratings, folder tabs are clip-paths, punch holes are radial gradients.

Three rules keep the framing from eating the sourcing.

**Badges are never stamps.** The five badge words are the honesty contract's vocabulary. Stamps are
for rule verdicts, which are the engine's own judgement on your Budget, and nowhere else.

**Beats accumulate.** Each step hands you something before the working surface, but moving on never
removes what you have read: source links inside a briefing stay in the document. A hand-off you
have finished with folds to one line rather than disappearing. The beat you are on never reaches
the URL, which means one thing only, a budget.

**Only the date is new.** The dateline and the countdown are the only facts on screen the engine
did not compute. Both derive from the Charter's next formal assessment date, so a data refresh
moves them, and neither carries a badge: chrome must not borrow the vocabulary of a costing.

One thing the desk costs: a closed folder's papers leave the document, so find-in-page no longer
reaches every lever at once. The attribution list beside the folders names every lever you have
moved, which is the question that was actually being asked.

## 14. The game: from ambition to reaction (ADR-0011, ADR-0012)

From Phase 8 the journey is seven stages: the outlook, the Prime Minister, the desk, the OBR's
forecast, the compromises, the rabbit and Budget day. The budget still travels in the query string;
the playthrough travels beside it as `g=` (seed, stage reached, outlook, headroom target, theme,
priorities, promises, concessions, political capital, delays, whether the envelope is open, the
rabbit, an acknowledged breach, dropped priorities) and `S=` (the package as it left the desk).
Both are absent until a seed is minted, so every older link is byte for byte the same.

### The fifth badge

**Simulated** marks a judgement nobody published: what the Prime Minister wants, what a minister
says at a cut, how a market or a household reads the Budget, the kind of Budget it was. A simulated
line may quote a sourced fact and read an engine number and never produces a number of its own. It
is badged per item, forbidden on levers and presets, and distinct from commentary, which is sourced
words about a second-round effect. Roles only: no real person's words are invented.

### The outlook and the target

Stage 1 keeps the four forecast cards (§11) and adds a headroom target: £10bn, £20bn, £30bn or
whatever the rules leave. The target is a plan the game measures the player against, never a rule
it enforces. The £20bn threshold is stated as the advisers' rule of thumb, badged simulated, resting
on sourced facts shown beside it (Budget 2025's £21.7bn, March's £23.6bn, the OBR's typical
five-year receipts error of about £32bn, the Chancellor's letter to the Treasury Committee, the
Bank's account of gilt volatility), because no document publishes it.

### The Prime Minister

Stage 2 is a conversation in data (`data/journey/pm.json`): what has already been done, a theme,
two or three flagships from the theme plus two cross-cutting ones, and the promises that must
survive. Every flagship is a lever and a target value whose cost is read live from the engine;
every promise is a detector over lever values (or, for the fiscal rules, over the verdicts) with
its source. The player may push back on two; the PM refuses or concedes on terms, and a concession
is a narrower promise in its own right. `ambitionStatus` reports each priority funded, part-funded,
unfunded or delayed and each promise kept or broken, with the lever named.

### The desk, staffed

Every spending and welfare lever has a minister (`ministers.json`): asking while it is untouched,
saying what stops happening at a cut, making the case for more. Advisers intervene from a closed
list of predicates (`interventions.json`): a promise broken, a priority unfunded, headroom below the
target, a rule missed. Promised flagships are pinned to their folder; the despatch box keeps score;
the Political Adviser's press summary plants the clue the seed chose. Leaving the desk snapshots the
package.

### The forecast

Stage 4 is the seeded draw of ADR-0012: five outcomes weighted to the centre, each a choice among
published candidates for the sliders, with re-scoring keyed to sourced uncertainty. The page takes
the move apart in three engine runs so economy plus costings equals the whole, shows the re-scored
measures beside their original badges, and says which ambitions are now at risk. `M=` becomes the
OBR's; the outlook step becomes history; the scorecard grows an "OBR in October" reading.

### The compromises and the rabbit

Stage 5 offers six routes, all of them levers: the Director of Tax's suggestions (every tax one
notch up, ranked by the engine, flagged where they break a promise in force), the package's own
spending measures with a later start year (`Settings.implementationYearByCode`), narrowing a
flagship to half the distance, going back to the Prime Minister at one political capital a time,
lowering the target, and acknowledging a breach with the Permanent Secretary's reading of the
Charter's escape clause. Stage 6 prices four prepared announcements, going further on a flagship,
or keeping the headroom, each as the headroom it would leave.

### Budget day

The speech is assembled from fragments (`speech.json`) with every figure read from the outcome and
every title from data; a test checks each pound sign. Reactions gain groups and phases: Parliament
as marginal seats, the left, ministers, No. 10 and the whips; the markets on the target, the
credibility of the costings, price-raising measures and an acknowledged breach; the electorate as
five households touched by stated levers. The morning after reassesses fiscal drag, contested
costings, pencilled-in efficiencies, financing, start dates and delivery. Every reaction names the
decisions behind its reading. The close totals the engine's figures by incidence tag, ranks the
compromises against the snapshot, re-runs the final package under all five draws, and names the
kind of Budget from a closed list of badged judgements.

### What is still not modelled

Growth effects of the player's choices, market reactions as numbers, and anything a real Prime
Minister or minister said that was not fetched and registered. The game has views now; it has no
more numbers than it had before.
