# Methodology

This document is the single description of how Be the Chancellor turns choices into
numbers. Anything the app displays should be explainable from here; if it is not, the
methodology is wrong or the app is.

## 1. The honesty contract

Every figure on screen wears one of four badges:

| Badge                       | Meaning                                                                                                                                                           | Examples                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Direct costing**          | An official estimate of the direct effect of a policy on receipts or spending, reproduced from HMRC, HM Treasury or the OBR, with the transformation steps shown. | HMRC ready reckoner: 1p on the basic rate of income tax; HMT Budget 2025 scorecard lines.                     |
| **Mechanical**              | Arithmetic that follows from the direct costings and the baseline, with no behavioural judgement.                                                                 | Adding deltas to the OBR path; debt interest on extra borrowing; ratios to GDP.                               |
| **Assumption**              | A number the player or the tool chooses, using published sensitivities where they exist.                                                                          | The interest-rate, growth and inflation sliders; the uprating of ready-reckoner figures beyond their horizon. |
| **Second-round commentary** | Behavioural and macroeconomic effects described in words and direction only, with sources. Never a number of our own.                                             | "Large CGT rises can lose revenue because people delay disposals (HMRC)."                                     |

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

Growth effects of the player's choices; market reactions to the fiscal stance; Barnett
consequentials (described under each department, never added to the number) and the devolved
governments' own choices; departmental underspending against plans; financial transactions
other than those in the baseline; depreciation on new capital spending; classification changes.

## 10. Reproducibility

`packages/engine` has golden tests that reproduce the OBR baseline with no policy changes,
property tests for the accounting identities, and unit tests for the rule logic. Everything
under `data/` is validated against the engine's schemas, and `data/derived/` is regenerated
by the pipeline in CI and compared with the committed files.
