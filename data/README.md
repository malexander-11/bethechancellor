# Data

Everything the engine reads lives here as JSON validated by the schemas in
`packages/engine/src/schema`. Nothing is hard-coded in the app.

Every figure and every line carries a `badge` naming its kind: `direct`, `mechanical`, `assumption`,
`commentary` or `simulated` (ADR-0002, ADR-0011). Since ADR-0034 no screen shows it. The field is
the data's record of what each figure is: the validator and the tests hold every figure to it, and
the markets' credibility rule reads it. Where this file says something is badged, or wears or shows
a badge, read it as the field it carries.

```
sources/sources.json      registry of every source document (id, org, title, url, dates, licence)
vintages/<id>/vintage.json  one OBR forecast: years, economy, fiscal aggregates, sensitivities, checks
rules/<id>.json           a Charter for Budget Responsibility rule set
levers/<category>/*.json  policy levers (tax, spend, welfare) and the economy's assumptions (macro)
reference/*.json          non-forecast reference numbers (e.g. UK households)
context/<yyyy-mm>.json    the context: what was decided since the forecast, the in-tray, and two
                          published figures kept for the record (readings retired, ADR-0045)
journey/advisers.json     the adviser roles (titles, remits, steps)
journey/pm.json           the Prime Minister: the promises and red lines, and the sign-off
journey/budget2026.json   the Budget the game starts from: its story, facts, measures and the walk's themes
journey/balance.json      the balance page's two menus: ways to find money, and priorities (ADR-0046)
journey/ministers.json    a minister's lines for every spending and welfare lever
journey/households.json   five household archetypes and the levers that touch them
journey/incidence.json    who each lever falls on
journey/reception.json    Budget day: three audiences, their rules, bands, points and caps (ADR-0013)
journey/guide.json        the guide at the head of every screen: step, title, now
journey/glossary.json     the words a newcomer will not know, defined in words
raw/<source-id>/          committed copies of small source files, with sha256 in the registry
derived/                  pipeline outputs (regenerated in CI and compared with the commit)
```

## Conventions

- Money is in **£ million** (`unit: "GBPm"`). Shares of GDP are in per cent (`pctGDP`).
- Fiscal years are `YYYY-YY` strings; calendar years are `YYYY`. A series declares which
  (`periodicity: "FY" | "CY"`).
- Every series, sensitivity and costing has a `source`
  (`{ sourceId, table?, page?, paragraph?, quote?, note? }`) pointing into `sources/sources.json`.
- A number that was transformed from its source carries `derivation: [DerivationStep]` and, if it
  rests on rounded inputs or an interim assumption, `provisional: true`.
- Signs: receipts positive = more revenue; spending positive = more spending; PSNB positive =
  borrowing. Convert source conventions at extraction and record a `signFlip` step.
- Lever `code`s are short, stable and never reused; they appear in permalinks.
- A lever is shown in production only when `status` is `reviewed`.

## Rebasing to a new forecast

Create `vintages/<new-id>/vintage.json` with its `policyStart` (the April after its fiscal event,
the first year any lever takes effect), run `npm run validate:data`, change the default vintage in
the pipeline's dataset and the engine's test fixtures, and keep the old vintage so existing
permalinks still render. Every lever derived from a published figure is re-derived on the new series
and the validator names each mismatch; a lever whose base year is an outturn the new vintage no
longer prints needs that year carried over, marked provisional, as 2024-25 was in October 2026.
Write the new context file (every context is held to the default vintage) and the Budget file the
game starts from (`journey/budget2026.json`, below), whose facts quote the Budget document and whose
measures join the scorecard the pipeline extracts from it.

## Authoring a lever

1. Start from the published table: find the row in `derived/hmrc-trr-2025-06.raw.json` (cite its
   `rowId`, label and values under `costing.rawSource.rows`, with `hmrcSign` yield or cost and
   `role` increase or decrease) or the scorecard line in
   `derived/hmt-budget-2025-table-4-1.raw.json` or `derived/hmt-budget-2026-table-6-1.raw.json`
   (cite `number`, title and values under `costing.rawSource.lines`).
2. Write the engine-sign tables (`perUnit`, `decreasePerUnit`, lookup `effect`, or schedule
   `effect`): receipts positive means more revenue. For a scorecard reversal the schedule is minus
   the summed lines. `npm run validate:data` rebuilds these from the cited rows and fails on any
   difference.
3. Keep control ranges inside what the source publishes: increase-only rows give increase-only
   levers; lookup ranges stay within the published points.
4. State the baseline (`baselinePolicy`, `alreadyIncludes`) from Budget 2025 Table 4.1 or the EFO.
5. Add considerations only from documents readable in this repository's sources registry, with
   `alreadyInDirectCosting: true` when the published figure already contains the behaviour.
6. Give the lever a `group` (its family), a unique stable `code` and a plain `name`, the words the
   review and the shared picture read it back by ("The main rate of VAT"; without one it goes by its
   `shortTitle`), and set `status: reviewed` with `reviewedOn` once the above is checked. A lever
   the game offers is a measure's, asked about on a card, or an option on a balance menu (below);
   the rest stay for old links and the record.

### Levels and the journey

- **Levels.** Give a rate or threshold lever `control.level` (`baseline`, `unit`,
  `apply: add | pctChange`, `label`, `source`, optional `decimals` and `note`) so the app shows "20%
  → 21%". The level never enters the costing; percentage-of-baseline levers need no level metadata.
- **Selects.** `control.kind: "select"` with `labels` keyed by value ("-40": "Abolish (0%)"); the
  engine snaps to the nearest offered option.
- **Relief-cost toggles.** `rawSource.kind: "hmrcReliefCost"` cites rows of a relief-cost extract by
  `sourceId`: `derived/hmrc-tax-reliefs-2026-01.raw.json` (HMRC's tax reliefs, Table 2) or
  `derived/hmrc-private-pensions-2026-07.raw.json` (HMRC's pension statistics, Table 6, with Tables
  6.1 and 6.2 by marginal rate); `perUnit` is the published cost for the cited year, uprated with
  the tax head. Quote HMRC's caveat in the caveats.
- **Relief costs are flagged** (Phase 25, ADR-0026). `reliefCost: true` on every lever built on
  HMRC's cost of a relief, whether it cites the relief rows or does stated arithmetic on them (ten
  today). The schema refuses a relief-cost raw source without it, and allows it only on a receipts
  lever. The card then reads "raises at most £X" with one plain line on why, and the markets count
  the lever among the costings nobody has certified.
- **A multiple of HMRC rows.** `rawSource.multiplier` scales the summed rows of a `linearPerUnit`
  lever: 1.25 for the health and social care levy over the one-point NICs rows (retired in ADR-0035,
  its costing kept), minus three for the fuel duty freeze over the 1% rows. It is our arithmetic on
  HMRC's figures, so the schema requires `badge: "mechanical"`.
- **The range the source covers.** `control.sourceRange: { min, max, text }` (Phase 25): HMRC
  vouches for scaling a 1p row to about 2p, not beyond. It must hold the default and sit inside the
  control's range; `text` (at most 140 characters) says how far the source goes.
- **The lever's noun.** `noun`, in lower case ("the basic rate of income tax", "the health budget"):
  how a Budget-day reason names its causes after "Because of".
- **Two levers that count the same money.** An interaction with `severity: "excludes"`, authored
  once per pair (the validator checks): the two count the same money, so only one may count at a
  time. The text must read from either lever and in either direction (Phase 26), each sentence at
  most twenty words. A link that carries both still opens. `info` and `warn` remain notes.

- **Scorecard-backed toggles.** A `linearPerUnit` toggle may cite `hmtScorecard` lines from any
  extracted scorecard (Budget 2026, Budget 2025 or Autumn Budget 2024) by `sourceId`; `perUnit` is
  minus the summed lines for the cited years on the receipts side. `direction: "repeat"` makes it
  plus the lines: the measure done again, on the assumption that the second round raises what the
  Treasury costed for the first. A repeat is an assumption, so it wears `badge: "assumption"`, says
  so in its caveats and sits in its tax group beside the certified rows (ADR-0017).
- **Vintage-series lookup points.** `points[].from.vintageSeries` ("receiptsByTax.inheritanceTax")
  with a `multiplier`; checked against the vintage.
- **The Chancellor's measures** (`b6*`, ADR-0045) are toggles whose default, 0, is the Budget as
  delivered; on, each reverses its measure. The costing is a `schedule` whose effect is minus the
  summed lines it cites from the extracted scorecard (`costing.rawSource.hmtScorecard`, lines by
  number with their titles as extracted), so the validator can check the sum; `baselinePolicy` and
  the `hmt-costing` consideration cite the policy costings document by page. One file a measure,
  `levers/<category>/budget-2026-<slug>.json`, with a minister, an incidence tag and a household for
  each spending one. A measure the Budget overtook is shelved: `deprecated: true`, group "Shelved",
  the one shared headline, its costing kept so old links still work.
- **No readings.** The context carries no readings since ADR-0045: the forecast is the estimate, and
  a link's own economic settings are dropped with a note. The schema accepts an empty list and
  nothing more.

### Spending levers

- **Sides and signs.** Spending levers carry `classification.side: "spending"`; spending positive
  means more spending. An HMRC `cost` row is then positive and a `yield` row negative, and a
  scorecard reversal's schedule equals plus the summed lines. `validate:data` applies the side-aware
  rule, so authoring the tax-side sign fails.
- **Percentage-of-baseline costings** (`kind: "pctOfBaseline"`, badge `mechanical`, control unit
  `pct`) scale either a vintage series (`baseline.from: "vintage"`, e.g. `cdel`,
  `disabilityBenefits`) or a published plan (`baseline.from: "published"`) with `years`, `values` in
  £ million, `extendWith` (the vintage series that carries the last plan year forward) and a
  `rawSource` of kind `hmtSr25` citing rows of `derived/hmt-sr25-del.raw.json` by `rowId`, label and
  values. Rows with `role: "subtract"` build a residual; memo rows ("of which", "Memo:") are
  rejected. A receipts line can be scaled the same way: `baseline.from: "vintage"` with a
  `receiptsByTax.*` series on a `side: "receipts"` lever (business rates, `brates`). The schema ties
  the line to the side, a published plan is always a spending baseline, and the badge stays
  `mechanical`: a share of an OBR line is arithmetic, whichever side it sits on.
- **Welfare cap.** Set `insideWelfareCap: true` on current spending levers whose line is inside the
  cap and state the by-line approximation in the caveats.
- **Barnett.** Set `classification.barnettConsequential: true` on comparable departments and add
  `devolution` considerations (with `appliesWhen` above/below 0) citing the Statement of Funding
  Policy; never add a numeric knock-on.

### Our own arithmetic (any folder)

Where nobody has published a costing, the arithmetic is ours and the card has to show it. Such a
lever lives in the folder of its real category and the group of the screen it belongs to (`tax` ·
`Capital gains tax`, `spend` · `New programmes`); the badge, not the folder, keeps it apart from the
certified rows beside it (ADR-0017).

- **Category and group.** The lever's real `category` and its family `group`;
  `control.kind: "toggle"` unless a published line supports a scale (business rates scales the OBR's
  line and is `mechanical`, see the spending notes above).
- **Badge.** `assumption`, never `direct`. A `repeat` of a scorecard line, a `statedProduct`, a
  `weightedSum`, a `gdpShareGap`, and a multiple of an HMRC row beyond the small change HMRC
  publishes (`it50`, five one-penny steps) are all assumptions (ADR-0018).
- **Not on the table.** A live, costed option nobody proposes (the VAT base toggles, capital gains
  on main homes) carries `notOnTheTable: { note, sources }`. It wears a quiet tag, sorts to the foot
  of its group, and the note says why it is here; the sources say who has not proposed it.
- **A cost as a product.** A `statedProduct` term may be negative: the electricity card multiplies
  the government's six-month £850 million by −2, so the result is a cost to receipts and the
  validator still reproduces it.
- **Netting a certified line.** A `weightedSum` may carry a published scorecard value with a factor
  of −1 where a published figure overlaps a change the Treasury has since scored (the Motability
  card nets Budget 2025 line 14 off HMRC's relief row); the note says whose step that is. When the
  source re-costs on the new baseline, the netting goes (the alignment card, ADR-0020).
- **Think-tank figures.** A think tank's costing may be a card when its own document is fetched,
  registered (org `Other`, or `RF`; licence `Other`) with the sentence quoted in its `notes`, and
  cited as the `statedProduct` or `weightedSum` term. The card is badged `assumption`, says static
  or after behaviour, scores an "up to" range at the cautious published figure with the ceiling in
  words, carries the `static-not-yield` consideration where the figure is static, and names any step
  of ours (growing, placing, netting). Party documents are context, never a card. A figure quoted
  second-hand says so.
- **Earliest start.** A card whose measure cannot take effect from the game's first year carries
  `earliestStart: { year, text, sources }`: the first fiscal year it can start on its source's own
  timetable (legislation, systems, valuation, transitional protection), the sentence that says why,
  and the sources that say so. The effect map stays as the method reproduces it; the engine zeroes
  the earlier years at run time and a player's delay can only push the start later. The year must be
  one the vintage covers (`validate:data`), a macro lever may not carry one, and the headline names
  the year. A `linearPerUnit` or `lookupTable` costing with a floor would shift its published
  profile to the floor year rather than zero it; none carries one today.
- **Press for words only.** A press or professional-firm page may be registered (org `Other`) to
  source a sentence on a card or in a briefing, never a figure in a costing; its `notes` say so.
- **Protected or unprotected.** A department lever carries `commitment: { kind, text, sources }`,
  `protected` or `unprotected`, sourced to the paragraph of the OBR's forecast that says so. The
  card wears the word as a glossary tag and the text under "What this assumes".
- **Raw source.** `kind: "derivedFromPublished"` with a `method`, a `sourceId` and a `note` that
  says where the inputs come from and what the arithmetic assumes. `validate:data` reproduces the
  schedule from the method, so an edited figure fails.

| Method          | Fields                                                                                      | Reproduces                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `gdpShareGap`   | `targetPctGdp`, `baselinePctGdp` by year                                                    | (target − baseline) ÷ 100 × nominal GDP                                          |
| `upratingGap`   | `rowId`, `baseYear`, `currentSeries`, `replacementSeries`                                   | the extract's row × the compounding ratio of the two vintage series              |
| `statedProduct` | `terms` (label, value, unit, source), `resultGbpm`, `baseYear`, optional `growWith`         | the product of the terms, then flat in cash or grown with a head                 |
| `seriesProduct` | two or more `terms`, each with `values` by year                                             | the terms multiplied year by year                                                |
| `weightedSum`   | `terms` (label, value, factor, unit, source), `resultGbpm`, `baseYear`, optional `growWith` | the sum of value × factor over the terms, then flat in cash or grown with a head |

- **One-off payments** set `costing.once: true` on the schedule with exactly one amount; it falls in
  the implementation year and nothing after.
- **Financial transactions** set `classification.psnflTreatment: "financialTransaction"`. The amount
  is borrowed and carries interest but is not spending, so borrowing and net financial liabilities
  do not move. Say so in the caveats.
- **Mixed current and capital** set `classification.capitalShare` with the published split in a
  caveat. Capital escapes the stability rule, so the split is not cosmetic.
- **Contested figures** open the `headline` with the word "contested" and carry the reason as a
  `legal`, `behavioural` or `administrative` consideration, cited. State the alternative published
  figure in the caveats where there is one.
- **Shelving.** A lever nobody is considering, or one the user takes off the table (the nine of
  ADR-0035), stays in the data with `deprecated: true`, `group: "Shelved"` and the headline "Kept
  for the record; not on offer at this Budget. Old links still work." Its costing, raw source and
  considerations stay, so `validate:data` and the engine tests keep reproducing it; the build leaves
  it out of the app, the incidence, minister and suggestion checks skip it, and an old link decodes
  it as an unknown code with a warning. Nothing live may name it: no incidence tag, no card, no menu
  option, no household touch. `validate:data` checks the game as shipped as well as the whole set,
  so a file that does is refused.

### Budget day reception (`data/journey/reception.json`, ADR-0013)

One `intro` and three `audiences` (`backbenchers`, `markets`, `public`), each with a `title`, the
`question` it asks, five `labels` worst first, and `rules`. A rule names a `measure` the engine
reads off the outcome (the closed list in `readingMeasureSchema`), a `reading` label and unit, a
`note` naming the published anchor its thresholds lean on, which no screen lists but which is the
written record of the judgement (ADR-0043), and `bands` in ascending order of `upTo` with the last
carrying none. A band holds `points` (−3 to +3), an optional `cap` on the audience's rating, a
`text` with `{value}` (the reading, signed) and `{abs}` (its size) placeholders, its sources and
`badge: "simulated"`. The rating starts at three: one or two points either way move it one step,
three or more two steps (Phase 25), and it is then held under any fired cap. A band that quotes a
figure must carry a source; a test checks it, and that every reason on screen is one of these bands
with its placeholders filled.

Since Phase 25 (ADR-0026) a rule also carries a `short` label of three words or fewer ("Tax
burden"), which is how a card names it on the other side of its rating: "Counted against: Tax burden
· Borrowing". A band may carry `alsoWhen: { measure, above }`: it also applies when a second reading
passes a threshold, as cuts to health and schools count from £2bn inside the public's rule on
service cuts; the points, cap and words stay the band's own. A band may vary its words on a second
reading (`variants`). Readings are measured from before the Budget (the Chancellor's Budget with
nothing moved), and the placeholders now include `{typicalError}`, `{payers}`, `{feltHow}`,
`{protected}`, `{protectedCut}`, `{cutServices}` and `{year}`.

Bands describe what an audience watches and cite the evidence. They never predict a market move or a
vote; they say what a judgement leans on.

### The rules' plain names (`data/rules/*.json`)

Each rule carries a `shortName`, the plain name the game uses on screen ("the day-to-day rule", "the
debt rule", "the welfare cap"), carried into every rule verdict (Phase 25).

### Decisions since the forecast (`data/context/*.json`)

`decisionsSinceForecast` lists what the government has decided since the vintage was published:
`{ id, title, amountGbpm, year, paidFor, sources }`, the amount on the government's own figure
(negative costs money), the year or period as the source states it, and what paid for it. Context,
not levers: none of it enters the arithmetic and the OBR has not certified any of it. No screen
shows it since the briefing became plain copy (ADR-0031); the validator still checks its sources.

`inTray` (Phase 25) lists what is already on the Chancellor's desk: a bill or a cliff edge the
Budget inherits, `{ id, text, badge, leverCode, sources }`. The text is one sentence of at most 140
characters; `{cost}` in it is the named lever's own figure in the target year, filled by the engine.
`leverCode` names the lever that deals with it, so the review can list the items a Budget leaves as
they are; the validator refuses an unknown lever.

`briefing` (Phase 28, ADR-0030) holds two published figures the briefing stated while there was one;
since ADR-0045 no screen shows them, and they are kept for the record:
`averageHeadroom { gbpm, since, source }`, the average margin Chancellors have left against their
rules (the OBR's record), and `giltSales { gbpm, year, source }`, the gilts the government plans to
sell in a fiscal year (HM Treasury's remit for the Debt Management Office). Each source names its
paragraph and page and must quote the passage the figure is read from; the validator refuses a
figure that quotes nothing, and gilt sales for any year but the one `asOf` falls in.

### The guide and the glossary (`data/journey/guide.json`, `glossary.json`)

One guide entry per step, and one for the Budget the game starts from (`start`, the landing page,
ADR-0048): `step`, `number` (one to four), `title` (the page's heading) and `now`, the one line
under it saying what to do, at most ten words on the road. A word in square brackets, `[headroom]`
or `[the OBR](obr)`, is a glossary reference and must exist in `glossary.json`. Guide and glossary
are chrome: no badge, and no figure unless the glossary entry carries a source. (The `doing`, `why`
and `terms` fields, and the "Why this matters" fold they filled, went in Phase 23.)

### The Prime Minister (`data/journey/pm.json`, ADR-0022)

`pm.json` names the government's `promises`, with sources. Each `promise` has `breaks`, the levers
that break its words, and may have `strains` (Phase 23): the levers that keep its words and test its
spirit, each with a line saying why; the game marks a strain amber and a break red, and a lever is
in one list or the other, never both. Since Phase 25 (ADR-0026) a promise also carries:

- `noun`, in lower case, for running sentences ("I accepted breaking the tax lock");
- `tag`, its short name on a lever's resting tag, at most 24 characters ("Tax lock: no rise");
- `origin`: `manifesto-2024`, `budget-2025` or `government`. Only the 2024 manifesto's own words are
  red lines the public holds the government to (the tax lock, the corporation tax cap, the triple
  lock); a Budget 2025 decision reversed is a U-turn;
- `judgedBy`: `levers` (the default), or `fiscalRules` for the fiscal rules, which are judged by the
  verdicts and name no lever;
- on a strain, `scored` (default true). A strain with `scored: false` is shown in amber and scored
  by no audience, because another rule already counts it: a cut to health strains England's 18-week
  target, and the public's rule on service cuts counts the cut.

`pm.json` also carries `signOff`: four lines the Prime Minister signs the review off with, chosen by
first match (`rulesMissed`, with `{rules}`; `brokenWithRoom`, `broken` and `strained`, with
`{promises}`). Each is a `SimulatedLine` of twenty words or fewer with no figure: the schema refuses
either. The priorities, the ways to deliver them and the review's lines on a priority short of
delivery went with the Chancellor's Budget as the starting point (ADR-0045).

### The Chancellor's Budget (`data/journey/budget2026.json`, ADR-0045)

The Budget the game starts from, as the landing page tells it (ADR-0048): `title`, `deliveredOn`,
the `chancellor` (the one place a person is named, with a source that quotes it), the `scorecard`
its measures join to (the source id of an extracted scorecard), `facts`, `story`, `measures` and
`themes`.

- **Facts** are the published steps of the margin since the last forecast, £ million, each with a
  source that quotes the passage it is read from: the margin in March, what debt interest took, the
  other changes, the margin before the measures and what the measures did to it. The validator
  checks the arithmetic: the first three give the fourth, and the fourth plus the fifth gives the
  headroom the vintage's check pins, within its tolerance.
- **The story** is lines of plain words with `{placeholders}` the page fills from the facts and the
  engine (`march`, `debtInterest`, `other`, `before`, `measures`, `headroom`, `welfareGap`, `tax`,
  `spending`, `year`), each with sources; no figure is typed, and the validator refuses a
  placeholder the page has no fill for.
- **The measures** list every line of the scorecard once: `id` (`m` and a number, unique; the line's
  number by convention), `line`, `plain` (one or two sentences of at most 200 characters, held to
  the readability test), and either `leverCode`, the lever that reverses it, or nothing, with
  `notMovable.reason` where a reader would expect to move it. A lever named must exist, be live, be
  asked about on a card (below) and be costed from that line of that scorecard, and the pipeline
  checks that the list and the extract are the same list.
- **The walk** (`themes`, ADR-0046) groups the measures a player can reverse into themes, a page
  each: `{ id, title, lead, cards }`, with a title of at most 40 characters, a one-line lead of at
  most 140 and at most eight cards. A card is `{ lever, title, explain }`: the lever its measures
  name; a heading of at most 60 characters saying what the Chancellor did; and `explain`, a few
  sentences of at most 280 characters on what it means, with no sum in billions, since the page adds
  the Treasury's figure and the engine's. The validator holds every named lever to one card, a lever
  to at most one card, a card to at least one measure and a theme's id to one theme. The readability
  test reads the themes and the cards.
- **The last page** (`rest`, ADR-0049) groups the measures no card asks about that a reader would
  want to see: at most twenty rows `{ id, title, measures }`, each a plain heading of at most 60
  characters over the ids of the measures it stands for. A tick or a cross on a row is a vote on
  each of its measures, and its "See more" shows each measure's `plain` line and the lines of the
  scorecard they come from. The validator holds every id to a measure that no card asks about, and
  each measure to one row at most; the measures in no row stay in the list for the record and the
  scorecard check. The readability test reads the headings and the lines.

### The balance page's menus (`data/journey/balance.json`, ADR-0046, ADR-0049)

Three menus, each a list of options `{ code, step, label, each }`: the lever, how far one press
moves it in the lever's own unit, the label the player reads ("Schools", at most 48 characters) and
what one press does ("5% each time", at most 40). `budgets` are the spending budgets a player may
cut or add to, a step either way, so their `step` is positive; `raise` are the ways to find money
and `spend` the tax cuts and other priorities, each one way, the step's sign saying which. The page
prices every press on the engine; no figure is authored. Rules the validator enforces:

- **A live lever the game may offer.** Never a measure's lever, since its card asks about it; never
  a setting of the economy; and never investment, which the headroom counts only by its interest, so
  it would read as nearly free.
- **On the lever's own steps.** The first press lands inside the lever's range, on its grid and, for
  a select, on one of its labels. A toggle's step is 1: it switches on once.
- **A budget is a spending line on a scale.** A `budgets` option is a spend or welfare lever with a
  slider, and both its first steps, down and up, land on the lever.
- **Once.** No lever appears twice across the menus.

A test holds every press of a `raise` option to finding money, every press of a `spend` option to
spending it, and every cut to a budget to saving and every addition to spending, all the way along
the lever's range; and it holds every option to breaking no promise however far it goes, either way
for a budget. A strain is allowed, and the page tags the option with the promise's noun. The words
test holds a label to ten words and `each` to six, and a size word in a label to the engine's figure
for one press: "big" (or expensive, large, costly) only at £5bn or more, "small" (or cheap, little,
modest, tiny) only at £1bn or less.

### Households and who pays (Phase 25, ADR-0026)

- **Households** (`households.json`). Each household names its `exposure`: the incidence groups
  whose levers reach its pay, its shop, its benefits or the services it uses. It says its
  `untouched` line only when nothing in those groups moved. When something did and none of its own
  touches fired, it says the file's `unnamed` line ("Nothing aimed at us by name that we could
  see."), so a tax rise on everyone is never "untouched". `reachesNone` lists the levers that reach
  none of the five by name (the bank levies, defence, a wealth tax on the very top); every lever on
  a card or a balance menu touches a household or is on it, a test checks it, and the validator
  refuses a code on the list that a household is touched by, or an exposure group that does not
  exist.
- **Who pays** (`incidence.json`). A paying group carries `felt`, the words that follow "felt" in a
  sentence ("in pay packets and prices", "through pay and prices"), at most sixty characters and no
  figure. `notFelt` lists the taxes most households do not feel: levies on banks, on energy
  producers and on the very top. They leave the public's count of tax rises and earn no point either
  way.

### Simulated content (`data/journey/*.json`, ADR-0011)

Everything a role says is a `SimulatedLine`: `{ text, short?, sources, badge: "simulated" }`, badged
per item so no line inherits honesty from its file. `short` is the same line in fewer words, shown
first with the full `text` one click behind. Every line a newcomer meets on the road has one when
the line is over its budget, and the words test pins each kind: a minister's asking line and any
band over eighteen words; the Prime Minister's reactions twelve; the advisers' notes fourteen; an
option's line eighteen; a balance menu's label ten and what one press does six, with a size word
only where the engine's figure for one press bears it out; every reception band twenty words in all
(Phase 23). A figure in the short line must be a figure in the long one, so the sources cover both
(a test checks it). A readability test reads every set a player meets with the folds closed: no
sentence over twenty words, and a Flesch-Kincaid grade of seven or below per set (ADR-0024). Rules
for authoring one:

- **Never type a number the engine or a document did not produce.** A line may quote a published
  figure (with the source beside it) and the page may print an engine figure next to the line; the
  line itself never invents one. A test fails a minister or a household that quotes a figure without
  a source.
- **Roles only.** "The Prime Minister", "the Justice Secretary", "MPs in marginal seats". No real
  person's name, and no description that identifies one.
- **Predicates are closed.** Interventions and household touches choose from enums the engine
  evaluates; a new condition needs code, not a string.
