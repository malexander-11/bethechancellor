# Data

Everything the engine reads lives here as JSON validated by the schemas in
`packages/engine/src/schema`. Nothing is hard-coded in the app.

```
sources/sources.json      registry of every source document (id, org, title, url, dates, licence)
vintages/<id>/vintage.json  one OBR forecast: years, economy, fiscal aggregates, sensitivities, checks
rules/<id>.json           a Charter for Budget Responsibility rule set
levers/<category>/*.json  policy levers (tax, spend, welfare) and assumption sliders (macro)
reference/*.json          non-forecast reference numbers (e.g. UK households)
presets/presets.json      named combinations of lever settings
context/<yyyy-mm>.json    dated readings: the OBR's assumptions against the latest figures, with
                          suggestion rules, published forecast ranges and the assumption scenarios
journey/advisers.json     the adviser roles (titles, remits, steps)
journey/briefings.json    sourced adviser briefings per step and lever group
raw/<source-id>/          committed copies of small source files, with sha256 in the registry
derived/                  pipeline outputs (regenerated in CI and compared with the commit)
```

## Conventions

- Money is in **£ million** (`unit: "GBPm"`). Shares of GDP are in per cent (`pctGDP`).
- Fiscal years are `YYYY-YY` strings; calendar years are `YYYY`. A series declares which
  (`periodicity: "FY" | "CY"`).
- Every series, sensitivity and costing has a `source` (`{ sourceId, table?, page?,
paragraph?, quote?, note? }`) pointing into `sources/sources.json`.
- A number that was transformed from its source carries `derivation: [DerivationStep]` and,
  if it rests on rounded inputs or an interim assumption, `provisional: true`.
- Signs: receipts positive = more revenue; spending positive = more spending; PSNB positive
  = borrowing. Convert source conventions at extraction and record a `signFlip` step.
- Lever `code`s are short, stable and never reused; they appear in permalinks.
- A lever is shown in production only when `status` is `reviewed`.

## Rebasing to a new forecast

Create `vintages/<new-id>/vintage.json`, run `npm run validate:data`, update the default
vintage in the web app, and keep the old vintage so existing permalinks still render.

## Authoring a lever

1. Start from the published table: find the row in `derived/hmrc-trr-2025-06.raw.json` (cite its
   `rowId`, label and values under `costing.rawSource.rows`, with `hmrcSign` yield or cost and
   `role` increase or decrease) or the scorecard line in
   `derived/hmt-budget-2025-table-4-1.raw.json` (cite `number`, title and values under
   `costing.rawSource.lines`).
2. Write the engine-sign tables (`perUnit`, `decreasePerUnit`, lookup `effect`, or schedule
   `effect`): receipts positive means more revenue. For a scorecard reversal the schedule is minus
   the summed lines. `npm run validate:data` rebuilds these from the cited rows and fails on any
   difference.
3. Keep control ranges inside what the source publishes: increase-only rows give increase-only
   levers; lookup ranges stay within the published points.
4. State the baseline (`baselinePolicy`, `alreadyIncludes`) from Budget 2025 Table 4.1 or the EFO.
5. Add considerations only from documents readable in this repository's sources registry, with
   `alreadyInDirectCosting: true` when the published figure already contains the behaviour.
6. Give the lever a `group`, an `order`, a unique stable `code`, and set `status: reviewed` with
   `reviewedOn` once the above is checked.

### Levels and the journey

- **Levels.** Give a rate or threshold lever `control.level` (`baseline`, `unit`, `apply: add |
pctChange`, `label`, `source`, optional `decimals` and `note`) so the app shows "20% → 21%".
  The level never enters the costing; percentage-of-baseline levers need no level metadata.
- **Selects.** `control.kind: "select"` with `labels` keyed by value ("-40": "Abolish (0%)");
  the engine snaps to the nearest offered option.
- **Relief-cost toggles.** `rawSource.kind: "hmrcReliefCost"` cites rows of
  `derived/hmrc-tax-reliefs-2026-01.raw.json`; `perUnit` is the published cost for the cited
  year, uprated with the tax head. Quote HMRC's caveat in the caveats.
- **Scorecard-backed toggles.** A `linearPerUnit` toggle may cite `hmtScorecard` lines from any
  extracted scorecard (Budget 2025 or Autumn Budget 2024) by `sourceId`; `perUnit` is minus the
  summed lines for the cited years on the receipts side.
- **Vintage-series lookup points.** `points[].from.vintageSeries` ("receiptsByTax.inheritanceTax")
  with a `multiplier`; checked against the vintage.
- **Briefings** need an existing adviser who speaks on the step, a real lever group for group
  briefings, and at least one source per paragraph. **Context readings** that name a
  `leverCode` need a `suggestion` rule (`gap` or `authored`).
- **Published ranges** (`reading.alternatives`) carry the highest and lowest rows of a forecast
  comparison, the comparator row from the same table (`against`) and a `note` saying what basis
  they are on. `against` is mandatory and separate from the reading's own `obr` block because the
  two can differ: the rates reading compares 10-year gilt yields, but the published range is for
  Bank Rate, which the note has to say. All three rows must cover the same years, since the gap
  rule averages over them. A range needs a `leverCode`; the validator checks all of this.
- **Scenarios** (`context.scenarios`) carry a card's words only — title, headline and rationale
  paragraphs with sources. Never author its slider settings: those are derived in
  `apps/web/src/journey/scenarios.ts` from the rows above, so a tampered figure moves the card.
  One scenario per `kind`; an `optimistic` or `pessimistic` card needs at least one reading with a
  published range.

### Spending levers

- **Sides and signs.** Spending levers carry `classification.side: "spending"`; spending positive
  means more spending. An HMRC `cost` row is then positive and a `yield` row negative, and a
  scorecard reversal's schedule equals plus the summed lines. `validate:data` applies the
  side-aware rule, so authoring the tax-side sign fails.
- **Percentage-of-baseline costings** (`kind: "pctOfBaseline"`, badge `mechanical`, control unit
  `pct`) scale either a vintage series (`baseline.from: "vintage"`, e.g. `cdel`,
  `disabilityBenefits`) or a published plan (`baseline.from: "published"`) with `years`, `values`
  in £ million, `extendWith` (the vintage series that carries the last plan year forward) and a
  `rawSource` of kind `hmtSr25` citing rows of `derived/hmt-sr25-del.raw.json` by `rowId`, label
  and values. Rows with `role: "subtract"` build a residual; memo rows ("of which", "Memo:") are
  rejected.
- **Welfare cap.** Set `insideWelfareCap: true` on current spending levers whose line is inside
  the cap and state the by-line approximation in the caveats.
- **Barnett.** Set `classification.barnettConsequential: true` on comparable departments and add
  `devolution` considerations (with `appliesWhen` above/below 0) citing the Statement of Funding
  Policy; never add a numeric knock-on.

### Campaign policies (`data/levers/campaign/`)

These are the policies colleagues in Parliament campaign for. None has a certified costing, so
the arithmetic is ours and the card has to show it.

- **Category and group.** `category: "campaign"`, `group: "Recommendations from Parliament"`,
  `control.kind: "toggle"`. They render on the `recommendations` step, in `order`.
- **Badge.** `assumption`, never `direct`, unless the costing reuses a published row verbatim
  (only `it50` does, five one-penny steps of HMRC's additional-rate row).
- **Raw source.** `kind: "derivedFromPublished"` with a `method`, a `sourceId` and a `note` that
  says where the inputs come from and what the arithmetic assumes. `validate:data` reproduces
  the schedule from the method, so an edited figure fails.

| Method          | Fields                                                                              | Reproduces                                                          |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `gdpShareGap`   | `targetPctGdp`, `baselinePctGdp` by year                                            | (target − baseline) ÷ 100 × nominal GDP                             |
| `upratingGap`   | `rowId`, `baseYear`, `currentSeries`, `replacementSeries`                           | the extract's row × the compounding ratio of the two vintage series |
| `statedProduct` | `terms` (label, value, unit, source), `resultGbpm`, `baseYear`, optional `growWith` | the product of the terms, then flat in cash or grown with a head    |
| `seriesProduct` | two or more `terms`, each with `values` by year                                     | the terms multiplied year by year                                   |

- **One-off payments** set `costing.once: true` on the schedule with exactly one amount; it falls
  in the implementation year and nothing after.
- **Financial transactions** set `classification.psnflTreatment: "financialTransaction"`. The
  amount is borrowed and carries interest but is not spending, so borrowing and net financial
  liabilities do not move. Say so in the caveats.
- **Mixed current and capital** set `classification.capitalShare` with the published split in a
  caveat. Capital escapes the stability rule, so the split is not cosmetic.
- **Contested figures** open the `headline` with the word "contested" and carry the reason as a
  `legal`, `behavioural` or `administrative` consideration, cited. State the alternative
  published figure in the caveats where there is one.

### Budget day reactions (`data/journey/reactions.json`)

One `intro` and a list of signals. Each signal names an `audience`, a `measure` the engine reads
off the outcome, a `reading` label and unit for display, and `bands` in ascending order of `upTo`
with the last band carrying none. A band holds a `level`, a `headline` of at most 140 characters,
a `detail` and at least one source. No reaction text may live anywhere else: a test asserts that
every rendered headline and detail is one of these.

Market bands describe what commentators watch and cite the evidence (the OBR's interest-rate
sensitivity, the gilt yield in the context file). They never predict a market move.
