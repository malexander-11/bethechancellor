# ADR-0026: A review against four goals, and the fixes

Date: 2026-09-28. Status: accepted; revised 2026-09-28 (below, ADR-0027). Revises ADR-0007,
ADR-0013, ADR-0015, ADR-0023 and ADR-0025, each of which carries a dated revision pointing here.

## Context

The user asked for a review of the Phase 24 game (`d1098a4`):

> Conduct a review of this game against these goals:
>
> - Accurately reflects budget-making experience
> - Is understandable by the vast majority of British electorate
> - Shows trade-offs to user and makes them think about decisions in the round
> - Gives feedback on the budget to show pros and cons.

We call them G1 (realistic), G2 (understandable), G3 (trade-offs) and G4 (feedback).

### How the review was done

Ten reviewers each took one lens, reading the code, the data and the screenshots but changing
nothing:

- how a real Budget is made;
- the numbers and the menu;
- the language;
- four voters walking the 360px and 1300px screenshots;
- interaction and how much a player must hold in mind;
- whether trade-offs are visible;
- a stress test of strategies through the engine;
- what Budget day says;
- eight Budgets run through the feedback functions;
- political balance.

A completeness critic added four more: accessibility; Scotland, Wales and Northern Ireland; whether
a player understands more after playing; and an independent re-check of the simulated claims.

Every finding then had two independent checks. The first tried to refute its facts against the
code, the data, the screenshots and the engine. The second asked whether it mattered to most
voters, and whether its fix was honest and within the decisions already taken. 108 findings
survived: 14 high, 62 medium and 32 low. Most (94) survived only as corrected, so no claim below
rests on one reviewer's first reading.

### The verdict on Phase 24

| Goal              | Rating (of 5) | In one line                                                                                                                                                                                                                                                                        |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Realistic      | 3.5           | The shape of a real Budget is right: one inherited estimate, the two rules, the settlements, ministers' bids, the Prime Minister, red lines, badged costings. Several big prices were wrong, and England-only spending read as the UK's.                                           |
| G2 Understandable | 3             | The cover, priorities, flagships, review and Budget day were short and plain. Step 4 was not: 80 to 110 figures a screen by the reviewers' count, 5,800 to 7,200px tall on a phone. Headroom, the rules and the OBR were not explained where they were used.                       |
| G3 Trade-offs     | 3             | Trade-offs were priced well at the moment of choice; the scoring then undid them. Borrowing past the rules was rewarded, cuts were free with the public, and one cheap tick "delivered" a priority.                                                                                |
| G4 Feedback       | 2.5           | The right parts, badged and tied to the player's levers. But the markets blamed the player for the inheritance, the public could not see cuts or borrowing, a card's one reason could point the wrong way, and the close, the speech and the households could contradict the sums. |

What worked, and was kept: the briefing reads like a Treasury note and says honestly why headroom
fell; the rules behave like the 2025 Charter; the player inherits the real settlements and last
year's decisions; badges and earliest starts stop timing tricks; red and amber tags warn before a
line is crossed; taxes are grouped by who pays; one live score; a short review with a Change link
on every part; Budget day layered, reproducible and badged; proposals from across the spectrum;
solid accessibility basics.

## Decisions

### Taken with the user (2026-09-28)

| Question         | Choice                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | **Everything**: all 22 recommendations, P1 to P3.                                                                                                                                                         |
| Budget-day cards | **One reason that always agrees with the rating, plus "Counted against: A · B"** (or "Counted for: …", eight words at most) when the other side has reasons. Revises Phase 22's "rating plus one reason". |
| The yardsticks   | **In words on the briefing**, badged Game judgement: "Your advisers call headroom under £10bn thin. The markets notice." Nothing is scored against it; there is still no target.                          |
| Delivery         | **Graded**: delivered, settled lower, started, not funded. Each flagship way says whether it delivers in full or makes a start, with a sourced reason (Game judgement).                                   |

One call was ours, from the review's own re-test: missing the day-to-day or the debt rule costs
the public a point **and holds it at three**. Only the hold stops a rule-missing Budget rating
four or five with the public.

Unchanged: one estimate (£6.8bn), no target, six steps, roles only, the honesty contract, plain
English, one primary button a screen.

### The 22 recommendations, and where each landed

| #   | Recommendation                                                                                                            | Commit               |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| R1  | Measure the markets from today's estimate; a missed rule costs something with every audience                              | 5 `eeef6c7`          |
| R2  | Make service cuts visible; stop netting them away                                                                         | 5 `eeef6c7`          |
| R3  | Budget-day summaries (three sentences, the close, the speech's ending) say what the sums say                              | 6 `9783ddc`          |
| R4  | One price per choice, with the right sign; the review adds up                                                             | 3 `a295cb0` (and 2)  |
| R5  | Truthful audience cards                                                                                                   | 4 `35c2d5c`          |
| R6  | Step 4 readable on a phone                                                                                                | 8 `80ac898`, in part |
| R7  | Relief costs are not yields                                                                                               | 1 `6cabfb6`          |
| R8  | Correct the prices, descriptions and promise checks on the main path                                                      | 1 `6cabfb6`          |
| R9  | The briefing's one figure, explained                                                                                      | 7 `81a532f`          |
| R10 | Households that notice what reaches them                                                                                  | 9 `dbf1248`          |
| R11 | Graded delivery                                                                                                           | 2 `323724e`          |
| R12 | Rebalance the audience rules                                                                                              | 5 `eeef6c7`          |
| R13 | Plain rule names; the bar says which rule is missed                                                                       | 3 `a295cb0`          |
| R14 | The Prime Minister at sign-off                                                                                            | 9 `dbf1248`          |
| R15 | The in-tray on the desk                                                                                                   | 7 `81a532f`          |
| R16 | England-only where chosen                                                                                                 | 8 `80ac898`          |
| R17 | A plain-word sweep                                                                                                        | 8 `80ac898`          |
| R18 | Accessibility: toggletips (7), the blocked notice (1), slider value text (8), a bar that speaks and keeps focus clear (9) | 1, 7, 8, 9           |
| R19 | The speech owns the forecast; the Opposition replies                                                                      | 6 `9783ddc`          |
| R20 | The workings say how the estimate is made and the OBR's role                                                              | 7 `81a532f`          |
| R21 | Wider feedback: growth, debt interest, timing, climate, the price of the priorities                                       | 9 `dbf1248`          |
| R22 | Rate sliders within their sources' range                                                                                  | 8 `80ac898`          |

### What each commit did

1. **Prices and promises** (`6cabfb6`). Ten levers built on HMRC's cost of a tax relief carry
   `reliefCost`: their cards read "raises at most £X", with "HMRC's cost of the tax break. The
   real sum would be less, as people change what they do." The markets count them as uncertified.
   Two costings were redone as stated arithmetic, badged Worked out. Employer NI on pension
   contributions counts only the private sector's part (HMRC's £14.3bn less its £6.5bn on public
   schemes, scaled from 13.8% to 15%, grown with nominal GDP): about £10.1bn in 2029-30, not
   £20.0bn. The health and social care levy is 1.25 times the game's own one-point NICs rows:
   about £26.0bn, not £16.8bn. A new fuel duty freeze toggle; keeping VAT off electricity joins
   the curated tax screen; `excludes` pairs for measures that count the same money; one accessible
   blocked notice ("You can't have both. Untick X to choose this.") with a one-tap swap.
2. **Graded delivery** (`323724e`). 19 ways deliver in full and 10 make a start. A priority is
   delivered, settled lower, started or not funded. The bar reads "1 of 2 priorities delivered ·
   1 started". Option state reads direction, so a cut is never a "trimmed" uplift.
3. **One price** (`a295cb0`). `optionPrice` is the engine re-run with and without a choice: its
   change to the bar's headroom in 2029-30, interest included, on the card, the review, the speech
   and the close alike. `reconcile` takes the headroom from the estimate to the bar through taxes,
   day-to-day spending and interest, exactly. The rules go by plain names ("the day-to-day rule",
   "the debt rule"), and the bar says "Debt rule missed by £4.5bn".
4. **Cards that agree with their ratings** (`35c2d5c`). The one reason agrees with the rating;
   the other side is one short line; causes point the way their reason says; the economy since
   March is never the player's doing.
5. **The recalibration** (`eeef6c7`). Readings are measured from `preBudget` (today's estimate
   with nothing moved). A missed rule holds the markets at one and the others at three. Cuts to
   departments are counted one by one, never netted, with health and schools from £2bn. The
   public counts the taxes most households feel. The scale: three at nought, one or two points a
   step, three or more two steps.
6. **Summaries that say what the sums say** (`9783ddc`). The three sentences, the close and the
   speech are built from the engine's figures and the player's choices, and a consistency test
   runs seven Budgets through them. The Leader of the Opposition replies in one line.
7. **The briefing explains its figure** (`81a532f`). What headroom means, its year and about £240
   for each household; the OBR spelt out; the yardstick; "Already on your desk"; a glossary word
   opens by tap or keyboard; the workings say how the estimate is made.
8. **Step 4 on a phone, in plain words** (`80ac898`). One figure line a resting card; hints in the
   conditional and plain ink; growth in words; sliders held to the 2p their sources vouch for;
   England-only budgets said once a screen; adviser lines without an opening source.
9. **Households, sign-off, wider feedback, a bar that speaks** (`dbf1248`). Households name what
   reaches them and say "Nothing aimed at us by name" rather than "untouched"; the Prime Minister
   signs off in one line; the markets' fold speaks to growth and debt interest; late money and
   climate where a source says so; the scale of the priorities before choosing; the bar announces
   what changed and keeps a focused control clear of itself.

### How the planner's flags were settled

1. **One price on the review.** A priority's "spending a year" stays in the readings only.
2. **Adviser names.** Step 4 names its adviser once, in the lead; flagship cards read "Role: line"
   then the badge.
3. **Settled lower** counts under "started" on the bar; the review and the close name it.
4. **Kept wording**: "Every manifesto red line holds".
5. **Keeping VAT off electricity** keeps the Assumption badge, as the lever has.
6. **Health and schools cuts** count for the public from £2bn, so the walk's 0.5% trim is free.
7. **After 2028-29 the spending plans are words only**: the spending screen says the budgets were
   set to 2028-29 and that the forecast already squeezes the unprotected ones (EFO 4.16). No new
   lever, which would count the departments' paths twice.
8. **The defence plan's gap** is a line in the in-tray, not a promise strained. England's 18-week
   target is a strain shown in amber and scored by no audience (`scored: false`), so it cannot
   stack with the public's rule on service cuts.
9. **No plus point for taxing the top.** Levies on banks, energy producers and the very top score
   nothing with the public, from an authored list in `incidence.json`.
10. **Relief costs** are keyed on a `reliefCost` lever flag, so a re-costed lever keeps it.
11. **The fuel freeze** is a Worked-out toggle, HMRC's 1% rows times the planned April 2027 rise.
12. **Keeping VAT off electricity** is a curated tax cut, the third lever shown for everyone.
13. **Pins move with their rules**: the readability sets grew to sixteen and read acronyms letter
    by letter; where that pushed a set up, the words changed, not the limit.
14. **Nudges** are recomputed on the new scale and shown only when the rating itself would move.
15. **Word budgets**: the briefing folds its since-March decisions; the review carries at most one
    voice (the Prime Minister's); every screen is re-measured and pinned with a tenth to spare.
16. **The 2p clamp** is on the curated screens only; the desk keeps its full range, and past 2p
    the effect is badged Worked out with the limit said.
17. **Leaks stay out.**

## Consequences

### The ratings, before and after

The same sixteen Budgets, on today's estimate, run through each tree's own engine and data
(`ratings25.mts` in the session scratchpad; `d1098a4` in a worktree, then `dbf1248`). "Three
priorities" are the NHS, defence and safer streets, funded by health 3% above plan, defence at 3%
now and prisons 10% up. Ratings are backbenchers, markets, public; an arrow marks a change.

| Budget                                                                 | Rules, 2029-30 headroom             | Delivered       | Backbenchers              | Markets                  | Public                    |
| ---------------------------------------------------------------------- | ----------------------------------- | --------------- | ------------------------- | ------------------------ | ------------------------- |
| Doing nothing (three priorities agreed)                                | met, £6.8bn                         | 0 of 3          | 2 Grumbling               | 1 Alarmed → 2 Nervous    | 3 Shrugging               |
| Health 10% below plan                                                  | met, £33.8bn                        | 0 of 3          | 1 In revolt               | 5 Relaxed → 4 Reassured  | 3 Shrugging → 2 Sceptical |
| A 5% cut to health (the NHS agreed)                                    | met, £20.3bn                        | 0 of 1          | 1 In revolt → 2 Grumbling | 4 Reassured              | 3 Shrugging → 2 Sceptical |
| Three priorities, borrowed                                             | both missed, −£6.4bn                | 3 of 3          | 4 Onside → 3 Divided      | 1 Alarmed                | 5 Delighted → 3 Shrugging |
| … paid by 2p on the basic rate                                         | met, £13.0bn                        | 3 of 3          | 2 Grumbling               | 2 Nervous                | 1 Furious                 |
| … paid by the levy                                                     | met, £12.7bn → £23.1bn              | 3 of 3          | 2 Grumbling               | 1 Alarmed → 4 Reassured  | 3 Shrugging → 2 Sceptical |
| … paid by taxing capital gains like income                             | met, £14.9bn                        | 3 of 3          | 5 Cheering → 4 Onside     | 1 Alarmed → 2 Nervous    | 4 Approving               |
| … paid by NI on employer pension contributions                         | met, £16.3bn → £5.1bn               | 3 of 3          | 4 Onside                  | 2 Nervous → 1 Alarmed    | 2 Sceptical → 3 Shrugging |
| Big spending, borrowed (health, schools, defence, prisons, investment) | both missed, −£33.7bn               | 3 of 3          | 4 Onside → 3 Divided      | 1 Alarmed                | 5 Delighted → 3 Shrugging |
| The walk (defence gap, prisons, the levy, a penny, IPT, health −0.5%)  | met, £35.4bn → £45.8bn              | 2 of 2          | 1 In revolt → 2 Grumbling | 3 Watchful → 4 Reassured | 1 Furious                 |
| Defence and prisons, paid by employer NI                               | met, £18.3bn                        | 2 of 2          | 3 Divided                 | 3 Watchful → 4 Reassured | 3 Shrugging               |
| A token three ticks (care, the defence gap, the Home Office)           | met, £3.9bn                         | 3 of 3 → 2 of 3 | 3 Divided                 | 1 Alarmed → 2 Nervous    | 5 Delighted → 4 Approving |
| A 2p basic-rate cut                                                    | both missed, −£12.5bn               | 0 of 2          | 2 Grumbling               | 1 Alarmed                | 4 Approving → 3 Shrugging |
| A £27bn giveaway (2p and a point of VAT off)                           | both missed, −£23.8bn               | 0 of 2          | 2 Grumbling               | 1 Alarmed                | 4 Approving → 3 Shrugging |
| Investment 20% above plan                                              | debt rule missed; day-to-day £3.1bn | 1 of 1          | 4 Onside → 3 Divided      | 1 Alarmed                | 5 Delighted → 3 Shrugging |
| The CSJ reset alone                                                    | met, £13.4bn                        | 1 of 1          | 1 In revolt → 2 Grumbling | 1 Alarmed → 3 Watchful   | 5 Delighted → 4 Approving |

What moved, and why:

- **The markets read from before the Budget.** Doing nothing, or a saving on its own, no longer
  reads "Alarmed", which is now for missing a rule.
- **A missed rule holds the others at three.** Every rule-missing Budget fell from Delighted or
  Approving with the public, and borrowing past the rules no longer wins over the party.
- **Cuts are seen.** A health cut costs with the public, and a deep one with the markets.
- **Two prices moved.** The levy, re-costed at about £26bn, lifts its Budgets' headroom by about
  £10bn; NI on pension contributions, at about £10bn, lowers its by about £11bn, which the
  markets now read as thin.
- **Felt taxes count with the public**: the levy is felt through pay and prices, so it costs a
  point.
- **Graded delivery**: the token Budget's care down-payment only makes a start.
- **The scale**: two ordinary minuses no longer reach the floor, and the top takes more than one
  good thing.

### What the tests pin, and what they do not

The engine tests pin these on today's estimate: doing nothing rates the markets 2; any missed rule
rates the markets 1 and the others at most 3; a 10% health cut rates the public at most 3; the
shown reason never contradicts the rating; the counted line appears exactly when the other side
has a rule, in eight words or fewer; across 300 seeded Budgets every audience uses the whole
scale, and no rule-missing Budget pleases the markets more than doing nothing; no Budget-day
sentence, close line or speech figure contradicts the rules result, a priority's fate or the sign
of a change (seven named Budgets); the review's reconciliation equals the bar; the levy equals
1.25 times its rows.

Two properties are narrower than the plan's wording, and we say so rather than tune them away:

- **Borrowing past the rules against paying.** The tests pin that borrowing never rates above
  paying _from the top_ (capital gains taxed like income: 4 / 2 / 4 against the borrowed 3 / 1 /
  3), and rates below it with the markets. Against a tax most households feel, borrowing still
  rates higher with the party and the public: the levy 2 / 4 / 2, 2p on the basic rate 2 / 2 / 1.
  The markets prefer the levy by three steps, and the borrowed Budget misses both rules. The
  game's judgement is that a party and a public dislike a felt tax rise a little more than broken
  rules they cannot see, and that the price of borrowing is paid with the markets and the rules.
  That is a judgement, recorded here.
- **The token three ticks.** The tests pin that a token Budget earns no more with the public or
  the party than delivering the same priorities in full, and no more than the funded walk, audience
  by audience. It can still out-rate a Budget that raises a felt tax with the public: 4 against 3
  for defence and prisons paid by employer NI.

No independent re-review has been run on the Phase 25 build. The ratings table, the tests and the
walk are the evidence; they are not a new score against the four goals.

### Step 4 on a phone: the aim was not met

Measured at 360px on both builds (`measure25.mjs`, the Phase 24 build served from the worktree),
with two priorities agreed and nothing yet chosen:

| Screen             | Phase 24                           | Phase 25                          |
| ------------------ | ---------------------------------- | --------------------------------- |
| Fine-tune tax      | 5,958px (7.6 screens), 72 figures  | 6,043px (7.7 screens), 57 figures |
| Fine-tune spending | 4,742px (6.1 screens), 125 figures | 5,218px (6.7 screens), 54 figures |

A screen is 780px; a figure is any number on show, counts and years included. Commit 8 cut every
resting card to one figure line, so the figures fell by a fifth on the tax screen and by more than
half on spending. The height did not fall. Commit 8 took the tax screen to 5,858px; commit 9's one
adviser line above the cards added 185px back; the spending screen gained its three notes and the
defence plan's gap. (Commit 8's message set its 5,858px against 5,834px, which is Phase 24 with two
flagships chosen: not the same state.) The plan aimed at two to three screens. That needs fewer
cards on show at rest (fifteen on the tax screen, each with its price and its adviser's line),
which Phase 25 did not do.

### Word budgets

The budgets test, folds closed, measured 2026-09-28 and pinned with about a tenth to spare
(Phase 24 in brackets): the cover 27 (27), the briefing 234 (201), the priorities 178 (138), the
flagship screens 161 to 201 (139 to 177), fine-tuning tax 605 on arrival and 759 with a folded
lever moved in every group (528 and 711), spending 588 and 753 (476 and 665), the review 213
(88), Budget day 199 (188). The words bought: the meaning of headroom and the yardstick, the
in-tray, the price of the priorities, one adviser line on step 4, the review's reconciliation and
sign-off, and the counted line. The desk's budgets are unchanged.

### Readability

Sixteen sets now, every sentence within twenty words and every set at a Flesch-Kincaid grade of
seven or below, with acronyms read letter by letter: the guide 3.2, option titles 5.4, option
advice 4.8, the delivery scales 6.1, the fine-tuning screens 5.2 and their advisers' lines 5.0,
the priorities 4.1, the conflicts 3.3, since March 6.4, the sign-off 1.6, the promises 5.6, the
reception labels 4.9 and bands 5.1, the verdicts 4.9, the interventions 4.2, the ministers 5.8.
The test writes the grades to a file when `GRADES` names one.

### Playtime

The Phase 20 method, unchanged (visible words at 200 a minute, ten seconds a decision, three a
screen change): an estimate from the rendered screens, not user testing. `playtime25.mjs` fixes
a race in its predecessor, which counted the priorities while the briefing was still on screen;
with the fix, Phase 24's build reproduces ADR-0025's figures exactly. Both builds, same script:

| Screen                 | Phase 24 words (skim) | Phase 25 words (skim) |
| ---------------------- | --------------------- | --------------------- |
| The cover              | 27 (21)               | 27 (21)               |
| The briefing           | 206 (53)              | 243 (60)              |
| Set your priorities    | 105 (62)              | 145 (63)              |
| Flagship policies, 1st | 110 (66)              | 136 (71)              |
| Flagship policies, 2nd | 78 (51)               | 105 (52)              |
| Fine-tune tax          | 530 (278)             | 622 (361)             |
| Fine-tune spending     | 504 (306)             | 621 (326)             |
| Deliver the Budget     | 104 (104)             | 230 (130)             |
| Feedback               | 215 (74)              | 240 (81)              |
| **Reading everything** | **11m 11s**           | **13m 38s**           |
| **Reading the skim**   | **6m 52s**            | **7m 37s**            |

The midpoint rose from about nine minutes to about ten and a half, most of it on step 4 and the
review. The cover keeps "About 10 minutes", which still sits between the skim and a full read.

### The walk

`walk25.mjs` (in the session scratchpad with its predecessors) ran clean in four runs: 1300px and
360px, with and without reduced motion, with the contrast, size, family, hit-box, radius and
animation audits on. A glossary word inside a sentence is exempt from the 44px hit box, as WCAG
2.5.8 exempts inline targets. Beyond Phase 24's checks it covers:

- the briefing's meaning line, the scale per household, the yardstick and the in-tray;
- the glossary toggletip opening and closing by tap, by keyboard and by Escape;
- the priorities' price line and the one "Saves money" tag;
- "1 of 2 priorities delivered" on the bar, and "0 of 1 priority delivered · 1 started" for a
  start;
- the blocked card's notice, `aria-disabled` and `aria-describedby`, and that it cannot be ticked;
- the conditional hint and the named resting tags on step 4, one adviser line at a time, the bar's
  status region (silent on arrival, then "Headroom, 2029-30: £X. 1 promise broken." once the
  slider settles), and a focused control scrolled clear of the sticky bar;
- the tax screen's height at 360px;
- the review's rules line, its reconciliation ending on the bar's own figure, the Prime Minister's
  line in place of the tag, and one reaction with no rating; a missed rule named on the bar with
  its margin, and the Prime Minister asking for the money;
- the counted lines on Budget day (eight words or fewer), no household untouched by the walk's
  Budget, the debt interest line in the markets' fold, and "nothing by name" for the professional
  under a wealth tax.

Not done here: a check at 200% zoom on a real phone, which needs a person with one.

### Also

- **Old links re-rate** on the new rules. That is the point of the recalibration; the table above
  shows by how much.
- **New judgements.** The delivery reasons, the households' new touches, the sign-off, the
  Opposition's reply and the climate clauses are Game judgement. Each quotes a registered source,
  carries no figure of its own, and passes the words and readability tests. A claim whose source
  could not be fetched was left out.

## Revision (2026-09-28): the clamp gives way to sizes (ADR-0027)

R22 held the curated rate sliders to the range their sources vouch for (2p on the basic rate, two
points of VAT), while the desk went further, badged Worked out. Phase 26 replaces the sliders with
sizes and reverses the clamp on step 4: the user's own example asks for VAT at 25%, so a large size
may pass a source's range, and its effect then wears Worked out with the caveat, as the desk's did.
Step 4 on a phone is still about 7.5 to 7.7 screens tall.
