# Be the Chancellor

A web game about the trade-offs facing the UK Chancellor. You set tax, spending and economic
assumptions; the game shows what happens to borrowing, debt and the government's fiscal rules,
with every number traced to an official source.

Status: **Phase 20 (the Westminster journey)**. You are appointed Chancellor in a Labour government
with a Budget to deliver on 28 October 2026, and the game walks you through it in seven steps with
one clear action on every screen: become Chancellor; understand your starting position; set your
priorities; build your Budget, one priority at a time and then paying for it; respond to the OBR's
forecast; make your final choices and review the whole Budget; see what it means. No tab is on the
main road and there is no hand-off to click through: every screen is a decision with a primary
button and a way back, and the Budget lives in the link, so going back keeps every choice. The
identity is Westminster's: Commons green, warm paper, charcoal, restrained brass, Budget red for the
one button that delivers, editorial headings in Fraunces, the Budget box on the opening. Every
number still comes from an official source or a stated calculation on one, badged for what it is,
and the sources and breakdowns sit behind a "Show workings" switch, off by default. A first
playthrough's required reading and decisions come to about ten minutes (an estimate from the
rendered screens, not user testing; ADR-0023). Every screen names itself, can be reached by
keyboard and screen reader, holds 4.5:1 contrast in light and dark themes, keeps every control at
44px and says met or missed in words.

Seven steps. **Become Chancellor**: one sentence, the playtime, the button. **Your starting
position**: the Treasury's briefing in three figures (the room March left, borrowing costs against
the OBR's assumption, borrowing so far), the four forecasts you might plan on with the headroom each
leaves, and the margin you want to keep, with the decisions since March and the sliders under "See
the numbers". **Set your priorities**: rank up to three of eight with the Prime Minister, who reacts
to each; the red lines are one fold away; nothing is funded yet. **Build your Budget**: one screen
per priority, the minister who leads on it, its costed options priced against your Budget as it
stands with the headroom each would leave, and a slim bar keeping score; then one screen to pay for
it, the twenty-six ways to raise money in five groups by who pays, each heading counting what its
chosen options raise, the first three of each group on show and the rest a fold away. No two options share a lever, and two that count the same money cannot both
be chosen. Behind them, one link away under "More policies", the desk: every lever wearing the
manifesto red line that watches it, with a minister on every spending line and advisers who
remember what you agreed, and the menu a Chancellor actually weighs: employer National Insurance, pensions, the smaller duties,
capital-tax reliefs, going further on recent rises, capital gains at death, a lower council tax
surcharge band, the bank surcharge, the energy profits levy again, the self-employed rate, VAT off
gas, another compliance package, business rates, the Prime Minister's schemes and defence at 3%
sooner. **Respond to the forecast**: the OBR's forecast,
fixed by a seeded draw the day you chose your starting position, opens on one button into what
changed in two lines (the economy, and what the OBR made of your costings), the headroom before and
after against your target, and the routes through the gap: more of the ways to pay, or what you
chose to deliver started later, narrowed or dropped, a thinner margin, or a breach you sign for.
**Final choices**: up to three little announcements for the speech, then a review of the whole
Budget with a way back to every part, and one red button. **What your Budget means**: the Budget in
three sentences (what you prioritised, who pays, what you accepted), your backbenchers, the markets
and the public each rating it out of five and saying which choices caused it, and a close that says
which ambitions survived, who paid, which compromises mattered and how the package fares under
every forecast you might have drawn; the speech, five households and the Budget documents one fold
away. Share the link; replay the same seed with a fresh Budget. The menu was read against the Budget
reporting again on 21 September 2026: the electricity VAT zero rate that HMRC says ends in March
2027, National Insurance for working pensioners and for LLP partners, and CenTax's package for
taxing gains like income joined it; what has no published costing is named in words instead. On
23 September 2026 the think tanks' own lists were read and nineteen more cards built from their
documents, each a stated figure badged for what it is: a levy on banks' reserves, National
Insurance on rents, a 2% wealth tax, a sugar and salt tax, council tax on the top bands, the NICs
upper earnings limit, 1% VAT on zero-rated goods, a pension lump-sum cap, stamp duty abolished on
main homes, a child tax allowance, and six welfare cards from housing support relinked to rents to
the Centre for Social Justice's benefit reset, on two welfare tabs. Ten of those cards cannot
take effect from April 2027, the wealth taxes among them, and the three think-tank capital gains
cards cannot be collected until 2028-29, so each of the thirteen wears a sourced earliest start
and counts nothing before it.

Under the hood: the OBR March 2026 baseline, 75 tax levers (HMRC ready reckoner, Budget 2025 and
Autumn Budget 2024 scorecards, HMRC cost-of-relief estimates for six VAT base-broadening options
and the residence nil-rate band, HMRC's pension statistics for National Insurance on employer
pension contributions, HMRC's banking-sector receipts, inheritance tax up to abolition, a share of
the OBR's business rates line, HM Treasury's 2021 costing of the health and social care levy,
CenTax's estimates for aligning capital gains with income tax, an exit charge and partnership
National Insurance, HMRC's cost of the National Insurance exemption over pension age and of
private residence relief, HMRC's pension relief by marginal rate for relief at a flat 30% or the
basic rate, HMRC's bank levy receipts, the government's six-month figure for the electricity zero
rate, the think tanks' own figures for their proposals (the Resolution Foundation, IPPR,
CenTax, Tax Justice UK, the IFS Green Budget, Demos, the Adam Smith Institute, Onward), and our
own stated arithmetic where nobody has published a costing, badged as such), 32 spending levers
(Spending Review 2025 settlements, OBR welfare lines, Budget 2025 spending decisions, the Prime
Minister's schemes, six welfare cards from the think tanks) with milestones from PESA, six more levers
kept for the record on no screen, eight priorities with 29 ways to deliver them, 26 ways to afford
them and 8 add-ons (every option a bundle of those levers), four sets of economic assumptions and
five forecast outcomes derived from HM Treasury's comparison of independent forecasts, and about
two hundred simulated lines in the voices of roles, every one badged and every fact in them
sourced. Next: the rebase to
the 28 October 2026 forecast.

## Principles

- **Direct costings are official.** Fiscal effects come from HMRC ready reckoners, HM Treasury
  policy costings and OBR forecast lines. They are shown as numbers, with the source and every
  transformation step visible.
- **Second-round effects are words, not numbers.** Behavioural and macroeconomic knock-on
  effects are described qualitatively with sources. The interface labels every figure as a
  direct costing, a mechanical consequence, an assumption, or commentary.
- **The game may judge, and says so.** What the Prime Minister wants, what a minister says at a
  cut, how a market or a household reads the Budget: these are judgements nobody published, badged
  **simulated** wherever they appear. A simulated line may quote a sourced fact and read an engine
  number; it never produces a number of its own. Roles, not people. The one place a judgement moves
  the arithmetic is the seeded forecast draw, which only chooses among published figures.
- **Where nobody has published a costing, the arithmetic is ours and the workings are on the
  card.** Not everything a Chancellor weighs has a certified costing. Each such lever states its
  method, its published inputs and its assumptions, sits in the same group as the certified rows it
  resembles, is badged an assumption rather than a direct costing, and is reproduced from those
  inputs by a test. Where the base is contested, the card says so before it shows the number; where
  no published figure exists at all, there is no lever.
- **The page is plain, and the plainness is honest.** One accent, one type family, nothing under
  14px, every text colour checked for contrast in both themes; there are no images and no webfonts.
  The badges never become decoration, a verdict is always a word beside an icon and never a colour
  alone, the provenance drawer never loses a table, and the only facts on screen that the engine
  did not compute are the date and the countdown, which carry no badge.
- **Rebasing is a data refresh.** The baseline forecast is a versioned "vintage". When the OBR
  publishes a new forecast (next: Budget, 28 October 2026) the data is regenerated and the app
  re-reads it.

See `docs/methodology.md` for the accounting spine and `docs/adr/` for design decisions.

## Layout

```
apps/web            Vite + React front end (deployed on Vercel)
packages/engine     pure TypeScript fiscal engine, schemas and tests
packages/pipeline   scripts that fetch, extract and validate source data
data/               sourced JSON: vintages, rules, levers, context readings, adviser briefings,
                    the Prime Minister's priorities, the options, ministers, the forecast draws,
                    the speech, households, Budget day reaction bands, raw source files
docs/               methodology and architecture decision records
```

## Develop

```
npm install
npm run dev            # web app
npm test               # engine and web tests
npm run typecheck
npm run lint
npm run validate:data  # Zod validation of everything under data/
npm run check:derived  # regenerates data/derived and fails on drift
npm run build
```

Node 22 or later (see `.nvmrc`). The repository pins `legacy-peer-deps` in `.npmrc` because npm 10's
peer-dependency resolver crashes on Vitest 4's peer set; `npm ci` and Vercel pick the setting up
automatically.

## Data provenance

`data/sources/sources.json` lists every source document. Each series and costing carries a
`source` reference into that registry, and derived numbers carry a `derivation` chain. Data
licensing and attribution are in `DATA-LICENCE.md`.
