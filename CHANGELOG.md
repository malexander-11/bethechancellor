# Changelog

One entry per change, newest first. A decision that shapes the architecture also gets a short record
in `docs/adr`; older records are not revised.

## 2026-09-30

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
