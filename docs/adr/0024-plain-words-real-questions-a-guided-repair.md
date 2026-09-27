# ADR-0024: Plain words, real questions, a guided repair

Date: 2026-09-27. Status: accepted; revised the same day by ADR-0025 (see the revision at the
foot). Builds on ADR-0002, ADR-0011, ADR-0016, ADR-0022 and ADR-0023, each of which carries a
dated revision pointing here.

## Context

Playing the Phase 22 build, the user gave thematic content feedback and asked for it to be
extrapolated:

> Let's really clean up this content. Remember it should be GDS inspired content generally.
> Reading age of 10-12. Remove "no right answers". Get rid of "every number sourced". Put show
> workings in the bottom. Remove dark mode. Put every lever at bottom. Get rid of showing today's
> date and length of time to budget. Make it so there's a question before the forecast (e.g. We
> don't know the state of economy on budget day. How much do you want to forecast?). Treasury
> should very quickly explain fiscal rules. E.g. in plain language with a pop out to explain
> further. Again, headroom - ask an actual question. Then remove Why about 20bn and replace with
> more info about headroom. Remove see the numbers but do show somewhere that the headroom has
> gone down due to additional spending commitments. Remove why this matters and what the prime
> minister has already commited. Instead write something about the theme of the budget. This
> allows our Comms team to explain this to voters and helps advisors provide valuable
> suggestions. Get rid of why this matters and the advisor at the top. Add a short advisor line
> against each policy suggestions (e.g. policy suggestions from think-tank x , expensive but would
> certainly make a difference). I think some thinks are marginal in terms of manifesto breaks -
> the health and social care levy is essentially an NI rise, as is employer NICs. These should be
> ambers. Higher rate of income tax too. The policies need to be clear Basic rate of income tax is
> not clear. (A penny on the basic rate of income tax). UX on the make sums add up is not clear.
> Lets guide users more through that (let them fiddle taxes and then spending). These are
> thematic bits of feedback, do extrapolate where appropriate too.

Four points were settled with the user before building:

| Question                              | Choice                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How the Budget's theme is set         | The choose-three pattern stays. The game writes the theme from the ranked priorities; nothing new is typed or picked.                                                                     |
| The starting position's two questions | Both on one screen, each headed by its question.                                                                                                                                          |
| Which levers turn amber               | The health and social care levy, the four employer-side National Insurance levers and the new 50p rate. The manifesto's literal words stay red, and so do the four contested new charges. |
| Badge names                           | Plainer names: Official figure, Worked out, Assumption, Commentary, Game judgement. Meanings and the honesty contract unchanged.                                                          |

One honesty point the phase does not bend: the three decisions since March (VAT off electricity,
the £2 bus cap, disabled bus passes) were paid for by moving money, on the government's own
figures, so the game cannot say they used March's headroom. What has eaten the headroom is dearer
borrowing and higher inflation. The starting position says both things plainly.

## The content rules

1. **One question per decision.** Where a screen asks for a choice, the heading or the line above
   the choices is the question, in the second person. The answer is the button.
2. **Short words, short sentences.** No sentence a player meets with the folds closed runs past
   twenty words. Everyday words for things; a term of art only where it is the name of the thing
   (headroom, the fiscal rules, the manifesto), and then explained in place.
3. **Say what a policy does, not what it is called.** "Put a penny on the basic rate of income
   tax", not "Basic rate of income tax".
4. **Nothing is for the player to discover.** The one fact a screen turns on is on the screen.
   Folds are for detail a reader may want, never for the point.
5. **The badges say plainly what a number is.** The words on the badge changed; nothing behind
   them did (ADR-0002, ADR-0011 revised).
6. **A test guards it.** `apps/web/src/journey/readability.test.ts` reads every set of words a
   player meets with the folds closed: no sentence over twenty words, and a Flesch-Kincaid grade of
   seven or below, set by set.

## Decisions

### Chrome

The header is the brand and the two reference links. The footer is the utility row: one plain
line on the figures, the Show workings switch, the way to every lever (hidden on the desk, which
is every lever), Sources and licence, and what the badges mean. The dark theme is gone with its
switch, tokens, first-paint script and test (ADR-0016 revised: light only). The dateline and the
countdown are gone with the whole calendar chain (data, schema, type, parser, loaders, fixture and
validator check): a player does not need today's date to write a Budget, and the Budget's own date
stays on the opening. The opening's meta line reads "About 10 minutes · Seven steps". The guide
keeps a heading and one line per step; the "Why this matters" fold and the fields behind it are
gone, so a word a newcomer must know is explained where it is used. The `stageTerms` check stays
for the `now` lines, so a bracketed glossary term still resolves.

### The starting position

Three figures and one line on the rules ("Two rules: pay for day-to-day spending with tax by
2029-30, and have debt falling by then. Miss one and the OBR says so on Budget day."), the
Charter's own words one fold away under "About the fiscal rules". A visible account of what has
been promised since March, each decision with its cost, its year and how it was paid for, then the
honest sentence: each was paid for by moving money, so none used the headroom; what has cut the
headroom is dearer borrowing and higher inflation, with the readings' figures and the adviser's
card figure against March's. Two questions outright: "Nobody knows what the economy will do by
Budget day. Which forecast will you plan on?" above the cards and "How much headroom do you want to
keep?" above the targets, with "What is headroom?" beneath in place of "Why about £20bn?" (the
advisers' rule of thumb keeps its badge and its six sources). The sliders and the readings table
are workings. The forecast screen says how it was made in one visible line with the seed; its
tables are workings too.

### The theme

The priorities screen writes the theme of the Budget from the ranking as it is made ("A Budget
for defence and the cost of living"), through a pure engine helper (`budgetTheme`), with one line
saying the Comms team will explain the Budget this way and the advisers will suggest ways to
deliver it. The Prime Minister's opening lines leave the data and the schema. The review repeats
the theme. The manifesto line reads "The manifesto's promises still apply."

### The options

Every way to pay has a `title` that says what it does, unique across every screen and carried
into the review, the compromises and the speech; eleven ways to deliver that named a document
rather than an act were renamed the same way. Every deliver, afford and add-on option carries
`advice`: a simulated line of at most twelve words in the voice of the screen's adviser (the
Director of Public Spending on the priority screens, the Director of Tax on paying for it, the
Political Adviser on the add-ons), saying who proposed it and one plain judgement of cost and
effect, with at least one source. The authoring rule is tested: no figure in the line; a size word
("big", "expensive", "large", "costly"; "small", "cheap", "little", "modest", "tiny") only where
the engine's own standalone figure for the option bears it out, big at £5bn or more, small at £1bn
or less; the adviser named must speak on that step. The card shows it under the title, outside
the label, so it is not part of the checkbox's accessible name; the proposer's line and the lever's
headline stay behind "More about this". The voices at the top of the option screens went: the
Prime Minister's briefs above the priority screens (`brief` leaves the data), the interventions
above paying for it (the desk keeps its advisers), the Political Adviser's introduction to the
add-ons (`rabbit.intro` stays in the data, unshown). On the add-ons screen the two bespoke cards,
keeping the headroom and going further on a priority, carry the Political Adviser's short line as
their advice, so every card on the screen has one. ADR-0023's "one voice" rule is revised.

### Amber: strains the manifesto

A promise gains `strains` beside `breaks`: the levers that keep its words and test its spirit,
each with a short text saying why. The tax lock's are the health and social care levy (a levy on
pay and employers is National Insurance by another name), employer National Insurance's rate,
threshold, pension contributions and partnership profits (not named in the pledge; still National
Insurance), and the new 50p rate (not a rise in the three named rates; an income tax rise). The
validator checks every code exists and that no code sits in both lists. The engine reports
strains beside breaks: `promiseStrains`, `ambitionStatus.strains` and `strained` (a promise both
broken and strained counts once, as broken), `optionRedLines` with a severity, `affordSuggestions`
with `strains`, a `manifestoStrained` reading with its causes, a `promise-strained` intervention
after `headroom-below-target`, a `strained` promise fate labelled "kept, in the words". The cards
and the desk show an amber tag ("Would strain the manifesto: The tax lock"; before the lever
moves, "Manifesto: contested"); the compromise rows say "strains". The reception loses one point
with the backbenchers and one with the public for a strain, with no cap: the public's floor stays
for the literal breaks. The levers' legal considerations say the same in words, and `nicer` and
`it50` gain one. Not changed this phase: `rebellionRisk`, which weighs breaks and not strains; a
strained-promises weight is a follow-up, recorded here rather than added without a rule to cite.
The speech is unchanged.

### The sums, one question at a time

The compromise step is three screens under the same stage, on the pattern of the priority
screens (`/compromise`, `/compromise/2`, `/compromise/3`; a number outside the three clamped, the
first keeping its bare route). Each screen is the bar, one question as its heading, the choices,
one primary button and one Back:

| Screen | Short of the target, or a rule missed                                                                                               | Room to spare                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1      | Will you raise more tax? The Director of Tax's three ways to pay not yet chosen, ranked by yield, with Do it. Next: spending.       | Will you do more for your priorities? The ways to deliver, one per priority first. Next: tax. |
| 2      | Will you spend less, or later? What was chosen to deliver: a later start, half the distance, dropped; who feels it. Next: headroom. | Will you ease off a tax rise? The ways to pay chosen, each with Drop it. Next: headroom.      |
| 3      | Will you keep less headroom? The four targets; with a rule missed, "Or borrow, and say so"; the stress test one fold away.          | Will you keep the extra headroom? The targets; the stress test. Next: final choices.          |

The headings carry no figure: the bar says the gap. The mood is read again on every screen, so
dropping the only tax rise on the second screen shows the sums' second screen in its place. The
Director of Tax's ranking runs only on the first screen of the sums and the stress test only on
the last. The forecast is 1 of 4 on the progress line; "Back to the compromises" lands on the
first screen, the add-ons' Back and the review's Change on the last. The page is a shell and
three screen components under `pages/compromise/`, with the questions and leads in one copy file
the readability test reads.

### The content pass

Every reception band was cut to twenty words or fewer (fifty bands; the sourced anchors kept where
they fit, the sources kept throughout); the target route's full line, two ministers' short lines,
a verdict's line and one option's line lost their Treasury shorthand ("deleveraging", "uprating",
"incidence", "consequentials"). The words test's jargon rule now has two lists, the acronyms and
the words of the trade (accruals, forestalling, outturn, consequentials, fiscal mandate,
deleveraging, uprating, incidence), and reads every set a newcomer meets: the guide, option titles
and advice, the targets, the compromise questions and leads, the priorities, the forecast
outcomes, the verdicts, the interventions, the reception labels and bands, the ministers' short
lines and the compromise routes. A glossary entry may name the word it defines.

The readability test splits a text into sentences at a full stop, question mark or exclamation
mark followed by a capital, a quote mark or a figure ("No. 10" excepted), counts syllables by the
usual heuristic (vowel groups, less a silent e; a figure counts one) and applies Flesch-Kincaid:
0.39 × words per sentence + 11.8 × syllables per word − 15.59. Measured on 2026-09-27, with every
placeholder filled as the page fills it:

| Set                      | Texts | FK grade |
| ------------------------ | ----- | -------- |
| The guide                | 20    | 1.8      |
| Option titles            | 63    | 4.8      |
| Option advice            | 63    | 4.7      |
| The priorities           | 24    | 3.5      |
| The promises             | 12    | 6.7      |
| The targets              | 8     | 0.5      |
| The forecast outcomes    | 15    | 4.7      |
| The compromise questions | 20    | about 1  |
| The compromise routes    | 8     | 4.1      |
| The reception labels     | 21    | 4.9      |
| The reception bands      | 50    | about 6  |
| The verdicts             | 18    | 5.5      |
| The interventions        | 8     | 5.8      |
| The add-ons' lines       | 2     | 5.5      |
| The ministers            | 82    | 5.5      |

Every set is under seven, so the test pins a fixed seven rather than a measured grade. Proper
nouns (National Insurance, the manifesto, the Chancellor, the OBR) hold the promises and the bands
highest.

## Consequences

- **Word budgets** (the budgets test, folds closed, 2026-09-27, pinned with about a tenth to
  spare): the opening 27, the starting position 303, the priorities 138, the priority screens 145
  to 184, paying for it 536, the forecast 114, the sums 67, 73 and 43 by screen, the room to spare
  57, 44 and 46, the add-ons 252, the review 105, Budget day 205. The option screens carry
  more words than in Phase 22 (an adviser's line a card); the compromise screens carry far fewer
  each; Budget day fell with the bands.
- **Playtime** (the Phase 20 method, unchanged: visible words at 200 words a minute, ten seconds
  a decision, three a screen change; not user testing): fourteen screens and fourteen decisions;
  reading everything 13m 42s, the skim set 8m 58s, midpoint about eleven minutes. The three
  compromise screens add two screen changes and two counted decisions to the Phase 22 walk. The
  opening keeps "About 10 minutes", which sits between the skim and the midpoint.
- **The walk** (`walk23.mjs`, in the session scratchpad with its predecessors): light and
  reduced-motion runs at 1300px and 360px with the contrast, size, family, hit-box, radius and
  animation audits on. It checks the header carries no switch and no small line, the footer the
  switch, "Every lever" and the licence link, no dateline, none of the retired phrases anywhere,
  the starting position's rules line, since-March account and two questions, the theme line and its
  change on ticking, an adviser line on every option card, the levy card amber and the penny card
  red, the compromise screens walked 1 → 2 → 3 by the primary button and the mood flipped when the
  only tax rise is dropped, the breach route on the last screen, and Budget day with the levy alone
  not Furious. The "one voice" audit is dropped. The display face is allowed on question legends and
  the theme line, which are headings in role.
- **Amber changes the reception.** The levy or employer National Insurance no longer pin the
  public at Furious; each costs a point. That is the user's judgement, recorded here with the rule
  texts; the cap stays for the literal breaks.
- **What was not built.** A strains weight in `rebellionRisk`; the speech's silence on a strain;
  the desk keeps the Treasury's own terms in its lever headlines and drawers, because it is the side
  room and the readability test reads the road; `rabbit.intro` stays in the data unshown.

## Revision (2026-09-27, later): one estimate, six steps (ADR-0025)

The content rules stand. Two of this record's questions went with the forecast guess: "Which
forecast will you plan on?" and "How much headroom do you want to keep?" The briefing gives one
figure instead, today's estimate, and asks nothing. The three compromise screens, one question
each, went too: the sums are made on step 4's two fine-tuning screens, taxes first and then
spending, which keeps this record's order. The readability test now reads twelve sets; the
targets, the forecast outcomes, the compromise questions and routes and the add-ons' lines left
with their screens, and the fine-tuning screens' titles and advisers' lines joined. The grades as
re-measured are in ADR-0025.
