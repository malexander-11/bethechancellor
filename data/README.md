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
journey/calendar.json     the in-game date of each stage
journey/pm.json           the Prime Minister: themes, flagships, the manifesto red lines, reactions
journey/ministers.json    a minister's lines for every spending and welfare lever
journey/interventions.json adviser lines with a closed predicate over the ambitions
journey/draws.json        the five forecast outcomes the seed chooses among (ADR-0012)
journey/compromise.json   the advisers' lines beside each route out of a gap
journey/rabbit.json       the prepared announcements for the speech
journey/speech.json       the speech fragments the assembler fills
journey/households.json   five household archetypes and the levers that touch them
journey/incidence.json    who each lever falls on, for the close
journey/verdicts.json     the kinds of Budget the close chooses between
journey/reception.json    Budget day: three audiences, their rules, bands, points and caps (ADR-0013)
journey/guide.json        the guide at the head of every screen: step, title, doing, why, now
journey/glossary.json     the words a newcomer will not know, defined in words
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
- **Relief-cost toggles.** `rawSource.kind: "hmrcReliefCost"` cites rows of a relief-cost
  extract by `sourceId`: `derived/hmrc-tax-reliefs-2026-01.raw.json` (HMRC's tax reliefs, Table 2)
  or `derived/hmrc-private-pensions-2026-07.raw.json` (HMRC's pension statistics, Table 6, with
  Tables 6.1 and 6.2 by marginal rate); `perUnit` is the published cost for the cited year,
  uprated with the tax head. Quote HMRC's caveat in the caveats.
- **Scorecard-backed toggles.** A `linearPerUnit` toggle may cite `hmtScorecard` lines from any
  extracted scorecard (Budget 2025 or Autumn Budget 2024) by `sourceId`; `perUnit` is minus the
  summed lines for the cited years on the receipts side. `direction: "repeat"` makes it plus the
  lines: the measure done again, on the assumption that the second round raises what the Treasury
  costed for the first. A repeat is an assumption, so it wears `badge: "assumption"`, says so in
  its caveats and sits in its tax group beside the certified rows (ADR-0017).
- **Vintage-series lookup points.** `points[].from.vintageSeries` ("receiptsByTax.inheritanceTax")
  with a `multiplier`; checked against the vintage.
- **Briefings** need an existing adviser who speaks on the step, a real lever group for group
  briefings, and at least one source per paragraph. **Context readings** that name a
  `leverCode` need a `suggestion` rule (`gap` or `authored`).
- **Published ranges** (`reading.alternatives`) carry the `lowest` and `highest` rows of a forecast
  comparison, the comparator row from the same table (`against`) and a `note` saying what basis
  they are on. They are named for what they are, not for the cards they feed: which one is the
  optimistic case depends on which way the slider moves borrowing, which is derived from the
  lever's OBR sensitivity. `against` is mandatory and separate from the reading's own `obr` block because the
  two can differ: the rates reading compares 10-year gilt yields, but the published range is for
  Bank Rate, which the note has to say. All three rows must cover the same years, since the gap
  rule averages over them. A range needs a `leverCode`; the validator checks all of this.
- **Scenarios** (`context.scenarios`) carry a card's words only — title, headline and rationale
  paragraphs with sources. Never author its slider settings: those are derived in
  `apps/web/src/journey/scenarios.ts` from the rows above, so a tampered figure moves the card.
  The two analysts pick, per slider, the kindest and cruellest of every published candidate — the
  OBR's own assumption, the adviser's reading, and both range rows — which is what keeps the four
  cards ordered by headroom whatever a data refresh does.
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
  rejected. A receipts line can be scaled the same way: `baseline.from: "vintage"` with a
  `receiptsByTax.*` series on a `side: "receipts"` lever (business rates, `brates`). The schema
  ties the line to the side, a published plan is always a spending baseline, and the badge stays
  `mechanical`: a share of an OBR line is arithmetic, whichever side it sits on.
- **Welfare cap.** Set `insideWelfareCap: true` on current spending levers whose line is inside
  the cap and state the by-line approximation in the caveats.
- **Barnett.** Set `classification.barnettConsequential: true` on comparable departments and add
  `devolution` considerations (with `appliesWhen` above/below 0) citing the Statement of Funding
  Policy; never add a numeric knock-on.

### Our own arithmetic (any folder)

Where nobody has published a costing, the arithmetic is ours and the card has to show it. Such a
lever lives in the folder of its real category and the group of the screen it belongs to
(`tax` · `Capital gains`, `spend` · `Flagship programmes`); the badge, not the folder, keeps it apart
from the certified rows beside it (ADR-0017).

- **Category and group.** The lever's real `category` and the `group` of the tab it sits in,
  ordered by `order`; `control.kind: "toggle"` unless a published line supports a scale (business
  rates scales the OBR's line and is `mechanical`, see the spending notes above).
- **Badge.** `assumption`, never `direct`. A `repeat` of a scorecard line, a `statedProduct`, a
  `weightedSum`, a `gdpShareGap`, and a multiple of an HMRC row beyond the small change HMRC
  publishes (`it50`, five one-penny steps) are all assumptions (ADR-0018).
- **Not on the table.** A live, costed option nobody proposes (the VAT base toggles, capital gains
  on main homes) carries `notOnTheTable: { note, sources }`. It wears a quiet tag, sorts to the foot
  of its group, and the note says why it is here; the sources say who has not proposed it. The
  Director of Tax's suggestions on the compromise step never name one.
- **A cost as a product.** A `statedProduct` term may be negative: the electricity card multiplies
  the government's six-month £850 million by −2, so the result is a cost to receipts and the
  validator still reproduces it.
- **Netting a certified line.** A `weightedSum` may carry a published scorecard value with a
  factor of −1 where a think tank's figure predates a change the Treasury has since scored (the
  alignment card nets Autumn Budget 2024 line 27 off CenTax's £14.3 billion); the note says whose
  step that is.
- **Press for words only.** A press or professional-firm page may be registered (org `Other`)
  to source a sentence on a card or in a briefing, never a figure in a costing; its `notes` say so.
- **Protected or unprotected.** A department lever carries `commitment: { kind, text, sources }`,
  `protected` or `unprotected`, sourced to the paragraph of the OBR's forecast that says so. The
  card wears the word as a glossary tag and the text under "What this assumes".
- **Raw source.** `kind: "derivedFromPublished"` with a `method`, a `sourceId` and a `note` that
  says where the inputs come from and what the arithmetic assumes. `validate:data` reproduces
  the schedule from the method, so an edited figure fails.

| Method          | Fields                                                                                      | Reproduces                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `gdpShareGap`   | `targetPctGdp`, `baselinePctGdp` by year                                                    | (target − baseline) ÷ 100 × nominal GDP                                          |
| `upratingGap`   | `rowId`, `baseYear`, `currentSeries`, `replacementSeries`                                   | the extract's row × the compounding ratio of the two vintage series              |
| `statedProduct` | `terms` (label, value, unit, source), `resultGbpm`, `baseYear`, optional `growWith`         | the product of the terms, then flat in cash or grown with a head                 |
| `seriesProduct` | two or more `terms`, each with `values` by year                                             | the terms multiplied year by year                                                |
| `weightedSum`   | `terms` (label, value, factor, unit, source), `resultGbpm`, `baseYear`, optional `growWith` | the sum of value × factor over the terms, then flat in cash or grown with a head |

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
- **Shelving.** A lever nobody is considering stays in the data with `deprecated: true`,
  `group: "Shelved"`, `order: 900` and the headline "Kept for the record; not on offer at this
  Budget. Old links still work." Its costing, raw source and considerations stay, so
  `validate:data` and the engine tests keep reproducing it; the app filters it out at load, the
  incidence, minister and suggestion checks skip it, and an old link decodes it as an unknown
  code with a warning. Nothing live may name it: no incidence tag, no draw revision, no flagship,
  no rabbit card, no household touch.

### Budget day reception (`data/journey/reception.json`, ADR-0013)

One `intro` and three `audiences` (`backbenchers`, `markets`, `public`), each with a `title`, the
`question` it asks, five `labels` worst first, and `rules`. A rule names a `measure` the engine
reads off the outcome (the closed list in `readingMeasureSchema`), a `reading` label and unit, a
`note` naming the published anchor its thresholds lean on, and `bands` in ascending order of `upTo`
with the last carrying none. A band holds `points` (−3 to +3), an optional `cap` on the audience's
rating, a `text` with `{value}` (the reading, signed) and `{abs}` (its size) placeholders, its
sources and `badge: "simulated"`. The rating is three plus the points, clamped to one to five, then
held under any fired cap. A band that quotes a figure must carry a source; a test checks it, and
that every reason on screen is one of these bands with its placeholders filled.

Bands describe what an audience watches and cite the evidence. They never predict a market move
or a vote; they say what a judgement leans on.

A rule whose reading is money or percentage points may carry a `nudge`: one sentence with `{gap}`
for the distance from the reading to the nearest neighbouring band with more points, in the
reading's own unit. The engine fills the gap and shows the sentence under "Why this rating"; it
invents no threshold, and says nothing for the best band there is (ADR-0018).

### Decisions since the forecast (`data/context/*.json`)

`decisionsSinceForecast` lists what the government has decided since the vintage was published:
`{ id, title, amountGbpm, year, paidFor, sources }`, the amount on the government's own figure
(negative costs money), the year or period as the source states it, and what paid for it. Context,
not levers: none of it enters the arithmetic, the OBR has not certified any of it, and the outlook
says so above the table.

### The guide and the glossary (`data/journey/guide.json`, `glossary.json`)

One guide entry per screen: `step`, `number` (one to seven; the package's three screens and the two
forecast screens share a number), `title` (the page's heading), and `doing`, `why`, `now`, at most
sixty words together. A word in square brackets, `[headroom]` or `[the OBR](obr)`, is a glossary
reference and must exist in `glossary.json`; `terms` lists more to show under "Words on this
page". Guide and glossary are chrome: no badge, and no figure unless the glossary entry carries a
source.

### Simulated content (`data/journey/*.json`, ADR-0011)

Everything a role says is a `SimulatedLine`: `{ text, short?, sources, badge: "simulated" }`,
badged per item so no line inherits honesty from its file. `short` is the same line in at most
eighteen words, shown first with the full `text` one click behind; every minister's asking line
has one, and any band over eighteen words. A figure in the short line must be a figure in the long
one, so the sources cover both (a test checks it). Rules for authoring one:

- **Never type a number the engine or a document did not produce.** A line may quote a published
  figure (with the source beside it) and the page may print an engine figure next to the line; the
  line itself never invents one. A test fails a minister or a household that quotes a figure without
  a source.
- **Roles only.** "The Prime Minister", "the Justice Secretary", "MPs in marginal seats". No real
  person's name, and no description that identifies one.
- **Predicates are closed.** Interventions, verdict kinds and household touches choose from enums the
  engine evaluates; a new condition needs code, not a string.
- **Draws name candidates and considerations, never values.** An outcome says `rate: "adviser"` or
  `rpi: "highest"` and the engine derives the figure; a re-scoring names a consideration id and the
  validator refuses one that sits on a certified row.
- The speech's `{…}` placeholders are filled from data and the outcome; a test checks every pound
  sign in the assembled text against the engine.
