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
