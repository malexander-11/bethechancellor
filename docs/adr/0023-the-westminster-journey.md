# ADR-0023: The Westminster journey

Status: Accepted, 2026-09-26. Follows ADR-0022 (advice and direction) and its revision.

## Context

After Phase 19 the user asked for the interface to be redesigned and implemented as one clearly
guided journey, in these words (abridged):

> Act as a senior product designer and front-end engineer. Redesign and implement the interface of
> my existing game … The underlying mechanics already exist. The work is to transform the
> presentation, content and user journey while preserving the game's calculations, policy effects
> and meaningful choices. … By the end, someone should be able to say: "I prioritised these things,
> paid for them this way, and accepted these consequences." It must work for both a 60-year-old
> with little interest in economics and an enthusiastic university student. Aim for a satisfying
> first playthrough of around 10 minutes, comfortably under 12. … Create one clearly guided journey:
>
> 1. Become Chancellor … 2. Understand your starting position … 3. Set your priorities … 4. Build
>    your Budget … no tabs … 5. Respond to the update … 6. Make your final choices … 7. See what your
>    Budget means. … The main journey must never require navigating tabs. Use clear forward and back
>    actions, a simple progress indicator and one obvious primary action per screen. Extra detail
>    should expand within the current context … Preserve selections when going back. Make the
>    trade-offs visible … Give the game a distinctive British parliamentary identity … Design for
>    mobile first … Be ruthless about content … The final screen should help players express their
>    position … Do not stop at a mock-up, a plan or a redesigned landing page.

What the game looked like before (Phases 9 to 19): a plain editorial skin with one teal accent
(ADR-0016), a guide card and a progress rail at the head of every page, every step arriving in
"beats" with a Continue between an adviser's hand-off and the work (ADR-0009), the package as two
guided screens of which the second held five who-pays tabs, the desk with its tablist one link
behind, the forecast in two rounds with two Continues, Budget day in three beats, and eight
Continues on the road in all.

## Decisions

1. **Seven screens, named as the player is told them.** Become Chancellor (`/`), your starting
   position (`/outlook`), set your priorities (`/pm`), build your Budget (`/budget/deliver`,
   `/budget/deliver/2`, `/budget/deliver/3`, `/budget/afford`), respond to the forecast
   (`/forecast`, `/compromise`), final choices (`/rabbit`, `/review`), what your Budget means
   (`/budget-day`). The stage indices baked into shared links (`st.N`) do not move: `/review` is an
   alias of the rabbit stage, the priority screens are aliases of the deliver stage. Every old link
   opens on the same Budget.
2. **One screen, one decision, one primary button; no beats.** The `beats` module, its Continues,
   the ceremony preference and its tests are deleted. Each screen has one `.btn--primary` (a
   `StepLink` or a button) and a plain Back; the advisers' hand-offs survive as one-line leads,
   inside "Why this matters", or folded at the head of the desk. Detail expands in place in
   `details` elements, closed on arrival: "Why this matters" (the guide's reasons and the glossary),
   "See the numbers", "More policies", "The morning papers", the stress test, "Read the speech",
   "Who feels it", "Budget documents".
3. **No tab on the main road.** Step 4 is one screen per ranked priority, in rank order, with the
   lead minister's line, one adviser's note (the one about this priority, else one about the
   Budget as a whole), that priority's costed options and "Next: {the next priority}"; then one
   screen to pay for it with the five who-pays groups stacked, each heading carrying "n chosen ·
   raises £X" so who pays is visible at a glance, the first three ways of each group on show with
   anything already chosen, and the rest of the group under "n more ways", so nobody has to read
   every measure to decide. Five sequential who-pays screens were considered and rejected: eight
   sub-steps would push a first play past ten minutes. The desk keeps its tablist as a side room
   reached only by "More policies"; the link carries the exact screen to return to in the
   router's state, and the progress line names the side room rather than counting it.
4. **The score stays in view.** A slim sticky `HeadroomBar` replaces the Scorecard and the summary
   strip on the building, compromise, add-on and review screens: the engine's headroom in the
   target year against the margin the player set, priorities delivered, promises kept, rules met.
   A card's "leaves £X" is the figure the bar shows once the card is ticked, to the pound (a test
   holds it).
5. **The forecast opens by state, not by beats.** Unrevealed, the screen is one sentence, the sealed
   envelope and "Open the forecast"; revealed, it is what the OBR changed in two lines (the economy;
   the re-scored costings), the bottom line against the target and the rules, what that does to the
   ambitions, and "Respond to it", with the tables, the story's sources and the disclosure of the
   draw under "See the numbers". The two rounds of ADR-0018 are still there in the arithmetic; the
   second Continue is gone.
6. **A review before delivery.** `/review` reads the Budget back part by part, each with a "Change"
   link to the screen that set it (the priorities, each priority's options, the ways to pay,
   anything set by hand on the desk, the add-ons, the position with what moved since the forecast),
   and one red button, "Deliver my Budget", the only Budget-red control in the game.
7. **The Budget in three sentences.** Budget day opens with "I prioritised …" (the priorities'
   nouns), "I paid for it by asking …" (the largest payers by the incidence tags, or "with less for
   …", or "out of the headroom the forecast left") and "I accepted …" (in order of weight: a rule
   missed by £X; a promise broken; £X less headroom than the target; a measure moved after the
   forecast, the add-ons excluded because they are announcements; or none). Every clause is read
   from the engine or the player's own choices; the card wears the mechanical badge. The three
   reactions, the close, the speech, the households and the documents follow, unchanged in
   substance.
8. **Identity.** Tokens in `apps/web/src/styles/tokens.css`: Commons green `#00644a` as the accent,
   warm paper `#f3eee2` and `#fbf8f1`, charcoal `#23262a`, brass `#b3934c` (as ink `#745a1f`),
   Budget red `#a3202a` for the delivering button and the Budget box on the opening; a dark theme
   with the same roles. Fraunces (variable, self-hosted from `@fontsource-variable/fraunces`, OFL)
   for `h1`, `h2`, the brand, the three sentences and the verdict's kind; the system sans for
   everything else, badges included. Every text pairing in both themes holds 4.5:1 (checked by the
   walk's contrast audit; the good and warning inks were darkened to `#166a30` and `#7a4f00` so a
   figure holds on a picked card's wash); every control 44px tall; the reduced-motion rule of
   ADR-0016 stands. The Budget box, the Commons benches and the Budget papers are drawn as inline
   SVG (`Motifs.tsx`) and used where they mean something: the box on the opening, the papers on the
   Treasury's briefing.
9. **Words, measured then pinned.** `budgets.test.tsx` counts the visible words of every screen on
   the road with the folds closed, the road and the footer left out, and pins each with about a
   tenth to spare over the measurement of 2026-09-26: the opening 60 (limit 90), the starting
   position 267 (300), the priorities 192 (220), a priority screen 244 to 316 (350), paying for it
   564 (620), the forecast 126 (150), the sums 302 (340), the add-ons 391 (430), the review 121
   (140), Budget day 529 (580); the desk's widest group 483 (500 on the taxes) and 676 (700 on the
   spending). The four compromise routes gained `short` lines of at most eighteen words, the full
   line behind "More".
10. **Two verdict titles reworded.** "A {priority} Budget that …" put a noun phrase after "A" ("A
    the cost of living Budget"); both templates now read "A Budget for {priority} that …".

## Playtime: an estimate, not a test

`scratchpad/playtime.mjs` plays one seed end to end at 1300px and, on every screen of the road,
counts the visible words (folds closed) and a skim set (the heading, the instruction, the headroom
bar, the advisers' lines, the card titles and figures, the group headings, the reaction reasons and
the buttons), and the decisions the walk takes there; it charges 200 words a minute, ten seconds a
decision and three seconds a screen change. On the build of 2026-09-26, twelve screens and twelve decisions: 1,762 skimmed words, 3,144
visible; the skim comes to 11 minutes 25 seconds at 200 words a minute (about 9 minutes 40 at 250),
reading everything visible to 18 minutes 19 seconds. So the required reading and decisions fit the
brief's "around ten minutes, comfortably under twelve" at a careful reading speed, and a player who
reads every line of every option takes longer. Neither figure is a measurement of
real players: the estimate says what the screens ask, not how long people take, and the brief's
acceptance test (start at once, always know what to do next, finish in under about twelve minutes,
explain a compromise) still needs people in front of it.

## Consequences

- Twelve screens on the road, no Continue, one primary each; the desk's tablist is the only tablist
  and is off the road. `walk19.mjs` checks all of this at 1300px and 360px in light, dark and
  reduced-motion modes, with the contrast, size, hit-box and landmark audits, that Back keeps a
  choice, that the bar shows the figure the card promised, and that the breach route, a furious
  public and a kept-promise verdict are still reachable.
- The engine, the data's numbers, the permalink codec and the saved-game behaviour are untouched:
  the Budget is the link, so going back and the review's "Change" links keep every selection.
- The Scorecard, the summary strip and the beat styles are no longer on the road; `Scorecard` and
  `BudgetSummary` remain for the desk.
- The paying screen shows fifteen of the twenty-six ways by default. The fold keeps who pays
  visible across all five groups while cutting the screen from 846 visible words to 564; the eleven
  folded ways are one tap away inside their group and any that is chosen stays on show. If user
  testing finds the groups' first three the wrong three, the order is the data's (`options.json`).
- Not done: user testing; a walk with a screen reader (the landmarks, names and folds are checked
  by the audit, not by a reader); a check of the design at 200% zoom beyond the 360px pass.
