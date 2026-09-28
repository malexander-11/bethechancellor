# ADR-0023: The Westminster journey

Status: Accepted, 2026-09-26; revised since (below), last on 2026-09-28 (the counted line,
ADR-0026). Follows ADR-0022 (advice and direction) and its revision.

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
   Budget red `#a3202a` for the delivering button and the Budget box on the opening; one light theme
   (the dark theme went behind a switch and then went altogether on 2026-09-27; ADR-0016, revised twice). Fraunces (variable, self-hosted from `@fontsource-variable/fraunces`, OFL)
   for `h1`, `h2`, the brand, the three sentences and the verdict's kind; the system sans for
   everything else, badges included (revised below). Every text pairing holds 4.5:1
   (checked by the walk's contrast audit; the good and warning inks were darkened to `#166a30` and `#7a4f00` so a
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

## Revision (2026-09-26, later): official paper

Played, the skin above read as futuristic to its first player: the solid green header band, the
coloured pill badges and tags, the sans-serif body and the rounded cards (the segmented progress
and score bars did not jar). Asked which direction to take, they chose "official paper": the page
set like a well-set Treasury or parliamentary document. The palette, the words, the journey, the
tests and every class name a test pins are unchanged; what changed is the set of cues.

1. **A serif body.** Source Serif 4 (variable, self-hosted from `@fontsource-variable/source-serif-4`,
   OFL-1.1; the latin weight file is about 50 KB, italics another 50 KB) for every word that is not
   a heading. Fraunces stays for `h1`, `h2`, the brand, the three sentences, the verdict's kind and
   now the step numerals. Sizes and the 14px floor are unchanged; the line height rises to 1.55.
2. **A paper header with a green rule.** The header is the page's paper with a 3px Commons-green
   rule beneath it; the brand, the two links and the switch are set in ink, the current link and a
   hover in green; the browser chrome's light theme colour is the paper.
3. **Square corners.** `--radius` is nought and the seven pill radii are gone. Checkboxes, radios
   and the slider thumb keep the browser's shape; the Budget box motif is drawn as before.
4. **Rules, not boxes.** Every container that was a bordered, filled, rounded card (the document
   blocks, the option cards, the headroom bar, the adviser quotes, the review, the scenarios, the
   targets, the households, the verdicts, the scorecard, the desk's panel and drawer, the notices)
   is a block on the paper with a hairline above and below, the text flush with the page; two
   blocks in a row share one rule; a quotation carries a 2px rule in its speaker's colour on the
   left; a chosen option, scenario or target carries a 3px green mark in the margin and a faint
   wash. The sticky bar and the sticky scorecard keep the page's own colour behind them, so they
   can sit over content.
5. **Small capitals, not pills.** The five badges, the tags, the kickers, the ranks, the bar's
   labels and the step counter are set in small capitals (`font-variant-caps`, so nothing is
   transformed for a reader) at 15px, tracked, in the colour that carries their kind: the badge
   inks of ADR-0011 straight on the paper, `--ink-2` for a tag, `--muted` for a quiet one, green
   for a Treasury one, Budget red for a warning whose words already say what it warns of.
6. **Numerals, not a bar.** The progress is a running head: "Step 4 of 7 · Build your Budget ·
   2 of 4" and the dateline, then seven numerals on a brass rule, the current one green with the
   rule thickened above it, the ones behind links in ink, the ones ahead muted. The seven list
   items, the links, `aria-current`, the sr-only names and "(not yet open)" are exactly as before;
   the visible numeral is `aria-hidden`.

Every moved pairing was re-audited on every screen in both themes (`walk21.mjs`, which also refuses
any corner radius outside the browser's controls and the motifs): on the light paper the badge inks
sit at 6.3:1 to 9.9:1, green at 6.2:1, brass ink and the muted numerals at 5.6:1; on the dark paper
nothing is under 6.5:1. The word budgets, the playtime estimate and every page test are unaffected.

## Revision (2026-09-26, later): the compromise screen follows the headroom

The same player found "Make the sums add up" wrong for a Budget the forecast had left with more
headroom than they set out to keep: the routes out of a gap were offered when there was no gap.
The screen now has two moods, decided by the engine's headroom against the player's target and
the rules. Short, or with a rule missed, it is the screen above. With room to spare and every rule
met it is **Make the most of your extra headroom**, with three routes: _do more for your
priorities_ (the ways to deliver the ranked priorities not yet chosen, the first open way of each
priority in rank order and then the second of each, a way blocked by one already in the Budget
skipped, each priced against the Budget as it stands with the headroom it would leave, and a **Do
it**); _ease off a tax rise_ (the ways to pay already chosen, each with the headroom dropping it
would leave, and a **Drop it**); and _keep more headroom_ (the target, with the Chief Economic
Adviser's case for the margin). There is no borrowing route and no breach aside in this mood, only
a way to withdraw an acknowledgement signed earlier. The forecast's primary button says which
screen follows ("Respond to it" or "Make the most of it"). The three new advisers' lines live in
`compromise.json` beside the four, sourced and badged like them, inside the forty-word budget; the
guide's title stays the sums', the page overriding it in the other mood. The screen changes mood
as the headroom moves: dropping the only tax rise, or raising the target past the headroom,
brings the sums back, which is the point. `deliverSuggestions` (engine) and the two moods are
tested; the word budget for the surplus screen is measured and pinned beside the sums'.

## Revision (2026-09-27): half the words

Playing the official-paper build, the same player said: _"Too busy, too many words. Needs to be
really crisp and clear. Much much fewer words."_ Asked how far to go, they chose to halve the
words on every screen, to let one voice speak per screen, and to show each audience on Budget day
its rating and one reason. Six rules did it, and every screen of the road now keeps them:

1. **One heading, one line, one button.** The line is the guide's "do now", at most ten words;
   one primary button and one Back; no hint lines.
2. **One voice.** At most one adviser's or minister's line on a screen, in a short form of at
   most fourteen words with its role and badge. Every other simulated line folds: "More about
   this" on a card, "What the advisers say" for the other notes, "Advice from the …" on a
   compromise route. A minister's reaction shows only on the card that was chosen.
3. **A card is its title, its badge and its figure**, plus a red-line or earliest-start tag and any
   live overlap or clash; the lever's headline, the quiet overlaps and the proposer's line wait
   behind "More about this".
4. **Say a fact once.** The bar carries the headroom, the year, the target and, only when one is
   broken or missed, a promise or a rule; the gap lines, the year hints and the "no rule is
   missed" aside went. The review lists an add-on once.
5. **The footer is one line**, with what the badges mean behind it.
6. **Folds are the depth.** Everything cut lives in "Why this matters", "More about this", "See
   the numbers", "What the advisers say", "Why this rating" or "The close in full": closed on
   arrival, openable from the keyboard, never holding a badge or a figure the screen relies on.

In the data, every simulated line a newcomer meets on the road gained a `short` (the Prime
Minister's briefs and longer reactions, the advisers' notes, the add-ons' framing lines, the
verdicts' close; the compromise routes' shorts trimmed to fourteen words), the forecast cards an
eight-word short, the priorities a five-word purpose and the target notes five words. Nothing
else in the data or the honesty contract moved: every cut line is one tap away with its badge and
its sources where it shows, and the desk, the side room, is untouched. The words test checks every
short form against its limit and that it is shorter than its line.

Measured with the folds closed (the budgets test, jsdom): the opening 60 → 30 words, the
position 267 → 132, the priorities 192 → 109, the priority screens 244 to 316 → 80 to 125,
paying for it 564 → 290, the forecast 126 → 91, the sums 302 → 140 (room to spare 225 → 106),
the add-ons 391 → 140, the review 121 → 98, Budget day 529 → 233: about 3,400 words along the
road became about 1,560, and each screen is pinned with a tenth to spare. The playtime estimate
(the method above, unchanged) fell from 11m 25s skimmed and 18m 19s reading everything to 8m 17s
and 10m 07s, a midpoint of about nine minutes: an estimate from the rendered screens, not user
testing. `walk22.mjs` adds to the audits: at most one voice on a screen, no card note outside a
fold, no gap line, no year hint, and a fold that opens and closes from the keyboard; it walks
clean in light, dark and reduced-motion modes at 1300px and 360px.

## Revision (2026-09-27, later): one voice, reversed on the option screens

Phase 23 (ADR-0024) puts one adviser's line on every option card and takes the single voice off
the top of the priority, pay-for-it and add-on screens. Rule 2 above ("one voice") therefore no
longer holds on those three screens: the voice is per card, at most twelve words, badged and
sourced, and nobody speaks above the cards. It still holds on every other screen of the road. The
same phase makes the compromise step three screens, one question each, under the same stage, and
retires the dark theme and the dateline; ADR-0024 records why.

## Revision (2026-09-27, later still): six steps (ADR-0025)

The road is six steps, as the user listed them: Briefing, Set your priorities, Flagship policies,
Fine-tune tax and spend, Deliver the Budget, Feedback. The rules above still hold on every screen
(one decision, one primary button, no tab on the road, the state in the link, detail one fold away,
the score in view), and the rail shows six numerals. What went: the forecast step, the three
compromise screens and the add-ons (so "respond to the forecast" and "final choices" are gone, and
the review is a step of its own), and the target on the bar, which now says "rules met" or what is
missed. "Pay for it" became two curated screens of real levers. The desk's hand-back links return
to fine-tuning.

## Revision (2026-09-28): the one reason, and the other side (ADR-0026)

"Half the words" showed each audience its rating and one reason, the strongest. The strongest
could point the other way from the rating: a minus on a card rated four. Now the one reason always
agrees with the rating. It is the capping rule when a cap binds; otherwise the biggest minus below
three and at three, and the biggest plus above three. When something pulled the other way, one
short line names it: "Counted against: Tax burden · Uncertified costings", eight words at most.
The fold says how many rules pulled each way: "Why this rating (2 for, 1 against)". One voice a
screen still holds; on the review, that voice is the Prime Minister's sign-off.
