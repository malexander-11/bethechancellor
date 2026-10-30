# What’s your Budget?

A web game about the trade-offs facing the UK Chancellor. You choose who pays and what to fund; the
game shows what happens to borrowing, debt and the government's fiscal rules, with every number
traced to an official source.

Formerly _Be the Chancellor_. It was renamed in September 2026 so that it is not mistaken for the
Institute for Fiscal Studies and Nesta tool of that name, which inspired it (ADR-0029).

Status: **a landing page, and a news site's look (ADR-0048)**. The site opens on a landing page: the
Chancellor has delivered the Budget of 28 October 2026, and what would you change? It gives three
numbers, how the game works, and the Budget's own chart of the headroom since March, told from the
OBR's October 2026 forecast and the Treasury's own scorecard (ADR-0045), and one button starts. The
game walks through the Chancellor's measures a theme a page, and the player approves or removes each
one. Removing a measure takes it out of their Budget, which saves money or gives it up. They then
spend what they saved on their priorities, or find what they gave up, a fixed step at a time, and
the headroom may never end below the Chancellor's. Then they deliver the Budget and hear how it
lands. There is no slider anywhere and no forecast to guess: every game plans on the forecast with
the Chancellor's measures in it, and the fiscal rules are the line to meet. There are no tabs and no
hand-off to click through: every screen is a decision with a primary button and a way back, and the
Budget lives in the link, so going back keeps every choice. The identity is Westminster's, set as a
news site's interactive (ADR-0048): Commons green, near-black ink and Budget red on white panels
with hairline borders over a near-white ground, black rules over sections, the reader's own sans
under headlines in Fraunces, and one readable column lined up with the masthead; the money stays at
the top of the screen and the way on at the foot, and the progress is four segments that fill as the
player goes (ADR-0047). The header is the name beside a drawn Budget box, and the footer two quiet
links, to the page about the game and its sources and to the leaderboard (ADR-0033, ADR-0044). The
words are plain (ADR-0024): no sentence a player meets runs past twenty words, and a readability
test holds every set of them at a reading age of about twelve. Every number comes from an official
source or a stated calculation on one, and is one of five kinds (an official figure, worked out, an
assumption, commentary or a game judgement), though no screen labels which (ADR-0034); the About
page lists every source. Every screen names itself, can be reached by keyboard and screen reader,
holds 4.5:1 contrast, keeps every control at 44px and says met or missed in words.

**The landing page**: the headline and the question, the headroom the Budget left, the tax its
measures raise and how many can be changed, how the game works, and the Budget's chart of the
headroom since March with the story in a fold. Every figure is a quoted fact or the engine's own.
**The measures**: a page a theme, a panel for each measure a player can reverse, with a plain
heading saying what the Chancellor did and the Treasury's figure for it; "See more" opens what it
means, what removing it would cost or save on the player's Budget as it stands, and the line of the
Budget's table it comes from. Approve keeps the measure and Remove takes it out, the panel marked in
the answer's colour, and the answer is the player's vote, counted once the leaderboard's database is
connected, with what everyone said shown once the player has answered. A last page lists the rest of
the Budget, the measures that change nothing the player has to play with, each with a tick or a
cross. **Balance your Budget**: the money saved or given up, then, while money is still to find, the
ways to find it, and otherwise a menu of priorities, such as the NHS, schools or defence, each a
tile with a plus and a minus and its price, pressed again until the money runs out. A priority that
would take the headroom below the Chancellor's cannot be pressed, and a choice that strains a
promise says so (ADR-0046). **Deliver the Budget**: the whole Budget read back as changes to the
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
from the think tanks) with milestones from PESA; every lever kept with its costing, though the
screens offer only the measures and the balance page's menus (ADR-0046); and simulated lines in the
voices of roles, every fact in them sourced. The leaderboard and the votes run on a small server
beside the site (ADR-0044, ADR-0045). Next: the rebase to the Spring 2027 forecast.

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
- **The page is plain, and the plainness is honest.** One accent, one self-hosted serif under the
  OFL for the headings, nothing under 14px, every text colour checked for contrast; the only picture
  is the one a Budget is shared as, drawn by the server from its link (ADR-0044). There are no
  badges (ADR-0034); a verdict is always a word and never a colour alone, and the guide's words are
  the only text on screen the engine did not compute.
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
                    the game starts from, the balance page's menus, the Prime Minister's promises,
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
