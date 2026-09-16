# Be the Chancellor

A web game about the trade-offs facing the UK Chancellor. You set tax, spending and economic
assumptions; the game shows what happens to borrowing, debt and the government's fiscal rules,
with every number traced to an official source.

Status: **Phase 7 (four forecasts)**. You are appointed Chancellor with a Budget to deliver on
28 October 2026, and the whole thing happens on a desk. Paper on green leather, manila folders
with treasury tags, rubber-stamped verdicts, a countdown to Budget day. Each step hands you
something before it gives you the working surface: read it, then continue.

Step 1 is a single choice: which forecast do you budget on? Keep the OBR's March baseline, take
your Chief Economic Adviser's reading of today's markets, or take the most optimistic or the most
pessimistic view any of the sixteen forecasters in the Treasury's comparison publishes. Each card
shows the headroom it leaves you with, which is how you find out that a Chancellor can buy
headroom by picking a forecast. Step 2 is a drawer of files, one open at a time, where
every control shows the level it moves to and departmental budgets show real growth a year against
their own history. Step 3 is the eleven policies your colleagues in Parliament are campaigning for,
each costed with its workings on the card. Step 4 is Budget day, read back as feedback from four
audiences: your own rules, the markets, Parliament and the public.

Under the hood: the OBR March 2026 baseline, 31 tax levers (HMRC ready reckoner, Budget 2025 and
Autumn Budget 2024 scorecards, HMRC cost-of-relief estimates for six VAT base-broadening options,
inheritance tax up to abolition), 19 spending levers (Spending Review 2025 settlements, OBR welfare
lines, Budget 2025 spending decisions) with milestones from PESA, 11 campaign policies costed from
published statistics by a stated method, four sets of economic assumptions derived from HM
Treasury's comparison of independent forecasts, and five adviser roles whose every sentence cites
a public document. Next: the rebase to the 28 October 2026 forecast.

## Principles

- **Direct costings are official.** Fiscal effects come from HMRC ready reckoners, HM Treasury
  policy costings and OBR forecast lines. They are shown as numbers, with the source and every
  transformation step visible.
- **Second-round effects are words, not numbers.** Behavioural and macroeconomic knock-on
  effects are described qualitatively with sources. The interface labels every figure as a
  direct costing, a mechanical consequence, an assumption, or commentary.
- **Where nobody has published a costing, the arithmetic is ours and the workings are on the
  card.** The eleven policies MPs campaign for have no certified costing. Each states its method,
  its published inputs and its assumptions, is badged an assumption rather than a direct costing,
  and is reproduced from those inputs by a test. Where the base is contested, the card says so
  before it shows the number.
- **The game is paperwork, and the paperwork is honest.** The desk, the folders and the stamps are
  drawn in CSS and inline SVG; there are no images and no webfonts. The badges never become
  decoration, the provenance drawer never loses a table, and the only facts on screen that the
  engine did not compute are the date and the countdown, which carry no badge.
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
                    Budget day reaction bands, raw source files
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
