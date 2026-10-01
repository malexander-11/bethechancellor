# What’s your Budget?

A web game about the trade-offs facing the UK Chancellor. You choose who pays and what to fund; the
game shows what happens to borrowing, debt and the government's fiscal rules, with every number
traced to an official source.

Formerly _Be the Chancellor_. It was renamed in September 2026 so that it is not mistaken for the
Institute for Fiscal Studies and Nesta tool of that name, which inspired it (ADR-0029).

Status: **Phase 28 (the briefing in three parts, as plain copy)**. You are appointed Chancellor in a
Labour government with a Budget to deliver on 28 October 2026, and the game walks you through it in
six steps with one clear action on every screen: your briefing; set your priorities; flagship
policies; fine-tune tax and spend; deliver the Budget; feedback. There is no forecast to guess:
every game plans on one figure, today's estimate of your headroom (£6.8bn in 2029-30: the OBR's
March forecast brought up to date for today's borrowing costs and prices with the OBR's own
sensitivities: an assumption), and the fiscal rules are the line to meet (ADR-0025). Every choice is
a policy: there is no slider anywhere, and where a size makes sense a choice is a scale of levels
with the plan among them (VAT at 15%, 18%, 19%, 20% as planned, 21%, 22% or 25%; a department's
budget from 5% less to 5% more). The desk that held every lever as a slider has gone, with its
ready-made Budgets and its expert switches, and every lever it held is now a policy on step 4
(ADR-0027). A first game is played in basic mode, which suggests only the best ways on step 3: for
each priority its advisers pick one or two, their judgement, held to rules (worth £1bn or more,
counting by 2029-30, on the table, breaking no promise, never two that count the same money). Step 4
shows every policy in both modes (ADR-0041), and the briefing is the same in both (ADR-0031). A
button on each flagship screen shows every way, and anything chosen stays on show in either mode
(ADR-0028; the footer's switch that did the same is withdrawn for now, ADR-0032). Phase 25 reviewed
the game against four goals (that it reflects how a Budget is made, that most voters can follow it,
that it shows the trade-offs, and that its feedback shows a Budget's pros and cons) and fixed what
the review found (ADR-0026): prices corrected, one price for every choice, delivery graded,
audiences that read from before the Budget and see cuts, Budget-day words that say what the sums
say, a briefing that explains its one figure, a plainer step 4, households that notice what reaches
them, the Prime Minister's sign-off and a bar that speaks. There are no tabs and no hand-off to
click through: every screen is a decision with a primary button and a way back, and the Budget lives
in the link, so going back keeps every choice. The identity is Westminster's: Commons green, warm
paper, charcoal, restrained brass, Budget red for the one button that delivers, and the page is set
like an official paper: a serif body under editorial headings in Fraunces, hairline rules rather
than boxes, small-capital labels; the cover is an invitation, the red Budget box beside the premise
and one button, with the steps shown from the screen that button opens (ADR-0033); the header is the
name alone and the footer one link, to the page about the game and its sources (ADR-0032, ADR-0033).
The words are plain (ADR-0024): no sentence a player meets runs past twenty words, and a readability
test holds every set of them at a reading age of about twelve. Every number still comes from an
official source or a stated calculation on one, and is one of five kinds (an official figure, worked
out, an assumption, commentary or a game judgement), though no screen labels which (ADR-0034). The
game's screens show no sources or breakdowns: the "Show workings" view that held them was withdrawn
(ADR-0032) and then deleted, and the About page lists every source. The briefing reads as plain copy
(ADR-0031). ADR-0028 estimated a first playthrough's required reading and decisions from the
rendered screens, not from user testing. Every screen names itself, can be reached by keyboard and
screen reader, holds 4.5:1 contrast, keeps every control at 44px and says met or missed in words.

Six steps. **Briefing**: one sentence and the button; then your briefing in three parts, in the
user's own words and as plain copy (ADR-0030, ADR-0031). Your headroom: you start with £6.8bn of
breathing space in 2029-30, against about £29bn that Chancellors have kept on average since 2010
(the OBR's record), so this Budget will likely need to increase the headroom to build in a sensible
buffer (a judgement). What headroom is: the two rules in one line, the debt rule in full (debt a
smaller share of the economy in 2029-30 than the year before, investment included), the word itself,
and the £246bn of gilts the government plans to sell this year and why lenders care. How it is
calculated: dearer borrowing and dearer prices since March, then the OBR's March £23.6bn, less
£11.3bn for higher interest rates and £5.5bn for higher inflation. The page is the same in both
modes; the Methodology page says how the estimate is made. **Set your priorities**: rank up to three
of eight with the Prime Minister, who reacts to each, and the game writes the theme of the Budget
from the ranking; the promises are one fold away, and one line gives the price of a priority in full
before anything is chosen; nothing is funded yet. **Flagship policies**: one screen per priority,
its costed options, each named for what it does and carrying its adviser's line, with one price (its
change to the headroom, interest included), whether it delivers the priority in full or makes a
start, and a slim bar keeping score; in basic mode, the best one or two ways and any way that deals
with something already on the desk. No two options share a lever, and two that count the same money
cannot both be chosen. **Fine-tune tax and spend**: two screens on which every lever is a policy.
Tax goes tax by tax: eleven taxes, from income tax to the tax gap, and the decisions about them,
closed until you open one ("Change the headline rate" of VAT, "Remove an exemption") (ADR-0035).
Spending goes the same way: four sections by what the money is for and nine decisions, 46 ways to
change it, each budget one scale with the plan among its levels (from 5% less to 5% more, or for
public investment from 10% less to 20% more). An open decision is one card, a row for each choice
under a short name ("Food" under Remove an exemption): a tick, or a scale of levels with the plan
among them, saying what choosing would raise, cost or save ("would raise at most £32.5bn"). Once
chosen a row says what it does in 2029-30, and its adviser speaks, with a minister on every budget
you move; what the rows share is said once at the top of the card, and everything else about each
lever waits in one fold, "More about these" (ADR-0037). Red and amber manifesto tags sit on the rows
they watch, and the bar says what a Budget breaks or leaves short; no adviser speaks above the cards
(ADR-0040). Two policies that count the same money cannot both be chosen: where they answer one
question, like the wealth tax at 1% or 2%, they are one choice among radios, and otherwise choosing
one takes the other out and says so first (ADR-0036, ADR-0038). A lever a chosen flagship already
sets shows once, as a line with a way back to that flagship. Every lever is there, and the menu is
the one a Chancellor actually weighs: employer National Insurance, pensions, the smaller duties,
capital-tax reliefs, going further on recent rises, capital gains on leavers and at death, a lower
council tax surcharge band, the bank surcharge, the energy profits levy again, the self-employed
rate up or down, a lower personal allowance, VAT off gas, another compliance package, business
rates, the Prime Minister's schemes and defence at 3% sooner. **Deliver the Budget**: the whole
Budget read back with a way to change every part, how the headroom got from the estimate to the bar,
the Prime Minister's sign-off when something needs saying, and one red button. **Feedback**: Labour
backbenchers, the markets and the public each rating it out of five, with one reason that agrees
with the rating, the choices that caused it and a line for the other side, and five households, each
saying what the Budget did to it. Share the link. The menu was read against the Budget reporting
again on 21 September 2026: the electricity VAT zero rate that HMRC says ends in March 2027,
National Insurance for working pensioners and for LLP partners, and CenTax's package for taxing
gains like income joined it; what has no published costing is named in words instead. On 23
September 2026 the think tanks' own lists were read and nineteen more cards built from their
documents, each a stated figure from its own document: a levy on banks' reserves, National Insurance
on rents, a 2% wealth tax, a sugar and salt tax, council tax on the top bands, the NICs upper
earnings limit, 1% VAT on zero-rated goods, a pension lump-sum cap, stamp duty abolished on main
homes, a child tax allowance, and six welfare cards from housing support relinked to rents to the
Centre for Social Justice's benefit reset, now in step 4's Benefits group. Ten of those cards cannot
take effect from April 2027, the wealth taxes among them, and the three think-tank capital gains
cards cannot be collected until 2028-29, so each of the thirteen wears a sourced earliest start and
counts nothing before it. On 30 September 2026 the user took nine taxes off the table, among them
the health and social care levy, insurance premium tax, CenTax's package for taxing gains like
income and National Insurance on rents, so eleven cards with an earliest start are left; each
retired tax is kept for the record, and an old link carrying one opens without it (ADR-0035).
Pension tax relief and two stamp duty cuts went the same way later that day: relief at a flat 30%,
relief at the basic rate only and the lump-sum cap; stamp duty abolished on main homes and the
additional-homes surcharge back to 3%.

Under the hood: the OBR March 2026 baseline, the tax levers (HMRC ready reckoner, Budget 2025 and
Autumn Budget 2024 scorecards, HMRC cost-of-relief estimates for six VAT base-broadening options and
the residence nil-rate band, HMRC's pension statistics for National Insurance on employer pension
contributions, HMRC's banking-sector receipts, inheritance tax up to abolition, a share of the OBR's
business rates line, CenTax's estimates for an exit charge and partnership National Insurance,
HMRC's cost of the National Insurance exemption over pension age and of private residence relief,
HMRC's bank levy receipts, the government's six-month figure for the electricity zero rate, the
think tanks' own figures for their proposals (the Resolution Foundation, IPPR, CenTax, Tax Justice
UK, the IFS Green Budget, Demos, the Adam Smith Institute, Onward), and our own stated arithmetic
where nobody has published a costing, recorded as such), 32 spending levers (Spending Review 2025
settlements, OBR welfare lines, Budget 2025 spending decisions, the Prime Minister's schemes, six
welfare cards from the think tanks) with milestones from PESA, more levers kept for the record on no
screen, eight priorities with 29 ways to deliver them (every option a bundle of those levers), all
of those levers on the fine-tuning screens as policies, one estimate of the economy today from the
Bank of England's gilt yields and HM Treasury's comparison of independent forecasts, and simulated
lines in the voices of roles, every fact in them sourced. Next: the rebase to the 28 October 2026
forecast.

## Principles

- **Direct costings are official.** Fiscal effects come from HMRC ready reckoners, HM Treasury
  policy costings and OBR forecast lines. They are shown as numbers, with the source and every
  transformation step visible; for now those are off the game's screens, with the switch that showed
  them withdrawn, and the About page lists every source (ADR-0032).
- **Second-round effects are words, not numbers.** Behavioural and macroeconomic knock-on effects
  are described qualitatively with sources. Every figure is recorded as an official figure, worked
  out, an assumption, or commentary, though since ADR-0034 no screen labels which.
- **The game may judge, and says so.** What the Prime Minister wants, what a minister says at a cut,
  how a market or a household reads the Budget: these are judgements nobody published, marked
  **simulated** in the data and said in a role's voice wherever they appear. A simulated line may
  quote a sourced fact and read an engine number; it never produces a number of its own. Roles, not
  people. No judgement moves the arithmetic: the seeded forecast draw, which only ever chose among
  published figures, retired in Phase 24.
- **Where nobody has published a costing, the arithmetic is ours and the method is on the card.**
  Not everything a Chancellor weighs has a certified costing. Each such lever states its method, its
  published inputs and its assumptions, sits in the same group as the certified rows it resembles,
  is recorded as an assumption rather than a direct costing, and is reproduced from those inputs by
  a test. Where the base is contested, the card says so before it shows the number; where no
  published figure exists at all, there is no lever.
- **The page is plain, and the plainness is honest.** One accent, two self-hosted serifs under the
  OFL, nothing under 14px, every text colour checked for contrast; the one picture, the Budget box
  on the cover, is drawn in the page and says nothing the heading beside it does not. There are no
  badges (ADR-0034); a verdict is always a word and never a colour alone, and the guide's words are
  the only text on screen the engine did not compute.
- **Rebasing is a data refresh.** The baseline forecast is a versioned "vintage". When the OBR
  publishes a new forecast (next: Budget, 28 October 2026) the data is regenerated and the app
  re-reads it.

See `docs/methodology.md` for the accounting spine and `docs/adr/` for design decisions.

## Layout

```
apps/web            Vite + React front end (deployed on Vercel); build/ makes and checks the data
                    it ships
packages/engine     pure TypeScript fiscal engine, schemas and tests
packages/pipeline   scripts that fetch, extract and validate source data
data/               sourced JSON: vintages, rules, levers, context readings, the advisers,
                    the Prime Minister's priorities, the options, the fine-tuning policies,
                    ministers, households, Budget day reaction bands, raw source files
docs/               methodology and architecture decision records
e2e/                end-to-end and accessibility suite (Playwright, on the production build)
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
npm run e2e            # the build in Chromium (npx playwright install chromium, once)
```

Node 22 or later (see `.nvmrc`). The repository pins `legacy-peer-deps` in `.npmrc` because npm 10's
peer-dependency resolver crashes on Vitest 4's peer set; `npm ci` and Vercel pick the setting up
automatically.

## Data provenance

`data/sources/sources.json` lists every source document. Each series and costing carries a `source`
reference into that registry, and derived numbers carry a `derivation` chain. Data licensing and
attribution are in `DATA-LICENCE.md`.
