# ADR-0027: Policies all the way through

Date: 2026-09-28. Status: accepted; step 4 in basic mode revised 2026-09-29 (below, ADR-0028), and
the tax screen, its pairs and its cards 2026-09-30 (below, ADR-0035, ADR-0036 and ADR-0037). Revises
ADR-0005, ADR-0009, ADR-0025 and ADR-0026, each of which carries a dated revision pointing here.

## Context

After Phase 25 the game chose in two ways. Steps 3 and 4 were mostly policy cards, but step 4's rate
and budget levers were sliders. One link away sat the desk: every lever as a slider, ready-made
Budgets, two expert switches, and a sandbox that ran with no game. Sixty levers could be reached
only there or through a flagship policy. The user asked for one way all the way through:

> Let's simply further. Keep this inactive/policy based all the way through. Remove the sliders.
> Where needed have a secondary option of small / medium / large. E.g. policy --> increase vat small
> 21% medium 22% large 25%

We read "simply" as "simplify" and "inactive" as "interactive".

Three questions were put to the user before anything was built:

| Question                      | Choice                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The desk                      | **Fold it into step 4.** Every lever becomes a policy on the two fine-tuning screens: the hand-picked ones on show, the rest one fold away in their group. The desk, its tabs, the sandbox and the economy sliders go. |
| A lever that moves either way | **Two policies, one each way.** "Put up VAT" and "Cut VAT" are separate, each with its sizes. The usual direction is on show; the other waits in the group's fold. Choosing one clears the other.                      |
| Flagship policies             | **Keep them fixed.** Each flagship stays one sourced proposal with its full or start grading. Sizes appear only on step 4.                                                                                             |

## Decisions

### A policy and its sizes

A step-4 item is one lever with one or two policies, each `{ title, sizes, advice }`. The first
policy is the way that improves the public finances: taxes up, spending down. A lever that moves
both ways has one policy each way; a toggle has one policy of one size, a tick.

- **Sizes are authored in data** and checked by the validator: in range, on the control's steps, not
  where the lever rests, all one way, growing away from the rest.
- **The rule is 1-2-5 from the usual step**: small is the step a card used to judge (1p, a point, £2
  a week, £100, 5% on a duty), medium twice it, large five times it, capped at the range, with a
  repeated size dropped. A test holds every sized policy to it, except where HMRC publishes points
  and the sizes sit on them: the personal allowance (£100 and £1,250), the higher-rate threshold,
  the additional rate, the capital gains rates, the rate on selling a business, and inheritance tax.
- **Labels follow the count**: one size is a tick, two are Small and Large, three are Small, Medium
  and Large. Each is shown with its level ("Small 21%", "Large Abolish (0%)").
- **The user's example holds.** VAT's range widens to +5 points, so putting it up reads 21%, 22% and
  25%. Where a large size passes the range its source vouches for (VAT, the three income tax rates,
  the National Insurance rates, insurance premium tax), the effect wears Worked out with its caveat.
  This reverses Phase 25's clamp on the curated screens (R22, ADR-0026).
- **Raising the additional rate stops at 47%**, because 50% on the same income is its own policy,
  and the two cannot both be chosen.

141 policies in all: 95 taxes and 46 spending choices on 108 levers, 33 of which go both ways; 70
are ticks, 10 come in two sizes and 61 in three.

### The card

Every step-4 card is one policy: its title, its sizes as native radios (or its tick), the manifesto
tags, one adviser's line, the notes that apply now, and the lever's headline and caveats under "More
about this". At rest it prices its smallest size against the Budget as it stands ("Small: would
raise £8.6bn · headroom would be £X"); chosen, it shows the lever's effect and Undo. While the
lever's other policy is chosen it says "Choosing this replaces Put up VAT (22%)" and prices nothing.
A value no size matches, from an old link or a flagship left behind, reads "Now 10% more". The card
keeps its old component's name, `LeverControl`, drawn by `PolicyCard`; its slider, its dropdown and
its long desk layout went with the desk.

### Flagships hold their levers

A lever set exactly by a flagship the player chose shows once, as a line in its group ("More money
for prisons and courts: 10% more · Change"), so step 4 never silently undoes a flagship. A card
blocked by a partner a flagship holds offers the way back to that flagship, not a swap. A size equal
to a flagship's value delivers it, and reads as it on the next visit; a size past it stays an
ordinary card.

### Every lever on step 4

Each lever new to step 4 joins the who-pays group its incidence tag names, or, on the spending
screen, the group for what the money is for. The hand-picked levers keep their places on show; the
rest wait in their group's fold, which mounts its cards only while it is open and sets them under
the lever's family ("Income tax", "VAT"; "Flagship programmes" became "New programmes" so it does
not collide with step 3). Council homes fill Investment's empty third place. On arrival the screens
show 27 policies: the usual policy of each group's first three levers, and any lever already chosen.

Every new card was authored to the rules the curated ones already met: an adviser's line of at most
twelve words with no figure, restating a claim the lever's own documents make, badged Game
judgement; a size word ("big", "small") only where the engine bears it out at every size; and a
household that really meets the measure, or the lever listed as reaching none of the five by name.

### Pick one

Where two levers' own texts say they double count, cancel or are "pick one", the pair is now
`excludes`, authored once, with the "You can't have both" notice and a one-tap swap. Twenty-two
pairs in all, eighteen of them new: the two pension relief designs, the two wealth taxes, the two
triple-lock replacements, the two PIP reforms, the defence 3% path and the plan's gap, the gambling
and investment-income rises against their reversals, VAT off gas against full VAT on home energy, 1%
on zero-rated goods against each of the five 20% categories, capital gains alignment against the
2024 reversal and a rise on today's rate, the fuel freeze against last year's cancelled rise, full
National Insurance above £50,270 against moving the 2% rate, and a 50% rate against moving today's
45%. Each text reads from either card and in either direction. Pairs whose texts say only that the
combined figure is approximate stay warnings.

### What went

- **The desk**: its page, its tabs, the running summary, the scorecard, "What you've changed" with
  its Budget 2025 comparator, the who-pays strip, and its nineteen briefings.
- **The ready-made Budgets** (presets), their schema and loaders.
- **The expert switches.** Every Budget counts the interest on its own borrowing (ADR-0005) and is
  judged by the rules as they stand.
- **The sandbox.** With no game only the cover and the briefing open. A link with measures and no
  game opens the briefing, and its button starts the game with those measures in it, on today's
  estimate.
- **The desk's two steps**, `taxes` and `spending`, from the schema, the guide ("Build the
  package"), the advisers and the routes; the levers' `order` field; the "Every lever" link.

What a link cannot carry, or carries into a game not yet started, is now said once on whatever
screen it opens, as a note that can be dismissed: the estimate a game is put on, the measures a link
with no game will bring into its game, a setting that has gone. The desk's old addresses redirect
with the Budget kept: its spending screen, and the older screens it sent there, to fine-tuning
spending; anything else to fine-tuning tax. A finished game's link still opens Budget day.

## Consequences

### Measured

- **Word budgets**, folds closed (`budgets.test.tsx`): fine-tuning tax 611 words on arrival and 776
  with one folded policy chosen in every group; spending 578 and 759. The limits stay at 675, 860,
  640 and 840. The other screens: the cover 27, the briefing 234, the priorities 178, the flagship
  screens 201, 178 and 161, the review 213, Budget day 199.
- **Readability** (`readability.test.ts`): the fine-tuning screens read at grade 5.7 (from 5.2) and
  their advisers' lines at 4.8 (from 5.0); the guide at 3.4 (from 3.2), since step 4's line now says
  "Choose policies until the numbers add up." rather than "Move the levers"; every set is at grade
  seven or below, the highest "since March" at 6.4.
- **Step 4 on a phone** (`measure26.mjs` in the session scratchpad, 360px, two priorities agreed and
  nothing chosen): tax 6,010px, 7.7 screens of 780px, with 60 figures (Phase 25: 6,043px and 57);
  spending 5,874px, 7.5 screens, with 70 figures (Phase 25: 5,218px and 54). Spending grew mostly
  because each card on show lists its sizes with their levels where a slider stood, and Investment
  shows a third policy.
- **Playtime** (`playtime26.mjs`, an estimate from the rendered screens, not user testing): 13m 42s
  reading everything visible and 7m 37s skimming, a midpoint of 10m 40s (Phase 25: 13m 38s and 7m
  37s). The cover keeps "About 10 minutes".
- **The walk** (`walk26.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): clean. No slider or dropdown on any screen, every
  size's hit box at least 44px, the user's example (Small 21%, Medium 22%, Large 25%), the arrow
  keys moving between sizes, a policy chosen in a fold staying there with its focus, the family
  subheads, the prisons flagship holding its lever with a Change link, the desk's addresses
  redirecting in a game and without one, the link notes shown once and dismissed.

### What it costs, and what was not done

- **The spending screen is taller on a phone**, by about 650px. Fewer cards on show at rest would be
  needed to bring step 4 to two or three phone screens, which remains the aim ADR-0026 did not meet.
- **Losing the desk removes** the ready-made Budgets, the expert switches, the Budget 2025
  comparator and the desk's who-pays strip. The review keeps its who-pays line; the user chose this.
- **Large sizes past a source's range** (VAT at 25%, the basic rate at 25p or 17p, employer National
  Insurance three points either way, insurance premium tax up four or eight points) are
  straight-line arithmetic on HMRC's rows. They wear Worked out with their caveat, as the desk's
  full range did.
- **Ninety-three new policies, each with an adviser's line** (some reusing a flagship's), and a
  household line or an honest "reaches none" for every lever new to step 4, were the honesty risk.
  Each line was checked against its lever's own claims and priced at every size before it was
  committed; several drafts were rewritten where they overstated.
- **Two changes from the plan.** The card was not folded into `PolicyCard`: once its dead paths had
  gone, the move would have added churn and removed nothing, so `LeverControl` keeps its name as the
  card `PolicyCard` draws. And four more briefings went with the desk's: the opening's three and the
  flagship screen's one, which nothing has shown since earlier phases.

## Revision (2026-09-29): step 4 in basic mode (ADR-0028)

Step 4 as this record describes it is now advanced mode. A first game starts in basic mode, where
each screen shows its adviser's shortlist, badged Game judgement: eight taxes of ninety-five and
seven spending policies of forty-six, with the defence plan's gap beside them because the briefing
puts it on the desk, and no folds. A policy chosen in either mode stays on show in both. On a phone
basic mode's tax screen is 3,704px and its spending screen 4,263px, against 6,066px and 5,930px in
advanced mode: the shorter screen this record said step 4 still needed, though not yet two or three
phone screens. Advanced mode is unchanged but for one line offering the shortlist back.

## Revision (2026-09-30): taxes by tax, one scale a tax (ADR-0035)

On the tax screen a tax that moves both ways is no longer two policies, one on show and one in the
group's fold: it is one card with one scale, its levels in order and the planned level among them as
a radio, and a tax with sizes that moves one way is a scale from the plan. Small, Medium and Large
leave the tax screen, each radio named by the level it sets; the spending screen keeps both ways and
the sizes. The tax screen goes tax by tax, not by who pays, so a tax's family is its section rather
than a subhead in a fold.

Fifteen pairs now count the same money, from twenty-two. The seven that named a retired tax went
with it: five against capital gains alignment, the fuel freeze against last year's cancelled rise,
and the gambling rise against its reversal.

## Revision (2026-09-30): pick one, as one choice or by taking out (ADR-0036)

A pair that counts the same money no longer blocks on step 4. Where both are ticks in one tax
decision and contradict nothing else, they are one choice among radios, “As planned” first, and
choosing one takes the other out. Anywhere else choosing one takes the other out and says so first,
priced with it gone. The “You can’t have both” notice stays on step 4 only where a flagship the
player chose holds the other, and there it offers the way back to that flagship, never a swap; step
3 keeps the notice and its swap. Undoing the 2024 capital gains rise now counts against both rates
on gains, which makes seventeen pairs.

## Revision (2026-09-30): one card a decision (ADR-0037)

A step-4 card was one policy. Now an open decision is one card with a row for each choice, and the
spending screen goes by decisions as the tax screen does. Each budget is one scale with the plan
among its levels, from 5% less to 5% more (public investment from 10% less to 20% more), so Small,
Medium and Large leave the game, and “Choosing this replaces …” with them; the groups’ folds and
their family subheads went. A row says what choosing would do, with no headroom, and its adviser’s
line waits until it is chosen; everything else about the lever is in the card’s one fold. Every
choice has a short name in its decision (“Food”) and keeps its plain name everywhere else.
