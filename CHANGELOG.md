# Changelog

One entry per change, newest first. A decision that shapes the architecture also gets a short record
in `docs/adr`; older records are not revised.

## 2026-10-30

- The walk's last page is twenty groups, not every measure no card asks about (ADR-0049). The Budget
  file groups the measures a reader would recognise under plain headings, such as help with bills
  this winter, defence and Ukraine, or more money and powers for mayors, and leaves out the smallest
  technical lines, which stay in the file for the record and the scorecard check. A tick or a cross
  on a group is a vote on each measure in it, and "See more" says each one in its own words and the
  lines of the Budget's table they come from. The validator holds the groups to twenty at most,
  every measure in one group at most and none a card asks about.
- ADR-0048 records the landing page and the news site's look: the headline, the three numbers, how
  it works and the chart of the headroom since March; the measure with the Treasury's figure on its
  face and "See more" for the rest; Approve and Remove; and the quieter panels, rules and column. It
  supersedes ADR-0047's opening straight on the measures, its app look and its one figure a card.
  Methodology §42 says what changed for the numbers; the README and the data README describe the
  game as it is now.
- The game has a landing page again, and its screens are set as a news site's interactive
  (ADR-0048). The landing page says that the Chancellor has delivered the Budget and asks what the
  player would change, gives three numbers (the headroom left, the tax the measures raise and how
  many measures can be changed), says how the game works in three steps, and shows the Budget's own
  chart of how the headroom changed since March, with the story in a fold; one button starts. Each
  measure now shows what was done and the Treasury's figure for it, with "See more" opening what it
  means, what removing it does to the player's money with the interest, and the line of the Budget's
  table it comes from; Approve keeps it and Remove takes it out. The look is quieter: a near-white
  ground, white panels with hairline borders, black rules over sections, small corners, one readable
  column lined up with the masthead, and the money kept in view at the top.
- ADR-0047 records the opening straight on the measures and the app's look: a game from the first
  screen, the welcome and the story's fold, the white cards on a soft ground, the sticky money and
  way on, the filling progress, the tiles with their colours and steppers, one figure a card, and
  the counts once answered; it supersedes ADR-0045's opening page, the "official paper" look of
  ADR-0023 and the Treasury's figure on ADR-0046's cards. Methodology §41 says what changed for the
  numbers. The README and the data README describe the game as it is now.
- The end-to-end test of a shared Budget's "Make your own Budget" link checks where it lands now:
  the first page of measures, a fresh game with none of the shared Budget's choices. It had waited
  for the site's own address, which since the game opens straight on the measures (ADR-0047)
  redirects at once, so it failed whenever the redirect beat it, as it did in CI.
- The game looks and works like an app, with fewer words on every screen (ADR-0047). White cards sit
  on a soft green-grey ground under a white bar with the Budget box beside the name, and the body is
  set in the reader's own sans, Fraunces staying for the headings. The money stays at the top of the
  screen in a coloured pill, red to find and green to spend, and the way on stays at the foot. The
  progress is four segments that fill as the player goes. The measures are tiles in a grid, each
  with a tick and a cross, taking the answer's colour once answered; a card shows one figure, what
  disagreeing does to the player's money, and what everyone said only once the player has said it
  too. While money is still to find, the balance page shows only the ways to find it; its options
  are tiles with a plus and a minus. The review and Budget day's households are cards. The words go
  down: the line repeating what to do, the menus' leads and the Treasury's figure on each card are
  gone, and the word budgets are lower. The shared picture takes the new ground and card colours,
  and the web app no longer loads its own serif for the body.
- The site opens straight on the first page of measures (ADR-0047). Every visit is a game from the
  first screen: a link without one starts it, with the link's measures in it, so there is no start
  button and no page before the walk. Above the first theme's cards, one line names the Budget and
  the Chancellor and says what to do, and what the Budget did waits in one closed fold, every figure
  the engine's or a quoted fact as before. The Budget page and its button are gone; its address, and
  every retired one, opens the walk, and "Start again" on Budget day starts a fresh game there.
- ADR-0046 records the walk and the balance: the cards and the answer as the vote, the small print,
  the money a player has to play with, the menus as data, the floor at the Chancellor's headroom and
  the server's refusal below it, the `rd.3` road and the levers' plain names, and what it supersedes
  of ADR-0045 and the fine-tuning records. Methodology §40 says how a card's money line and a menu's
  price are worked out and what the floor checks. The README, the data README and the About and
  Methodology pages describe the game as it is now, and the data README's fine-tuning section gives
  way to the walk's themes and the balance page's menus.
- The fine-tuning data is retired with its screens (ADR-0046). Each lever now carries the plain name
  those screens gave it, and the review and the shared picture read it back by that name.
  `data/journey/finetune.json`, its schemas, its engine module and the checks that read it are gone;
  a measure's lever is checked against the walk's cards instead, and the households check covers the
  cards and the balance menus.
- The game is a walk through the Chancellor's measures, then a balance (ADR-0046). After the Budget
  page, six themed pages ask about each measure a player can reverse, one card each: what the
  Chancellor did, what it means, the Treasury's figure and what disagreeing would cost or save;
  Agree keeps it and Disagree takes it out, and either answer is the player's vote. One page of
  small print follows, a tick or a cross for each measure no card asks about, which moves no money.
  The balance page then shows what disagreeing saved or gave up: short, it offers ways to find the
  money; with money to spend, a list of priorities, each a fixed step pressed until the money runs
  out. The headroom may not end below the Chancellor's: a step that would take it there cannot be
  pressed, the review will not deliver a Budget short of it, and the leaderboard will not take one.
  The road is four steps, measures, balance, deliver and feedback; a link written on it carries
  `rd.3`, and links from the three-step road open on the step that took their place. The fine-tuning
  screens are gone, with their styles and tests.
- The walk through the Budget and the balance page's menus are data (ADR-0046), with no screen yet.
  The Budget file groups the measures a player can reverse into six themes, one card a lever, each
  with a plain heading saying what the Chancellor did and a few sentences saying what it means; a
  card that reverses several lines shows them as one figure. `data/journey/balance.json` lists the
  ways to find money and the priorities to spend it on, each a lever moved a fixed step at a time.
  The validator holds every reversible measure to one card and every option to a live lever on its
  own steps, never a measure's, the economy's or investment; a test holds each option to its side of
  the money on the engine at every press and to breaking no promise. The engine works out the money
  a player has to play with from the review's own reconciliation.
- The Budget names the Chancellor who delivered it, John Healey, on the Budget speech's own page.
  The report's title page, which the data had read, is signed by the Treasury minister who lays it
  before the House.
- ADR-0045 records the Chancellor's Budget as the baseline, the three-step road, the measures as
  levers and the votes, and what it supersedes; methodology §39 says how a tweak is priced, where
  the page's figures come from and what the votes keep; the READMEs describe the game and the data
  as they are now, the Budget file's rules and the measure levers' conventions among them.
- The public votes on the Chancellor's measures (ADR-0045): every measure on the Budget page takes a
  vote for or against, one a device, with the counts in words, kept by the leaderboard's server in a
  table of its own and tallied when asked. A device's vote is remembered in its browser beside its
  leaderboard votes, networks are limited as they are there, and the tallies, which carry nothing of
  the reader, may be cached for a minute. Without a database the page says voting is not open yet,
  and shows no buttons.
- The end-to-end suite's leaderboard tests pass in CI again: tsx 4.23.13 tagged Node's own modules
  with its namespace when PGlite required them under a newer Node, so the preview's database could
  not open and every post answered "down"; tsx 4.23.15 leaves them alone.
- The defence plan's gap is shelved: the Budget funded it by moving capital to defence (Table 6.1
  line 41), which is the lever now, so funding the gap again would count the same money twice. Old
  links that fund it still work; the lever is off the spending screen and out of the minister,
  incidence and household lists.
- The Chancellor's Budget is the starting point (ADR-0045): the site opens on what the Budget of 28
  October 2026 did, told from the OBR's forecast and the Treasury's scorecard, the measures a player
  can change listed by what each does and the rest in a fold, and one button that starts a game from
  it. The road is three steps, fine-tune, deliver and feedback: the briefing, the priorities and the
  flagships retired, and a Budget is named by how far it changed the Chancellor's. Old links open on
  the step that took their screen's place, and a link written on this road says so. The public now
  approves of money that shows in a service and of revenue asked of the best-off, as it once did of
  a priority delivered. The styles of the retired screens went with them.
- The Chancellor's measures are levers (ADR-0045): the Budget 2026 decisions of £100m or more in
  2029-30, and a few headline ones, are each a toggle that reverses the Treasury's own scorecard
  line, costed from Table 6.1 and sourced to the policy costings, offered on step 4 beside the tax
  or budget they belong to, with a minister, an incidence tag and a household for each. Three levers
  the Budget overtook are shelved: HMRC compliance again, another 2p on investment income and the
  April 2027 fuel duty freeze; the defence plan's gap, which the Budget funded, stays only until the
  priorities retire with it. A measure over before the target year is priced by the year it moves
  ("nothing in 2029-30; raises £0.8bn in 2027-28") rather than as changing nothing. Keeping VAT off
  electricity is re-derived from the Budget's own zero rate, which now runs to July 2027.
  `data/journey/budget2026.json` lists all 98 measures in plain words, joined to the extracted
  scorecard by line and shipped with it, with the published steps of the margin since March and the
  story the analysis page tells; the validator holds every movable measure to a live lever on step 4
  costed from that line, the steps to the forecast the engine reproduces, and the story to
  placeholders the page fills.
- The game plays on the OBR's October 2026 forecast, with the Budget's measures in it: a new vintage
  typed from the Economic and fiscal outlook of 28 October 2026 (`obr-2026-10`), the March 2026
  vintage kept for old links. The forecast is the estimate: the context carries no readings, so
  nothing is suggested and a link's own economic settings are dropped with a note. A vintage now
  names its `policyStart`, the April after its fiscal event, as the first year a measure can take
  effect, in place of the second forecast year. The welfare cap is assessed on the OBR's adjusted
  figure, which the October forecast puts £2.8bn above the cap and margin before any measure; the
  stability rule, now in its rolling form, is still judged against a surplus at a Budget, with the
  0.5% of GDP range reported beside it; and the fiscal-rules promise, the room a broken promise
  leaves and the review's yardstick read the two fiscal rules, not the cap. Every derived lever is
  re-derived on the new series and runs to 2031-32; the macro levers' baselines are October's; the
  reception's words no longer measure from March. Budget day's word budget rises to 470 to hold the
  welfare cap in the rules line.
- The pipeline extracts Budget 2026's Table 6.1 of policy decisions (98 measures, 2026-27 to
  2031-32) to `data/derived/hmt-budget-2026-table-6-1.raw.json` from a registered copy of the
  Treasury's workbook, and the sources registry gains the Budget 2026 document, its policy costings,
  the OBR's October 2026 forecast and the DMO's revised remit. The scorecard extractor now types a
  measure by the last Tax/Spend cell before the years: Table 6.1 puts a fiscal head, often the word
  "Tax", ahead of it.

## 2026-10-01

- Budget day puts the Budget on the leaderboard (ADR-0044): once the leaderboard is open, a field
  under the picture takes a title of up to 60 characters, and one line says what came of posting it,
  with a link to the entry, or why the title was refused, with the field marked and focused. Budget
  day's word budget rises to 460 to hold it.
- The leaderboard opens (ADR-0044): `/leaderboard` lists Budgets by votes or newest, each under its
  player's title with its theme, its headroom and its rules, a vote for or against and a way to
  report the title; `/leaderboard/<id>` is an entry's own page, with the picture, the Budget in
  words and a preview of its own kept out of search engines. The cover has a quiet link to it and
  the footer a second link, and About says what the leaderboard keeps and where to ask for an entry
  to be taken down.
- The leaderboard's server (ADR-0044): `/api/budgets` lists entries by votes or newest, takes a
  finished Budget with a title, and takes a device's vote or report on one; the owner moderates with
  a token. A title is refused for swearing, a link or an @name; reports from three networks hide it;
  one network can post, vote and report only so much; devices and networks are kept only as keyed
  hashes, networks for a month. Without a database the leaderboard says it is closed, and
  `npm run dev` runs it on Postgres in memory. README, "Run the leaderboard", says how to open it.
- Budget day shares the Budget (ADR-0044): its picture, one button that shares the link through the
  device's own sheet or copies it, the picture to save, and each network's own page for posting the
  link. The link opens `/shared`, a page of its own that sets the Budget out in words and invites
  whoever opens it to make their own, or to open it in the game; the server writes the page's
  preview tags, so a network previews the picture. Copying a bare link to Budget day gives way to
  sharing, and what is posted with a link keeps to the Budget's name, its rules and the question.
- `/api/card` draws a finished Budget as a 1200×630 picture, the size the networks preview a link
  at: its theme, its biggest tax and spending changes with what each does, the headroom, the rules
  and the three ratings, every figure worked out again from the link (ADR-0044). Any other link gets
  the game's own picture. `npm run dev` serves it too.
- A small server runs beside the site on Vercel (ADR-0044): `apps/server`, bundled by the build into
  a function that answers `/api/health`. The site itself is served as before.
- The engine reads a finished Budget from its link, in one form on today's codes and estimate, and
  sums it up: its tax and spending changes, biggest first, the headroom, the rules and the three
  ratings, with plain words for a link's preview, a picture's alt text and a post. The web shares
  its settings, its re-run of the engine and the review's headroom sentences. Nothing a player sees
  changes.
- The review says when a measure that does nothing by 2029-30 starts ("nothing until 2030-31, then
  raises £7.8bn"), as the cards do, instead of saying it raises £0.0bn.
- The review's tax and spending lines, and the words for where a lever stands, are written by the
  engine (`changeRows`, `leverStanding`), so the server can say a Budget in the review's own words.
  Nothing a player sees changes.
- The data the game ships is made and checked in the pipeline (`@btc/pipeline/shipped`), with its
  type in the engine, so a server can ship exactly what the browser gets. Nothing a player sees
  changes.
- The methodology's sections on Budget day's readings and the reception no longer describe the
  late-money reading, the public's distributional notes or "Why this rating" (ADR-0043).
- Feedback shows its five households on the page, under their own heading, instead of behind "Who
  feels it". Budget day gets a word budget of its own for them, their words join the plain-words
  checks, and six of their sentences are split at their own clause breaks (ADR-0043).
- Feedback no longer offers "Budget documents": the Red Book's table of your decisions and the notes
  on what the Treasury publishes go, with the table's component and styles (ADR-0043).
- The feedback cards lose "Why this rating": each keeps its rating, its one reason with the
  decisions behind it, and the line for the other side. The markets' growth and debt-interest notes
  and the public's "Who feels these measures" go with it, as do the tally, the nudges, the levers'
  growth flag and the two rules that scored nothing; every rule's note stays in the data as its
  record (ADR-0043).
- Feedback no longer offers "Read the speech": the Budget speech and the Leader of the Opposition's
  reply go, with the speech's data, the engine code that assembled it and the tests that checked its
  figures against the sums (ADR-0043).
- Feedback no longer closes with "How your Budget went": the kind of Budget, which ambitions
  survived, how each promise fared and who paid go, and so does "What the money does and does not
  buy" under the households. The kinds of Budget file and the engine code that chose one go with
  them; the review keeps its own who-paid figures and the thin line (ADR-0043).
- Feedback no longer opens with the Budget in three sentences: the engine's statement and its tests
  go, and the three cards are the page's sections (ADR-0043).
- Feedback's first card is "Labour backbenchers", not "Your backbenchers"; the review's reaction is
  labelled the same way.
- The tax lock now holds only headline rates and allowances: a rise in an income tax rate, a
  National Insurance rate on workers or the main VAT rate breaks it, and so does a cut to the
  personal allowance, the higher-rate threshold or the National Insurance threshold. VAT on anything
  exempt or zero-rated, a higher 5% rate and National Insurance on workers over pension age no
  longer break it and carry no tag; the amber strains are unchanged (ADR-0042).
- The spending screen's description no longer adds whose view shows once you choose: each chosen
  row's line names its speaker, "Director of Public Spending: …", as on the tax screen.
- The spending screen shows every policy, as the tax screen does: "Show only the best ideas" and its
  adviser's shortlist go, so step 4 has no basic mode. Step 3 keeps its best ways and its button
  (ADR-0041).
- No adviser speaks above the cards on either fine-tuning screen. The rows still wear the promises
  they break or strain, and the bar says what is broken or short; the review keeps the Director of
  Public Spending's line on a priority short of delivery (ADR-0040).
- Capital gains tax's untaxed gains are now "Tax leavers" and "Tax leavers and on death". The second
  is the Resolution Foundation's £4bn package, which taxes both, so it is the source's own figure
  and no longer an upper bound for gains at death alone; the first is CenTax's floor for leavers.
  They are still ticks, and ticking one takes the other out, since the package already taxes
  leavers.

## 2026-09-30

- The Permanent Secretary no longer speaks above the fine-tuning cards: their two lines, on a missed
  rule and on every priority funded, go with the two triggers only they used. The bar still says
  whether the rules hold, and the other advisers still speak when a promise is broken or strained or
  a priority falls short.
- The tax screen's description is the user's one sentence: "Raise or cut any tax and keep an eye on
  your headroom." It no longer adds whose view shows once you choose; instead each chosen row's line
  names its speaker, "Director of Tax: …". The spending screen is unchanged.
- The tax screen has no "Show only the best ideas": it shows every tax, in its decisions, in both
  modes, with no shortlist and no mode line. The spending screen and the flagship screens keep their
  shortlists and the button. A screen's shortlist is now optional in the data (ADR-0039).
- The README, the data README and the Methodology page no longer copy the tax screen's numbers of
  decisions, ways, levers and pairs that count the same money, which retiring pension tax relief and
  the stamp duty cuts made wrong; the data is the record.
- Capital gains tax at death and on people who leave the UK are tick boxes, not radios. They still
  count the same money, so ticking one takes the other out and says so first. Whether contradicting
  ticks are radios is now the data's choice: the validator no longer insists on it (ADR-0038).
- Stamp duty's "Cut it for some buyers" is off the tax screen: abolishing stamp duty on main homes
  and taking the additional-homes surcharge back to 3% are shelved like the other retired levers,
  and nothing live names them. Stamp duty keeps its 5% band.
- Pension tax relief is off the tax screen: relief at a flat 30%, relief at the basic rate only and
  the cap on the tax-free lump sum are shelved like the other retired levers, with their costings
  kept for the record, and nothing live names them. The tests that used them take live stand-ins: a
  lower higher-rate threshold for higher earners paying more, capital gains tax's untaxed gains for
  a set of radios beside a tick, and council tax on the top bands in the sampled Budgets.
- The VAT rate's headline reads "20% since 2011. A point is worth about £9.5bn.", like the other
  rates: it was the one headline longer than its description, and it called VAT the biggest single
  lever, which nothing checked. A test now holds every headline shorter than its description.
- Child benefit rates, retired since Phase 5, is shelved like the other retired levers: in the
  Shelved group, with the same headline. A test now checks every retired lever is shelved alike, not
  only that everything shelved is retired.
- `CONTRIBUTING.md` says how to update the engine's sentence snapshots, and to read their diff.
- The two Budget-day adviser briefings are deleted with their file, schema, loader and checks: only
  the workings view showed them. The advisers still speak through the lines on options and policies,
  which the validator checks as before.
- The engine tests trace each lever to its published sources once: one run over every lever, on
  offer or retired, its figures, baseline and milestones alike, with tamper tests showing a changed
  figure is caught. The menu's two re-runs of it, the retired levers' own, and the figures copied
  from a few levers and milestones are gone.
- The engine's generated sentences, from the three-sentence statement, the speech, the close and the
  audiences' reasons, are held in snapshots with their sums masked, so rewording one is
  `npx vitest -u` and a reviewed diff. The tests still check what the words must carry: the band or
  fragment they came from, the priority, promise, rule or group they name and in what order, the
  engine's own figures, and nothing that contradicts the rules result.
- The engine's arithmetic tests run on made-up levers with round numbers, valid against the schema,
  so re-costing a real lever cannot break them: linear, lookup, scheduled and share-of-baseline
  costings, one-off purchases, capital shares, the welfare cap and earliest starts. Each real
  lever's figures are still held to their published sources; the menu's tests keep its own rules
  (which promise a way breaks, which designs count the same money, which must agree) and drop the
  copied figures.
- The engine tests take their Budgets from one module, `packages/engine/test/scenarios.ts`, each
  named for the part it plays (the review's walk, a penny that breaks the tax lock, a big broad tax
  rise, thin headroom, a rule missed) with today's estimate and the typical forecast error beside
  them; a test checks each still plays its part. Retiring a lever now means mending its Budget once.
- The engine tests hold step 4, the shortlists and the badges to rules instead of copies of the
  data: every live policy lever sits on step 4 once, a tax in its family's section, a decision in
  six words and eight levers, the way that improves the public finances first, a direct badge only
  on a published figure as it stands, and nothing still in play naming a retired lever. Tamper tests
  find their levers by role, so moving, re-sizing or retiring one no longer breaks them.
- Undo on a row a chosen flagship holds, which cannot move, no longer leaves focus to jump to that
  row the next time it changes.
- The fine-tuning screens' tests are three files (tax, spending, basic mode) that run side by side,
  and they read their sections, decisions, picks and counts from the data instead of retyping them.
  The web tests run in 24 seconds.
- No web test sleeps for a fixed time: the one waiting to prove the address did not change uses fake
  timers, and the one waiting for it to change waits for exactly that.
- The readability and plain-words tests read one list of what a player meets
  (`apps/web/src/test/onScreen.ts`) instead of keeping two, and check rules rather than copies: no
  pinned count of sets, items, decisions or steps, and no history of past measures in the comments.
- Word budgets are one cap for each kind of screen: 30 words for the cover, 250 for a screen with
  one thing to read or decide, and 450 for a fine-tuning screen (700 with its decisions open). They
  used to be a count for each screen, pinned a tenth above its last measure, so every change of
  words meant a new number.
- The About and Methodology pages load when opened (2 KB and 7 KB gzipped), so the script every
  player loads is 259 KB gzipped. A link that opens on part of one of them still lands there once
  the page is drawn.
- The data is read, checked and validated when the app is built, not in the player's browser, which
  now only parses JSON: no schema library and no validator ship. The build leaves out the retired
  levers and what no screen shows (the published tables behind a costing, quoted passages, source
  hashes and notes, and a description where a headline stands in for it). The script is 1.10 MB (267
  KB gzipped), from 1.45 MB (369 KB); the web tests run in 29 seconds, from about 40.
- `validate:data` also checks the game as shipped: the levers it offers, without the retired ones
  kept for the record. A file that names a retired lever used to pass, then stop the app loading.
- `npm run gate` runs the static checks, the data checks and the unit tests side by side, then the
  build and the end-to-end suite, and prints the output of whatever failed: about 90 seconds where
  running each in turn took over two. CI no longer retries a failed browser test.
- Budget day's reception meters are one picture each, named in words, rather than list items with no
  list, so every screen now passes the end-to-end suite's accessibility checks.
- CI runs five jobs in parallel, each from a clean install: the static checks (lint, format, types),
  the data checks, every Vitest project with the coverage thresholds enforced
  (`npm run test:coverage`), the production build, and the end-to-end suite. The web build no longer
  type-checks first, since the static job does; `npm run gate` type-checks once and, as CI does,
  enforces coverage and runs the end-to-end suite.
- An end-to-end and accessibility suite in `e2e/` (`npm run e2e`: Playwright against the production
  build, on a desktop and a phone) replaces the walk scripts written outside the repository each
  round: the journey by the primary buttons, the fine-tune screen's decisions, and on each main
  screen axe's WCAG 2.1 A and AA rules, 44px targets, no text under 14px and nothing moving when
  less motion is asked for. The priorities are no longer list items outside a list; Budget day's
  reception meters still are, and fail axe's `listitem` rule until the app changes.
- Focus no longer falls to the top of the page when a button removes itself. Undo moves it to the
  control it put back (the box, or the plan on a scale), and dismissing the note about a link moves
  it to the start of the screen.
- A link whose `#` part is not valid percent-encoding opens its page instead of a blank one, and a
  fault while drawing any screen now shows a plain page with a way on rather than nothing.
- The address bar keeps up with the game. A change followed at once by moving to the next screen no
  longer puts the previous screen's address back, and Back no longer leaves an address with the
  budget as it was before the latest changes, which a player could share or reload by mistake.
- The workings view is deleted. Its switch had been withdrawn since ADR-0032, so no player could see
  its sources, provenance drawers, breakdown tables, charts or Budget-day briefings. Seven
  components, about 550 lines of unused styles and the page tests' "workings on" setting went with
  it, so the tests now see what a player sees. The About page still lists every source.
- `validate:data` names the right file when the DWP extract is missing, and reports a missing PESA
  extract instead of passing silently.
- Uprating follows the OBR's receipts in £ million (EFO Table A.5) for every head that has them, not
  shares of GDP rounded to 0.1%, which had put fuel duty's growth to 2029-30 3.4% too high. Seven
  levers' yearly figures were refreshed to match.
- The tax lock counts every VAT rise: raising the reduced rate, or removing any exemption (food,
  home energy, public transport, children's clothes, new homes, books, Motability cars), now breaks
  it, as the main rate and 1% on zero-rated goods already did.
- `CONTRIBUTING.md` sets out how changes are made: small steps, one changelog entry each, docs that
  say things once, decision records that are superseded rather than revised. `npm run gate` runs
  every check CI runs.
- Prettier wraps Markdown at 100 characters, so no document is wrapped by hand; every `.md` file was
  reformatted once.
