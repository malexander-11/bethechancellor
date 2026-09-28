# ADR-0025: One estimate, six steps, curated levers

Date: 2026-09-27. Status: accepted; revised 2026-09-28 (below, ADR-0026). Revises ADR-0010,
ADR-0012, ADR-0022, ADR-0023 and ADR-0024, each of which carries a dated revision pointing here.

## Context

Playing the Phase 23 build (`495c505`), the user said:

> Remove the whole OBR headroom guessing stuff. Just give them the estimated headroom that they
> have and do that. None of the reveal and tinkering - needlessly complicated. Do allow users a
> space to tinker with tax and spending with the levers. 1. Briefing 2. Set our priorities 3. Flagship policies 4. Finetune tax and spend - make sure numbers are up 5. Deliver the budget 6. Feedback

Until then the game asked the player to guess the economy. The starting position offered four
forecasts to plan on and a headroom target to keep. After the Budget was built, a seeded draw
revealed "the OBR's forecast", re-scored some of the player's measures, and sent them through three
compromise screens and an add-ons screen before the review. The user wanted one known starting
figure, a straight road, and a real place to move the tax and spending levers.

Four points were settled with the user before building:

| Question                | Choice                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The one headroom figure | **Today's estimate, £6.8bn**: the OBR's March forecast brought up to date for today's gilt yields and inflation with the OBR's own sensitivities. It is fixed for the game and badged Assumption. No choice of forecast. |
| A headroom target       | **None: just meet the rules.** The bar says whether the rules are met. On Budget day the markets still mark down a thin margin.                                                                                          |
| The pay-for-it screen   | **"Expand it - the tax and spend levers should feel curated."** Step 4 becomes two screens of real, hand-picked levers for tax and for spending, with the full desk one link away.                                       |
| The add-ons             | **Dropped.** Step 5 is the review of the whole Budget and the red button.                                                                                                                                                |

## Decisions

### The six steps

| #   | Step (rail label)       | Routes                                       | The primary button                                            |
| --- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| 1   | Briefing                | `/` (the cover), `/outlook`                  | "Build my Budget", then "Set your priorities"                 |
| 2   | Set your priorities     | `/pm`                                        | "Agree these priorities"                                      |
| 3   | Flagship policies       | `/budget/deliver`, `/budget/deliver/2`, `/3` | "Next: {next priority}", then "Next: fine-tune tax and spend" |
| 4   | Fine-tune tax and spend | `/finetune/tax`, `/finetune/spending`        | "Next: spending", then "Next: deliver the Budget"             |
| 5   | Deliver the Budget      | `/review`                                    | "Deliver my Budget" (red)                                     |
| 6   | Feedback                | `/budget-day`                                | "Copy a link to this Budget"                                  |

`GAME_STAGES` is `outlook, pm, deliver, finetune, review, budget-day` and `FINAL_STAGE` is 5. The
desk's own screens (`/budget/taxes`, `/budget/spending`) belong to step 4 as its side room. The
cover's meta line reads "About 10 minutes · Six steps".

### One estimate

The briefing's first figure is "Your headroom £6.8bn", badged Assumption: "our estimate for
2029-30: the OBR's March forecast on today's borrowing costs and prices". It is made by the rule
ADR-0010 used for the Chief Economic Adviser's card. For each reading that drives a macro slider,
take the latest figure less the OBR's March figure (the mean over shared years for a series),
rounded to the slider's step and clamped to its range:

| Reading                                                                                 | OBR in March   | Latest | Setting |
| --------------------------------------------------------------------------------------- | -------------- | ------ | ------- |
| 10-year gilt yield (Bank of England, 18 September 2026)                                 | 4.5%           | 5.29%  | +0.75   |
| RPI, 2026 to 2030 (HM Treasury's comparison, August 2026)                               | 2.8% average   | 3.3%   | +0.5    |
| Nominal GDP growth (authored: weaker real growth, higher inflation, roughly cancelling) | the OBR's path |        | 0       |

The OBR's own sensitivities turn those settings into £6.8bn of headroom on the stability rule in
2029-30, against £23.6bn in March. The briefing then says why, in words the sources support. The
three promises made since March were paid for by moving money, so none used the headroom. What cut
the headroom is dearer borrowing and higher inflation. The engine computes the estimate with
`suggestedSettings(context.readings, levers)`; the web keeps it as `ESTIMATE`. With the workings
on, "How the estimate is made" shows the table the settings come from.

The estimate is fixed for the game. Starting the game applies it. "Put every lever back" clears
the player's measures and keeps the economy. Opening any game link puts the game on the estimate.
In a game the desk hides the ready-made Budgets, because a preset would replace the estimate. A
sandbox (no game) still sets its own economy on the desk; the footer's "Every lever" opens it on
the estimate when it has none of its own.

### No target: the rules are the line

The bar reads "Headroom, 2029-30 £X · rules met" or names the rule missed. The three markers the
target used to feed now read the markets' own bands. `THIN_HEADROOM_GBPM` (£10bn) and
`AMPLE_HEADROOM_GBPM` (£20bn) are exported by the engine and a test pins them to the ceilings of
the `thin` and `modest` bands of `reception.json`'s `mk-headroom` rule. A "cautious" Budget is one
with headroom of at least £20bn (`headroomAmple`, where it read `headroomAtLeastTarget`). Budget
day's third sentence says, first match wins: a rule missed, a promise broken, a promise strained,
a thin margin under £10bn ("I accepted a thin margin: £X of headroom."), or "I kept every promise
and £X of headroom." "What is headroom?" keeps the advisers' £20bn rule of thumb, badged Game
judgement with its six sources.

### Step 4: a curated space for tax and spending

Two screens of real levers under one step: "Fine-tune tax" (lead "Raise or cut any tax. Watch your
headroom move.") and "Fine-tune spending" ("Trim or top up any budget. Watch your headroom
move."). Each is the desk's own controls, hand-picked in `data/journey/finetune.json`:

- **Tax**: the twenty-six ways to pay from Phase 23, in the five who-pays groups (Everyone; The
  best-off; Business; Savers and owners; Drivers, smokers, gamblers and flyers). Eighteen toggles
  keep their option's title and adviser line; eight sliders gained plain titles ("The basic rate of
  income tax") and, where the old line assumed a rise, a line that fits either direction. The
  Director of Tax speaks.
- **Spending**: nineteen levers in four groups (Public services, Investment, Benefits, Last year's
  decisions), each with a line from the Director of Public Spending.

Every item carries a plain `title`, an adviser's `advice` (a Game judgement line with at least one
source) and a `move`: the setting the adviser's line judges. The validator checks that every code
is a live lever on its own side of the Budget and appears once; that every move is reachable and
is not where the lever rests; that every tax sits in the who-pays group its incidence tag names;
and that the screen's adviser exists and speaks on this step. The words test holds every title and
line to twelve words with no figure, and tests each size word against the engine's own figure at
the move (big at £5bn or more, small at £1bn or less), as ADR-0024 did for the options.

The card is `LeverControl` with a few new props, so the desk renders exactly as before:

- the plain title is the control's accessible name;
- at rest, the card says what the adviser's move would do and the headroom it would leave, priced
  against the Budget as it stands: "At 21%: raises £8.6bn · leaves …", "Switched on: raises
  £16.8bn · leaves …". Once the lever moves, its own effect line takes over;
- the adviser's line, the red and amber manifesto tags, "In your flagship policies" when the lever
  belongs to a chosen flagship, any overlap that applies now and, on a moved spending lever, its
  minister's line;
- the lever's headline, milestones, caveats and "What this assumes" fold under "More about this".

The first three levers of a group are on show, with any moved before the screen opened; the rest
wait under "{n} more levers". A lever moved inside the fold stays there until the next visit, so a
slider never jumps from under the pointer. Each group's heading counts what its moved levers do ("1
moved · raises £16.8bn"). "Every tax lever" and "Every spending lever" open the desk, whose way back
returns to the screen that opened it. Lever values are the only state, so moving a flagship's lever
here adjusts the flagship; the card's tag says so.

### Flagship policies, the review and Budget day

The flagship cards are unchanged. The last flagship screen leads to fine-tuning; its "More
policies" link went, because step 4 is next and links to every lever. A flagship card still names
a curated tax lever as its partner ("Overlaps with Basic rate"): `optionOverlaps` now takes the set
of levers the fine-tuning screens offer.

The review reads back the priorities, the flagship policies with what each costs, every tax moved,
every other budget moved, and where that leaves you in words ("Rules met.", or the rules missed and
"The OBR would say so on Budget day."), with any promise broken or strained. Each part has a Change
link. Budget day keeps its shape: the three sentences, the rules line, the three audiences, the
close and the folds. The close lost the compromises that mattered, the re-runs under the other
forecasts and the replay link. The Budget documents name today's estimate as the economic outlook.

### What was retired

- **The forecast guess and the reveal**: the four forecast cards and the sliders on the road (the
  readings table stays, behind the workings); the headroom target; the seeded draw of ADR-0012 with
  its five outcomes, clue, envelope and decomposition; the costing revisions (`Settings.revisions`,
  `applyRevision`, `LeverEffect.revision`); the forecast screen.
- **The compromises and the add-ons**: the three compromise screens with their suggestions, delays,
  narrowing, breach acknowledgement and stress test; the add-ons and the go-further cards; the
  snapshot the OBR re-scored (`S=`).
- **The ways to pay as option cards**, which became step 4's levers.
- **Code and data**: `game/draw.ts`, `forecast.ts` and `compromise.ts`; the card functions of
  `game/scenarios.ts` and `psnbDirection`; `options.json`'s `afford` and `addOns`; `draws.json`,
  `compromise.json` and `rabbit.json`; the context file's forecast cards and published ranges; the
  reception rules `mk-breach` and `pb-rabbit`; the verdict kind `breach-said-so`; the target
  interventions; the speech's compromise, delay and add-on fragments; the pages, their tests, and
  about 640 lines of CSS that only they used. The per-lever start-year seam
  (`implementationYearByCode`) stays for the earliest starts of ADR-0021.

No simulated element moves a number any more. The draw was the one place a game judgement touched
the arithmetic, and it only ever chose among published figures (ADR-0002, ADR-0011).

### Old links

Every Phase 8 to 23 game link carried a seed (`s.N`), so a link with one is read as a seven-stage
game and its stage goes through `LEGACY_STAGE = [0, 1, 2, 3, 4, 4, 5]`. The briefing, the
priorities and the flagships stay where they were. The forecast opens fine-tuning. The compromises
and the add-ons open the review. A finished game stays finished. Without a seed, `st` is clamped
to `0..FINAL_STAGE`. The retired items (`s pl hr dl rv rb br`, with Phase 8's `pp cn cp dp`) and
`S=` are ignored silently; Phase 9's `th` still reads as the priorities that replaced it.
`PERMALINK_VERSION` stays 1.

Opening a game link puts it on today's estimate. When the link carried other figures (a drawn
forecast, a card, figures of its own), a warning says so; like every link warning, it shows on the
desk. The retired routes keep the query and redirect: `/forecast`, `/compromise`, `/compromise/:n`
and `/rabbit` to the review, `/budget/afford` to fine-tuning tax, `/assumptions` to the briefing.
The stage guard then sends an early game back to where it has got.

## Consequences

- **Word budgets** (the budgets test, folds closed, measured 2026-09-27, pinned with about a tenth
  to spare): the cover 27, the briefing 201, the priorities 138, the flagship screens 139 to 177,
  fine-tuning tax 528 on arrival and 711 with a folded lever moved in every group, fine-tuning
  spending 476 and 665, the review 88, Budget day 188.
- **Readability** (the test of ADR-0024, re-measured 2026-09-27): twelve sets now, every sentence
  within twenty words and every set at a Flesch-Kincaid grade of seven or below. The guide 3.2,
  option titles 5.1, option advice 4.6, the fine-tuning screens' titles, leads and groups 5.1,
  their advisers' lines 4.9, the priorities 3.5, the promises 6.7, the reception labels 4.9 and
  bands 5.3, the verdicts 5.9, the interventions 4.4, the ministers 5.5. The targets, the forecast
  outcomes, the compromise questions and routes and the add-ons' lines left with their screens.
- **Playtime** (the Phase 20 method, unchanged: visible words at 200 words a minute, ten seconds a
  decision, three a screen change; an estimate from the rendered screens, not user testing): nine
  screens and eight decisions; reading everything 11m 11s, the skim set 6m 52s, midpoint about
  nine minutes. Phase 23 took fourteen screens and about eleven minutes. The cover keeps "About 10
  minutes", which sits between the skim and a full read.
- **The walk** (`walk24.mjs`, in the session scratchpad with its predecessors): light and
  reduced-motion runs at 1300px and 360px with the contrast, size, family, hit-box, radius and
  animation audits on; clean. It checks six rail stops; the briefing's £6.8bn with its Assumption
  badge, no radio and no slider; the priorities and the guard; the flagship card's "leaves" equal to
  the bar; both fine-tuning screens (a hint on every resting lever, the levy amber, the penny red,
  the hint turning into the effect line, a folded lever that keeps its fold and its focus while
  moved and is on show at the next visit, "In your flagship policies", a minister once a budget
  moves, the desk's round trip); the review and its Change links; Budget day with no replay link;
  the retired routes; an old Phase 23 link opening at the review on the estimate; the thin, kept,
  strained and broken statements; the fuel duty warning; and a sandbox sent to the desk.
- **Moving a flagship's lever on step 4 adjusts the flagship** and lowers the delivered count. That
  is the honest state, and the card says so.
- **What was not built.** A link warning shows on the desk only, as it has since Phase 13, so an old
  link opened at the review changes the economy without saying so on that screen. The nineteen new
  spending lines are the honesty risk of the phase: each restates a claim already sourced in the
  data, wears the Game judgement badge and passes the size-word test.

## Revision (2026-09-28): the yardsticks in words, still no target (ADR-0026)

The briefing now puts the advisers' yardstick beside the figure, badged Game judgement and scored
by nothing: "Your advisers call headroom under £10bn thin. The markets notice." The review repeats
it when a Budget meets the rules on a margin under £10bn. There is still no target: nothing asks
the player to choose one, and the bar still says only whether the rules are met, now naming a
missed rule and its margin. Two details above have moved on. A resting fine-tuning card reads in
the conditional ("Up 1p to 21%: would raise £8.6bn · headroom would be £X"), and every price is the
change to the bar's headroom, interest included. The re-run playtime of this build, with a race in
the script fixed, reproduces the 11m 11s and 6m 52s above exactly.
