# ADR-0028: Basic and advanced

Date: 2026-09-29. Status: accepted; revised the same day (below, ADR-0030 and ADR-0031). Revises
ADR-0013 and ADR-0027, each of which carries a dated revision pointing here.

## Context

After Phase 26 every player saw the whole game. Step 3 offered every way to deliver a priority, 29
in all and up to five a screen. Step 4 showed 27 policies on arrival and 114 more a fold away, and
was about 7.5 phone screens tall. The briefing carried three explanatory folds and a "Since March"
account. The user asked for a simpler first game:

> Let's simply further. Default to a basic mode, they can then go to an advanced mode if they'd
> like. Basic mode, only suggest the best ideas.

We read "simply" as "simplify". Four questions were put to the user before anything was built:

| Question              | Choice                                                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What "best" means     | **The advisers' shortlist.** Each screen's adviser picks a few, shown as their judgement and badged Game judgement. Rules make the picks checkable: worth £1bn or more, counting by 2029-30, not "not on the table", breaking no manifesto promise, and never two that count the same money. |
| What basic mode trims | **Step 4**, to about eight ideas a screen with no folds; **step 3**, to the best one or two ways to deliver each priority; **the briefing**, to the headroom, the rules and what is already on the desk.                                                                                     |
| How to switch         | **A footer switch, plus a link on each trimmed screen.** Basic is the default, remembered in the browser. Anything already chosen stays on screen in either mode.                                                                                                                            |
| The workings          | **Two switches.** "Advanced mode" shows every idea; "Show workings" stays as it was.                                                                                                                                                                                                         |

## Decisions

### The shortlist

"Best" is a judgement, so the screen that states it wears the Game judgement badge, and each pick's
reason is its own adviser's line, already on its card and already sourced. A pick is a flag on a
step-4 policy or a step-3 way (`shortlist: true`); the rules keep the judgement honest.

- **Worth £1bn or more.** At its smallest size a pick moves 2029-30 headroom by at least £1bn on
  today's estimate, priced as its card prices it: interest included, and a move made only of
  investment priced on the debt rule. This needs the engine, so the tests check it.
- **Counts by 2029-30**, the year the rules are tested: no earliest start after it.
- **On the table**, and **breaks no promise at any size it comes in**, the two-child pledge
  included. A strain, amber, is allowed, and the card still shows it.
- **Never two that count the same money**: no `excludes` pair and no option conflict among the
  step-4 picks, the step-3 picks and the levers already on the desk.
- **How many.** Step 4: one way per lever, six to ten picks a screen, at least one in every group.
  Step 3: one or two picks a priority, at least one of which delivers it in full.

The validator enforces all but the £1bn bar, with one message for each way a pick can break a rule.

**The desk rule.** The briefing's "Already on your desk" names two levers: keeping VAT off
electricity, which is a pick anyway, and the defence plan's unfunded gap, which at £0.8bn is too
small to be one. Basic mode always shows a lever on the desk, wherever it appears, so the briefing
never points at something basic mode hides. A desk lever is not a pick and is not held to the pick
rules.

**Step 4, tax: 8 of 95.** Headroom in 2029-30 at the smallest size, on today's estimate, £bn.

| Group                                 | Pick                                                        | Headroom | Note                            |
| ------------------------------------- | ----------------------------------------------------------- | -------- | ------------------------------- |
| Everyone                              | Bring back the health and social care levy                  | +29.5    | amber: strains the tax lock     |
| Everyone                              | Keep VAT off electricity after March 2027                   | −2.2     | on the desk too                 |
| The best-off                          | Tax capital gains at the same rates as income               | +21.3    | from 2028-29                    |
| The best-off                          | Give everyone the same 30% pension tax relief               | +3.9     |                                 |
| Business                              | Charge employer National Insurance on pension contributions | +11.5    | amber; a relief cost, "at most" |
| Savers and owners                     | Double council tax on the biggest homes (bands G and H)     | +4.5     | from 2029-30                    |
| Savers and owners                     | End the extra inheritance tax allowance for family homes    | +3.2     | a relief cost, "at most"        |
| Drivers, smokers, gamblers and flyers | Put gambling duties up again                                | +1.3     |                                 |

**Step 4, spending: 7 of 46**, with the defence plan's gap shown by the desk rule.

| Group                 | Pick                                                       | Headroom                |
| --------------------- | ---------------------------------------------------------- | ----------------------- |
| Public services       | Spend more on health and social care (1% more)             | −2.7                    |
| Public services       | Spend more on schools and education (1% more)              | −1.2                    |
| Investment            | Spend more on public investment (5% more)                  | −7.2, on the debt rule  |
| Investment            | More council and social rent homes                         | −4.2, on the debt rule  |
| Benefits              | Raise housing benefit to match local rents                 | −2.3                    |
| Last year's decisions | Go ahead with the 2025 cuts to PIP                         | +4.9                    |
| Last year's decisions | Limit winter fuel payments to pensioners on pension credit | +1.5                    |
| _(on the desk)_       | Fund the defence plan's gap                                | −0.8, shown, not picked |

Left out on purpose: restoring last year's cancelled fuel duty rise (£0.97bn, just under the bar),
defence at 3% now (it counts the same money as the plan's gap on the desk), and every lever that
breaks a promise (the basic rate, VAT, the National Insurance upper limit, the two-child limit, the
triple lock).

**Step 3: 13 of 29 ways**, each card's own price in £bn: ending the threshold freeze early (−8.8)
and free school meals for every child (−2.6); more for the NHS than the Spending Review planned
(−8.1) and cancelling the extra efficiency savings (−4.1, a start); defence's day-to-day budget up
5% (−2.4); a special needs settlement (−5.9); 10% more public investment (−14.3) and council homes
(−4.2), both on the debt rule; housing benefit to local rents (−2.3) and universal credit up 2%
(−2.3); more for prisons and courts (−1.5) and for the Home Office and borders (−1.2); and going
ahead with the PIP cuts (+4.9). Three of them break a fiscal rule until the player pays for them:
the freeze and the NHS on the day-to-day rule, investment on the debt rule. The shortlist offers
good ways to deliver a priority, not free ones.

### The mode

- **Basic by default**, remembered in the browser (`btc.mode.v1`); anything but "advanced", and a
  browser that blocks storage, reads as basic. Outside its provider a component reads advanced, so
  one rendered on its own shows everything.
- **Never in the link.** The mode is the viewer's own: a shared Budget opens in the recipient's
  mode, and every lever it moves is on show there, because nothing chosen ever hides.
- **Two switches in the footer**, "Advanced mode" beside "Show workings", each doing one thing and
  neither moving the other.
- **One line on each trimmed screen.** In basic mode: "A shortlist." beside the Game judgement
  badge, and a button, "See every idea" (on the briefing, "Read the full briefing"). In advanced
  mode the same button offers "Show only the best ideas" ("Show the short briefing"). It is one
  button in one place in both modes, so the focus stays on it when the screen changes, and a quiet
  status says what changed. A screen reader hears what every idea means ("all 95 tax policies").
- **Nothing chosen ever hides.** A screen reads what was chosen when it opened, and reads it again
  when the mode changes, without remounting: a policy chosen in one mode is on show in the other,
  and a card chosen or undone on screen stays where it is until the next visit.

### The screens in basic mode

- **Step 4** shows, for each lever: a flagship's line where a chosen flagship holds it; else the
  policy it was chosen with; else the adviser's pick; else, for a lever on the desk, its usual
  policy; else nothing. No fold. A group at rest names no count of policies that are not on show.
  The lead names whose best ideas these are: "Your Director of Tax's best ideas. Watch your
  headroom move."
- **Step 3** shows the picks, a way that moves a lever on the desk, and any way not off when the
  screen opened. The line appears only on a priority that has ways to hide, so its place never
  moves; safer streets offers two ways, both picked, and has none. The page now renders one screen
  per priority, keyed by its number, because the router keeps the page from one priority to the
  next and each screen's reading of what was chosen belongs to that screen.
- **The briefing** keeps the headroom and what it means, the line on what it comes to for each
  household, its source, the advisers' yardstick, the rules in one line and what is already on the
  desk. "About the fiscal rules", "Since March" and "What is headroom?" wait for advanced mode. "How
  the estimate is made" follows the workings switch, as before.
- **Everything else counts every way.** The bar, the review, the Prime Minister's price line on the
  priorities screen and Budget day's "left out" fact read every option in either mode, so a shared
  link reads the same for everyone.

## Consequences

### Measured

- **Word budgets**, folds closed (`budgets.test.tsx`, which now measures each trimmed screen in
  both modes): basic mode's briefing 159 words (advanced 237), the widest flagship screens 130, 54
  and 110 (205, 182 and 165), fine-tuning tax 343 on arrival and 492 with one more measure chosen
  in every group (615 and 780), spending 424 and 589 (582 and 763). Each is pinned with a tenth to
  spare; advanced mode keeps its limits after gaining its one line.
- **Readability** (`readability.test.ts`): a seventeenth set, the modes, reads at grade 3.4; the
  fine-tuning screens, with the two new leads, stay at 5.7.
- **Step 4 on a phone** (`measure27.mjs` in the session scratchpad, 360px, two priorities agreed,
  nothing chosen): tax 3,704px, 4.7 screens of 780px, with 24 figures, against 6,066px, 7.8
  screens and 60 figures in advanced mode; spending 4,263px, 5.5 screens, with 38 figures, against
  5,930px, 7.6 screens and 70 figures.
- **Playtime** (`playtime27.mjs`, an estimate from the rendered screens, not user testing): basic
  mode 10m 52s reading everything visible and 6m 13s skimming, a midpoint of 8m 32s; advanced mode
  13m 40s and 7m 32s, a midpoint of 10m 36s. The cover now reads "About 9 minutes", basic mode's
  midpoint rounded, since a first game is played in it.
- **The walk** (`walk27.mjs`, 1300px and 360px, light and reduced motion, with the contrast,
  size, family, hit-box, radius and animation audits): clean. The Phase 26 journey runs in advanced
  mode; a fresh browser then finds every trimmed screen in basic mode, step 4 showing only the
  picks with no fold, "See every idea" showing advanced mode's screen with the focus kept, a policy
  chosen in a fold staying on show back in basic mode, the footer switch flipping all three screens
  and remembered on reload, the link unchanged by either switch, "Show workings" leaving the mode
  alone, and a shared link's measures on show in basic mode.
- **Tests**: 662 across 63 files, among them one tampered file for each validator message, the
  £1bn bar for all 28 picks, and basic mode on every trimmed screen.

### What it costs, and what was not done

- **Basic mode is shorter, not short.** Step 4 on a phone is about two fifths shorter for tax and
  a little over a quarter shorter for spending, not the half the plan expected: each card still
  carries its sizes, its adviser's line, its tags and its price. Two to three phone screens,
  ADR-0026's aim, is still not met.
- **"Best" is on screen as a judgement.** It is badged, each pick's reason is its sourced adviser
  line, and the rules make the list checkable; advanced mode is one button away.
- **Two picks strain the tax lock** (the levy and National Insurance on pension contributions),
  and both spending savings are welfare decisions last year's Budget reversed (PIP and winter
  fuel). Their cards say so, and their adviser lines say MPs would fight them.
- **A step-4 choice can switch on a flagship way basic mode would hide** on step 3. It shows,
  because nothing chosen ever hides, and every count reads every way.
- **Two preferences instead of one.** The test setup seeds both, advanced and the workings on, so
  the page tests keep their meaning; basic mode has its own tests, which clear the key.

## Revision (2026-09-29): the briefing's explanations on show in both modes (ADR-0030)

Basic mode's briefing was the headroom, the yardstick, the rules and the desk, with the
explanations waiting for advanced mode. Phase 28 puts the briefing in three parts in both modes:
what headroom is, and how the OBR's March figure became today's estimate, are on show to every
player now, because the player asked for them in that order. Advanced mode keeps three folds: the
rules in the Charter's words, what changed since March and why forecasts move. The desk rule
stands, since "Already on your desk" follows the three parts in both modes. Basic mode's briefing
now reads 205 words, against 159; advanced mode's the same 205, against 237, since "Since March" is
a fold.

## Revision (2026-09-29): the briefing the same in both modes (ADR-0031)

Basic mode no longer trims the briefing, and the line that switched it went: the briefing has no
folds of its own but the debt rule, which both modes show. The mode line is steps 3 and 4's alone,
and the footer's note says so: "Shows every policy, not only your advisers' best ideas." The desk
rule stands on a different footing: the briefing no longer names the desk, but the review lists
what a Budget leaves on it, so the levers on the desk stay on show in basic mode.
