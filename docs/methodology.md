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

HMRC's _Direct effects of illustrative tax changes_ (June 2025 edition) covers 2026-27 to
2028-29 on a Spring Statement 2025 baseline. The July 2026 edition was deferred while HMRC
reviews its behavioural assumptions. To reach the 2029-30 target year, each figure is:

1. shifted so that ready-reckoner year 1 aligns with the chosen implementation year;
2. scaled by the growth of the relevant tax head in the current OBR forecast between the
   source year and the game year;
3. extended beyond the horizon by growing the year-3 (steady-state) figure with the same tax
   head.

Each step is recorded as a derivation and shown beside the raw figure. Rate changes scale
roughly linearly with size; allowances and thresholds do not, and CGT and stamp duty are
non-linear and asymmetric, so those levers use lookup tables at the published points and
refuse to extrapolate. See ADR-0004.

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

Growth effects of the player's choices; market reactions to the fiscal stance; devolved
budgets beyond Barnett consequentials (Phase 3); financial transactions other than those in
the baseline; depreciation on new capital spending; classification changes.

## 10. Reproducibility

`packages/engine` has golden tests that reproduce the OBR baseline with no policy changes,
property tests for the accounting identities, and unit tests for the rule logic. Everything
under `data/` is validated against the engine's schemas, and `data/derived/` is regenerated
by the pipeline in CI and compared with the committed files.
