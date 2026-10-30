# What’s your Budget?

A web game about the trade-offs facing the UK Chancellor. You choose who pays and what to fund; the
game shows what happens to borrowing, debt and the government's fiscal rules, with every number
traced to an official source.

Formerly _Be the Chancellor_. It was renamed in September 2026 so that it is not mistaken for the
Institute for Fiscal Studies and Nesta tool of that name, which inspired it (ADR-0029).

Status: **the Chancellor's Budget (ADR-0045)**. The site opens on what the Budget of 28 October 2026
did, told from the OBR's October 2026 forecast and the Treasury's own scorecard: the story of the
headroom, the measures a player can change in one line each with its figure, the rest in a fold, a
vote for or against every measure, and one button that starts a game from it. The game is three
steps with one clear action on every screen: fine-tune tax and spend, deliver the Budget, feedback.
Every choice is a policy: there is no slider anywhere, and where a size makes sense a choice is a
scale of levels with the plan among them (VAT at 15%, 18%, 19%, 20% as planned, 21%, 22% or 25%; a
department's budget from 5% less to 5% more) (ADR-0027). The Chancellor's measures are levers whose
default is the Chancellor's own setting, so a game starts from the Budget as delivered and the
engine measures every change from it; there is no forecast to guess and no estimate to make, and the
fiscal rules are the line to meet. There are no tabs and no hand-off to click through: every screen
is a decision with a primary button and a way back, and the Budget lives in the link, so going back
keeps every choice. The identity is Westminster's: Commons green, warm paper, charcoal, restrained
brass, Budget red for the one button that delivers, and the page is set like an official paper: a
serif body under editorial headings in Fraunces, hairline rules rather than boxes, small-capital
labels; the header is the name alone and the footer two quiet links, to the page about the game and
its sources and to the leaderboard (ADR-0032, ADR-0033, ADR-0044). The words are plain (ADR-0024):
no sentence a player meets runs past twenty words, and a readability test holds every set of them at
a reading age of about twelve. Every number comes from an official source or a stated calculation on
one, and is one of five kinds (an official figure, worked out, an assumption, commentary or a game
judgement), though no screen labels which (ADR-0034); the About page lists every source. Every
screen names itself, can be reached by keyboard and screen reader, holds 4.5:1 contrast, keeps every
control at 44px and says met or missed in words.

**The Budget.** What the Chancellor did, in the game's plain words: the margin the OBR left in March
(£23.6bn), what dearer borrowing took and other changes gave back, the £12.5bn that left before the
measures, what the measures added and the £14.5bn they left, with both fiscal rules met and the
welfare cap missed by £2.8bn on the OBR's own assessment; then the measures by what each does in
2029-30 (tax rises, tax cuts, less spending, more spending), each with "Change it", and the rest in
a fold. Every figure is a quoted fact or the engine's own. Once the leaderboard's database is
connected, every measure takes a vote for or against, one a device, with the counts shown.
**Fine-tune tax and spend**: two screens on which every lever is a policy, the Chancellor's measures
among them as "This Budget's decisions" beside the tax or budget each belongs to. Tax goes tax by
tax, from income tax to the tax gap, and the decisions about them, closed until you open one
("Change the headline rate" of VAT, "Remove an exemption") (ADR-0035). Spending goes the same way:
sections by what the money is for, each budget one scale with the plan among its levels (from 5%
less to 5% more, or for public investment from 10% less to 20% more). An open decision is one card,
a row for each choice under a short name: a tick, or a scale of levels with the plan among them,
saying what choosing would raise, cost or save; once chosen a row says what it does in 2029-30, and
its adviser speaks, with a minister on every budget you move; everything else about each lever waits
in one fold (ADR-0037). Red and amber manifesto tags sit on the rows they watch, and the bar says
what a Budget breaks; no adviser speaks above the cards (ADR-0040). Two policies that count the same
money cannot both be chosen: where they answer one question they are one choice among radios, and
otherwise choosing one takes the other out and says so first (ADR-0036, ADR-0038). The menu is the
one a Chancellor actually weighs: the Budget's own measures; employer National Insurance, pensions,
the smaller duties, capital-tax reliefs, capital gains on leavers and at death, the bank surcharge,
the energy profits levy again, the self-employed rate up or down, a lower personal allowance, VAT
off gas, business rates and defence at 3% sooner; the think tanks' proposals read from their own
documents (a levy on banks' reserves, a 2% wealth tax, a sugar and salt tax, council tax on the top
bands, the NICs upper earnings limit, 1% VAT on zero-rated goods, a child tax allowance, and welfare
cards from housing support relinked to rents to the Centre for Social Justice's benefit reset), each
wearing a sourced earliest start where it cannot take effect from April 2027; and, kept for the
record on no screen, the taxes the user took off the table and the levers the Budget overtook
(ADR-0035, ADR-0045). **Deliver the Budget**: the whole Budget read back as changes to the
Chancellor's, with a way to change every part, how the headroom got from the Chancellor's to the
bar, the Prime Minister's sign-off when something needs saying, and one red button. **Feedback**:
Labour backbenchers, the markets and the public each rating it out of five, with one reason that
agrees with the rating, the choices that caused it and a line for the other side, and five
households, each saying what the Budget did to it, then the Budget as a picture to share, whose link
opens a page of its own that invites whoever opens it to make theirs, and a place on a leaderboard
under a title of the player's own, where other players vote for or against it (ADR-0043, ADR-0044).

Under the hood: the OBR October 2026 baseline with the Budget's measures in it (the March 2026
baseline kept for old links); the Chancellor's measures as levers costed from Table 6.1 of Budget
2026 and sourced to its policy costings; the other tax levers (HMRC ready reckoner, Budget 2025 and
Autumn Budget 2024 scorecards, HMRC cost-of-relief estimates, HMRC's pension statistics, HMRC's
banking-sector receipts, inheritance tax up to abolition, a share of the OBR's business rates line,
CenTax's estimates, HMRC's cost of the National Insurance exemption over pension age and of private
residence relief, HMRC's bank levy receipts, the Budget's own zero rate on electricity, the think
tanks' own figures for their proposals, and our own stated arithmetic where nobody has published a
costing, recorded as such); the spending levers (Spending Review 2025 settlements, OBR welfare
lines, Budget 2025 and Budget 2026 spending decisions, the Prime Minister's schemes, welfare cards
from the think tanks) with milestones from PESA; more levers kept for the record on no screen; and
simulated lines in the voices of roles, every fact in them sourced. The leaderboard and the votes
run on a small server beside the site (ADR-0044, ADR-0045). Next: the rebase to the Spring 2027
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
  OFL, nothing under 14px, every text colour checked for contrast; the only picture is the one a
  Budget is shared as, drawn by the server from its link (ADR-0044). There are no badges (ADR-0034);
  a verdict is always a word and never a colour alone, and the guide's words are the only text on
  screen the engine did not compute.
- **Rebasing is a data refresh.** The baseline forecast is a versioned "vintage". When the OBR
  publishes a new forecast the data is regenerated and the app re-reads it; the October 2026
  forecast, with the Budget's measures in it, is the baseline now (ADR-0045), and the next is the
  Spring 2027 forecast.

See `docs/methodology.md` for the accounting spine and `docs/adr/` for design decisions.

## Layout

```
apps/web            Vite + React front end (deployed on Vercel)
apps/server         the server beside it, bundled by the build into Vercel functions (api/)
packages/engine     pure TypeScript fiscal engine, schemas and tests
packages/pipeline   scripts that fetch, extract and validate source data, and make and check the
                    data the game ships
data/               sourced JSON: vintages, rules, levers, the context, the advisers, the Budget
                    the game starts from, the fine-tuning policies, the Prime Minister's promises,
                    ministers, households, Budget day reaction bands, raw source files
docs/               methodology and architecture decision records
e2e/                end-to-end and accessibility suite (Playwright, on the production build)
```

## Develop

```
npm install
npm run dev            # web app, with the server's paths
npm test               # every workspace's tests
npm run typecheck
npm run lint
npm run validate:data  # Zod validation of everything under data/
npm run check:derived  # regenerates data/derived and fails on drift
npm run build          # the site, then the server's bundles, each asked to answer
npm run e2e            # the build in Chromium (npx playwright install chromium, once)
npm run card -w @btc/server -- "<a Budget's link>" card.png   # draw its picture
```

Node 22 or later (see `.nvmrc`). The repository pins `legacy-peer-deps` in `.npmrc` because npm 10's
peer-dependency resolver crashes on Vitest 4's peer set; `npm ci` and Vercel pick the setting up
automatically.

## Run the leaderboard

The leaderboard keeps its entries in Postgres. Without a database it says it is not open yet, and
the rest of the game, the picture and the shared page work as before (ADR-0044). To open it on
Vercel:

1. In the project's **Storage** tab, create a **Neon** database in London and connect it to the
   Production environment, so no preview deployment writes to it. That sets `DATABASE_URL`.
2. Under **Settings → Environment Variables**, add `ADMIN_TOKEN` for Production, made with
   `openssl rand -base64 32`. `HASH_SECRET` is optional: without it, devices and networks are hashed
   with a key made from `DATABASE_URL`.
3. Redeploy, then open `/api/health`, which should say `"db":"ok"` and `"admin":true`. The tables
   are made the first time the leaderboard is used.

Moderate with the token:

```
SITE=https://bethechancellor-web.vercel.app
AUTH="Authorization: Bearer $ADMIN_TOKEN"
curl -H "$AUTH" "$SITE/api/admin/budgets?filter=reported"        # or hidden, or all
curl -X POST -H "$AUTH" "$SITE/api/admin/budgets/<id>/hide"       # or show
curl -X DELETE -H "$AUTH" "$SITE/api/admin/budgets/<id>"
```

`npm run dev` and the end-to-end suite run the leaderboard on Postgres in memory (PGlite); set
`ADMIN_TOKEN` in the environment to moderate there too.

## Data provenance

`data/sources/sources.json` lists every source document. Each series and costing carries a `source`
reference into that registry, and derived numbers carry a `derivation` chain. Data licensing and
attribution are in `DATA-LICENCE.md`.
