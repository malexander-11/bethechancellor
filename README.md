# Be the Chancellor

A web game about the trade-offs facing the UK Chancellor. You set tax, spending and economic
assumptions; the game shows what happens to borrowing, debt and the government's fiscal rules,
with every number traced to an official source.

Status: **Phase 12 (the Budget 2026 menu, and no more letters)**. You are appointed Chancellor
in a Labour government with a Budget to deliver on 28 October 2026. The package holds the menu the
reporting says is on the table, each option a published row or a stated calculation on one, badged
for what it is; the third screen of colleagues' letters is gone, its plausible policies sit in the
tax and spending groups and the rest are kept for the record. The page is plain: one accent, one
type family, white cards on an off-white page, nothing smaller than 14px, a dark theme that follows
your system, and a countdown to Budget day. Every screen opens with a guide in plain English: which
step this is, what you are doing, why it matters, what to do now. The road runs one way: a progress
rail of seven stops, a button forward at the foot of every page, a way back but never a way to
jump ahead. The sources and breakdowns sit behind a "Show workings" switch, off by default; the
badges that say what kind of number something is never go away. A first playthrough takes about
ten minutes and seven Continues.

Seven steps. **The appointment**: three advisers brief you on the rules and why they matter, the
economy since March, and a new Prime Minister who wants a Budget people notice while the manifesto
ties your hands. **The outlook**: which forecast do you plan on, and how much headroom do you keep?
**The Prime Minister**: tick the themes this Budget is for, then the flagships under each; every
flagship you tick is funded on the spot and the headroom falls as you choose. **The package**:
two screens in sequence (the taxes, the spending), every lever wearing the manifesto red line that
watches it, with a minister on every spending line and advisers who remember what you agreed, and
the menu a Chancellor actually weighs: employer National Insurance, pensions, the smaller duties,
capital-tax reliefs, going further on recent rises, capital gains at death, a lower council tax
surcharge band, the bank surcharge, the energy profits levy again, the self-employed rate, VAT off
gas, another compliance package, business rates, the Prime Minister's schemes and defence at 3%
sooner. **The forecast**: the OBR's envelope,
fixed by a seeded draw the day you chose your outlook, taken apart into what the economy did and
what the OBR made of your costings, then the routes through the gap it leaves. **The rabbit**:
something for the speech, priced as the headroom it leaves. **Budget day**: the speech built from
your choices; your backbenchers, the markets and the public each rating the Budget out of five and
saying why; and a close that says which ambitions survived, who paid, which compromises mattered,
how the package fares under every forecast you might have drawn, and what kind of Budget it was.
Share the link; replay the same seed with a fresh Budget.

Under the hood: the OBR March 2026 baseline, 52 tax levers (HMRC ready reckoner, Budget 2025 and
Autumn Budget 2024 scorecards, HMRC cost-of-relief estimates for six VAT base-broadening options
and the residence nil-rate band, HMRC's pension statistics for National Insurance on employer
pension contributions, HMRC's banking-sector receipts, inheritance tax up to abolition, a share of
the OBR's business rates line, and our own stated arithmetic where nobody has published a costing,
badged as such), 26 spending levers (Spending Review 2025 settlements, OBR welfare lines, Budget
2025 spending decisions, the Prime Minister's schemes) with milestones from PESA, six more levers
kept for the record on no screen, four sets of economic assumptions and five forecast outcomes
derived from HM Treasury's comparison of independent forecasts, and about two hundred simulated
lines in the voices of roles, every one badged and every fact in them sourced. Next: the rebase to
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
                    the Prime Minister, ministers, the forecast draws, the speech, households,
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
