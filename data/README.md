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
                          the suggestion rules that make today's estimate (ADR-0025)
journey/advisers.json     the adviser roles (titles, remits, steps)
journey/briefings.json    sourced adviser briefings per step and lever group
journey/pm.json           the Prime Minister: the eight priorities, the manifesto red lines
journey/options.json      the ways to deliver each priority (ADR-0022)
journey/finetune.json     the fine-tuning screens: hand-picked tax and spending levers (ADR-0025)
journey/ministers.json    a minister's lines for every spending and welfare lever
journey/interventions.json adviser lines with a closed predicate over the ambitions
journey/speech.json       the speech fragments the assembler fills
journey/households.json   five household archetypes and the levers that touch them
journey/incidence.json    who each lever falls on, for the close
journey/verdicts.json     the kinds of Budget the close chooses between
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
- **Relief costs are flagged** (Phase 25, ADR-0026). `reliefCost: true` on every lever built on
  HMRC's cost of a relief, whether it cites the relief rows or does stated arithmetic on them (ten
  today). The schema refuses a relief-cost raw source without it, and allows it only on a receipts
  lever. The card then reads "raises at most £X" with one plain line on why, and the markets count
  the lever among the costings nobody has certified.
- **A multiple of HMRC rows.** `rawSource.multiplier` scales the summed rows of a `linearPerUnit`
  lever: 1.25 for the health and social care levy over the one-point NICs rows, minus three for
  the fuel duty freeze over the 1% rows. It is our arithmetic on HMRC's figures, so the schema
  requires `badge: "mechanical"`.
- **The range the source covers.** `control.sourceRange: { min, max, text }` (Phase 25): HMRC
  vouches for scaling a 1p row to about 2p, not beyond. It must hold the default and sit inside
  the control's range. The curated screens stop there; the desk goes on, badges the effect Worked
  out past it and shows `text` (at most 140 characters).
- **The lever's noun.** `noun`, in lower case ("the basic rate of income tax", "the health
  budget"): how a Budget-day reason names its causes after "Because of", and how the speech names
  the measure.
- **Two levers that count the same money.** An interaction with `severity: "excludes"`, authored
  once per pair (the validator checks): the curated screens let only one be chosen at a time and
  offer a swap; the desk allows both and says "counted twice". `info` and `warn` remain notes.
- **A note on growth.** A `macro` consideration may carry `growth: true`: what the measure may do
  to growth and the wider economy, in words. The markets' fold on Budget day reads the biggest
  moved measure's; the schema refuses the flag on any other kind of note.
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
- **Today's estimate** (ADR-0025) is the `gap` rule run over every reading that names a
  `leverCode`, with the `authored` rule for growth: the one economy every game plans on. The
  published forecast ranges (`reading.alternatives`) and the forecast cards (`context.scenarios`)
  that Phases 7 to 23 read are retired, and the schema no longer accepts them.

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
  of its group, and the note says why it is here; the sources say who has not proposed it.
- **A cost as a product.** A `statedProduct` term may be negative: the electricity card multiplies
  the government's six-month £850 million by −2, so the result is a cost to receipts and the
  validator still reproduces it.
- **Netting a certified line.** A `weightedSum` may carry a published scorecard value with a
  factor of −1 where a published figure overlaps a change the Treasury has since scored (the
  Motability card nets Budget 2025 line 14 off HMRC's relief row); the note says whose step that is.
  When the source re-costs on the new baseline, the netting goes (the alignment card, ADR-0020).
- **Think-tank figures.** A think tank's costing may be a card when its own document is fetched,
  registered (org `Other`, or `RF`; licence `Other`) with the sentence quoted in its `notes`, and
  cited as the `statedProduct` or `weightedSum` term. The card is badged `assumption`, says static
  or after behaviour, scores an "up to" range at the cautious published figure with the ceiling in
  words, carries the `static-not-yield` consideration where the figure is static, and names any
  step of ours (growing, placing, netting). Party documents are context, never a
  card. A figure quoted second-hand says so.
- **Earliest start.** A card whose measure cannot take effect from the game's first year carries
  `earliestStart: { year, text, sources }`: the first fiscal year it can start on its source's own
  timetable (legislation, systems, valuation, transitional protection), the sentence that says why,
  and the sources that say so. The effect map stays as the method reproduces it; the engine zeroes
  the earlier years at run time and a player's delay can only push the start later. The year must
  be one the vintage covers (`validate:data`), a macro slider may not carry one, and the headline
  names the year. A `linearPerUnit` or `lookupTable` costing with a floor would shift its published
  profile to the floor year rather than zero it; none carries one today.
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
  code with a warning. Nothing live may name it: no incidence tag, no option, no fine-tuning
  item, no household touch.

### Budget day reception (`data/journey/reception.json`, ADR-0013)

One `intro` and three `audiences` (`backbenchers`, `markets`, `public`), each with a `title`, the
`question` it asks, five `labels` worst first, and `rules`. A rule names a `measure` the engine
reads off the outcome (the closed list in `readingMeasureSchema`), a `reading` label and unit, a
`note` naming the published anchor its thresholds lean on, and `bands` in ascending order of `upTo`
with the last carrying none. A band holds `points` (−3 to +3), an optional `cap` on the audience's
rating, a `text` with `{value}` (the reading, signed) and `{abs}` (its size) placeholders, its
sources and `badge: "simulated"`. The rating starts at three: one or two points either way move it
one step, three or more two steps (Phase 25), and it is then held under any fired cap. A band that
quotes a figure must carry a source; a test checks it, and that every reason on screen is one of
these bands with its placeholders filled.

Since Phase 25 (ADR-0026) a rule also carries a `short` label of three words or fewer ("Tax
burden"), which is how a card names it on the other side of its rating: "Counted against: Tax
burden · Borrowing". A band may carry `alsoWhen: { measure, above }`: it also applies when a second
reading passes a threshold, as cuts to health and schools count from £2bn inside the public's rule
on service cuts; the points, cap and words stay the band's own. A band may vary its words on a
second reading (`variants`). Readings are measured from before the Budget (today's estimate with
nothing moved), and the placeholders now include `{typicalError}`, `{payers}`, `{feltHow}`,
`{protected}`, `{protectedCut}`, `{cutServices}`, `{year}` and `{lateFrom}`.

Bands describe what an audience watches and cite the evidence. They never predict a market move
or a vote; they say what a judgement leans on.

A rule whose reading is money or percentage points may carry a `nudge`: one sentence with `{gap}`
for the distance from the reading to the nearest neighbouring band with more points, in the
reading's own unit. The engine fills the gap and shows the sentence under "Why this rating"; it
invents no threshold, and says nothing for the best band there is (ADR-0018).

### The rules' plain names (`data/rules/*.json`)

Each rule carries a `shortName`, the plain name the game uses on screen ("the day-to-day rule",
"the debt rule", "the welfare cap"), carried into every rule verdict (Phase 25). The briefing's
fold ties it to the Charter's own name.

### Decisions since the forecast (`data/context/*.json`)

`decisionsSinceForecast` lists what the government has decided since the vintage was published:
`{ id, title, amountGbpm, year, paidFor, sources }`, the amount on the government's own figure
(negative costs money), the year or period as the source states it, and what paid for it. Context,
not levers: none of it enters the arithmetic, the OBR has not certified any of it, and the outlook
says so above the table.

`inTray` (Phase 25) lists what is already on the Chancellor's desk: a bill or a cliff edge the
Budget inherits, `{ id, text, badge, leverCode, sources }`. The text is one sentence of at most 140
characters; `{cost}` in it is the named lever's own figure in the target year, filled by the
engine. `leverCode` names the lever that deals with it, so the review can list the items a Budget
leaves as they are; the validator refuses an unknown lever.

### The guide and the glossary (`data/journey/guide.json`, `glossary.json`)

One guide entry per screen: `step`, `number` (one to seven; the package's screens, the two
forecast screens and the two final-choices screens each share a number), `title` (the page's
heading, unless the page names itself, as each priority screen does) and `now`, the one line under
it saying what to do, at most ten words on the road. A word in square brackets, `[headroom]` or
`[the OBR](obr)`, is a glossary reference and must exist in `glossary.json`; the desk's tooltips
read the glossary too. Guide and glossary are chrome: no badge, and no figure unless the glossary
entry carries a source. (The `doing`, `why` and `terms` fields, and the "Why this matters" fold
they filled, went in Phase 23.)

### Priorities and options (`data/journey/pm.json`, `options.json`, ADR-0022)

`pm.json` names eight `priorities`: `id`, `title` and `noun` (at most forty characters each), a
plain `purpose`, the PM's `pitch` and `reaction`, and the `lead` (an adviser's or a minister's
role, as the data names it), with sources. Each `promise` has `breaks`, the levers that break its
words, and may have `strains` (Phase 23): the levers that keep its words and test its spirit, each
with a line saying why; the game marks a strain amber and a break red, and a lever is in one list
or the other, never both. Since Phase 25 (ADR-0026) a promise also carries:

- `noun`, in lower case, for running sentences ("I accepted breaking the tax lock");
- `tag`, its short name on a lever's resting tag, at most 24 characters ("Tax lock: no rise");
- `origin`: `manifesto-2024`, `budget-2025` or `government`. Only the 2024 manifesto's own words
  are red lines the public holds the government to (the tax lock, the corporation tax cap, the
  triple lock); a Budget 2025 decision reversed is a U-turn;
- `judgedBy`: `levers` (the default), or `fiscalRules` for the fiscal rules, which are judged by the
  verdicts and name no lever;
- on a strain, `scored` (default true). A strain with `scored: false` is shown in amber and scored
  by no audience, because another rule already counts it: a cut to health strains England's
  18-week target, and the public's rule on service cuts counts the cut.

A priority may carry `reach` (Phase 25): commentary, sourced, saying once on its flagship screen
where its spending reaches when that is not the whole UK ("Health and care budgets here are
England's…").

`pm.json` also carries `signOff`: four lines the Prime Minister signs the review off with, chosen
by first match (`rulesMissed`, with `{rules}`; `brokenWithRoom`, `broken` and `strained`, with
`{promises}`). Each is a `SimulatedLine` of twenty words or fewer with no figure: the schema refuses
either.
`options.json` holds one list, the ways to deliver (the ways to afford and the add-ons went in
Phase 24; the ways to pay are now levers on the fine-tuning screens, below). Every option's
`values` is a bundle of one or two levers at stated values: codes that exist and are not deprecated
or macro, values inside the control's range and on its grid, none the default. Rules the validator
enforces:

- **No lever in more than one option**, so an option's state (on, adjusted, off) is read from the
  levers alone, is never ambiguous, and no screen can light or undo another's option.
- **An option may name the options it counts the same money as**: `conflicts: [{ with, text }]`,
  `with` another option's id, `text` the reason in at most two hundred characters, best
  quoted from the levers' own interactions. Author each pair once, on one side; never on the option
  itself; never for an unknown id. While one is in the Budget the other's card is blocked and says
  why. Softer overlaps need no authoring: they are the levers' `interactions`, read from either
  side, named on the card before either option is chosen and quoted once the other moves.
- **Every priority has two to five ways to deliver it** (`deliver[].priority`); safer streets has
  two because the game has only two levers there, and its brief says so.
- **Every option says whether it delivers its priority in full or makes a start** (`scale`, Phase
  25): `{ kind: "full" | "start", why, sources, badge: "simulated" }`, the reason in at most 140
  characters. Every priority keeps at least one way to deliver it in full, which the schema checks.
  A priority with only starts in the Budget reads "started"; only a full delivery scores.
- **Every option carries one adviser's line** (`advice`, Phase 23): a `SimulatedLine` of at most
  twelve words with an `adviser` id who speaks on that screen and at least one source, saying who
  proposed it and one plain judgement of its cost and effect. No figure is typed; "big" (or
  expensive, large, costly) may be said only where the engine's own figure for the option is £5bn
  or more in the target year, "small" (cheap, little, modest, tiny) only at £1bn or less, and the
  words test checks both. Titles are unique.
- **The words are the proposer's** (`line`, a `SimulatedLine` with a `short`); the figure is never
  authored: the page prices the bundle with the engine against the Budget as it stands, and shows
  the headroom the move would leave. Titles say what the option does, in at most twelve words and
  eighty characters.

### Fine-tuning (`data/journey/finetune.json`, ADR-0025)

Two sides, `tax` and `spending`, each with its screen's `title` (at most four words) and `lead` (at
most ten), the `adviser` who speaks there, and `groups` of `items`. An item is a live lever's
`code`, a plain `title` (at most twelve words), the `move` the adviser's line judges (a toggle's
1; a slider's usual step) and the `advice`, a `SimulatedLine` with at least one source. Rules the
validator enforces:

- **A live lever on its own side, once.** Tax items are tax levers; spending items are spend or
  welfare levers; no code appears twice in the file.
- **A move the control can reach**, inside its range and on its grid, and never the setting the
  lever rests at.
- **Every tax sits with the people who pay it**: its group is the who-pays group (`WHO_PAYS` in the
  engine) its incidence pays-group maps to.
- **The adviser exists and speaks on this step** (`finetune` in `advisers.json`).

The words test holds every title and line to twelve words with no figure, and checks each size
word against the engine's own figure for the lever at its `move` (big at £5bn or more in the
target year, small at £1bn or less). The page prices the move against the Budget as it stands; no
figure is authored.

A side may carry `notes` (Phase 25): lines under the screen's lead that its 120 characters cannot
hold, such as how long the spending settlements run, each `{ text, badge, sources }` with the text
at most 160 characters and its own badge.

### Households, who pays, the speech and the close (Phase 25, ADR-0026)

- **Households** (`households.json`). Each household names its `exposure`: the incidence groups
  whose levers reach its pay, its shop, its benefits or the services it uses. It says its
  `untouched` line only when nothing in those groups moved. When something did and none of its own
  touches fired, it says the file's `unnamed` line ("Nothing aimed at us by name that we could
  see."), so a tax rise on everyone is never "untouched". `reachesNone` lists the levers that reach
  none of the five by name (the bank levies, defence, a wealth tax on the very top); every curated
  and flagship lever touches a household or is on it, a test checks it, and the validator refuses a
  code on the list that a household is touched by, or an exposure group that does not exist.
- **Who pays** (`incidence.json`). A paying group carries `felt`, the words that follow "felt" in a
  sentence ("in pay packets and prices", "through pay and prices"), at most sixty characters and
  no figure. `notFelt` lists the taxes most households do not feel: levies on banks, on energy
  producers and on the very top. They leave the public's count of tax rises and earn no point
  either way.
- **The speech** (`speech.json`). `forecast` says the forecast before any measure and what the
  Budget does to borrowing, all worked out (`{startYear}`, `{borrowingThen}`, `{targetYear}`,
  `{borrowingTarget}`, `{change}`). `opposition` holds the Leader of the Opposition's one-line
  reply, keyed by the Budget's biggest weakness (`rulesMissed`, `promiseBroken`, `taxUp`,
  `borrowingUp`, `cuts`, `default`): a role, never a name, and the schema refuses a digit.
- **The close** (`verdicts.json`). A kind may carry a `fact`: a worked-out sentence of at most 200
  characters shown beside the judgement with its own badge, its placeholders filled from the
  engine's figures ("Without the change to the basic rate of income tax, you would still meet both
  rules, with £36.1bn of headroom").

### Simulated content (`data/journey/*.json`, ADR-0011)

Everything a role says is a `SimulatedLine`: `{ text, short?, sources, badge: "simulated" }`,
badged per item so no line inherits honesty from its file. `short` is the same line in fewer
words, shown first with the full `text` one click behind. Every line a newcomer meets on the road
has one when the line is over its budget, and the words test pins each kind: a minister's asking
line and any band over eighteen words; the Prime Minister's reactions twelve; the advisers' notes
fourteen; the verdicts' close and an option's line eighteen; an option's or a curated lever's
adviser line (`advice`) twelve, with no figure and a size word only where the engine's figure bears
it out; every reception band twenty words in all (Phase 23). A figure in the short line must be a figure in the long one, so the sources cover both
(a test checks it). A readability test reads every set a player meets with the folds closed: no
sentence over twenty words, and a Flesch-Kincaid grade of seven or below per set (ADR-0024).
Rules for authoring one:

- **Never type a number the engine or a document did not produce.** A line may quote a published
  figure (with the source beside it) and the page may print an engine figure next to the line; the
  line itself never invents one. A test fails a minister or a household that quotes a figure without
  a source.
- **Roles only.** "The Prime Minister", "the Justice Secretary", "MPs in marginal seats". No real
  person's name, and no description that identifies one.
- **Predicates are closed.** Interventions, verdict kinds and household touches choose from enums the
  engine evaluates; a new condition needs code, not a string.
- The speech's `{…}` placeholders are filled from data and the outcome; a test checks every pound
  sign in the assembled text against the engine.
