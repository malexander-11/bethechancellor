# Be the Chancellor

A web game about the trade-offs facing the UK Chancellor. You set tax, spending and economic
assumptions; the game shows what happens to borrowing, debt and the government's fiscal rules,
with every number traced to an official source.

Status: **Phase 1 (foundations)**. The fiscal rules, the OBR March 2026 baseline, the
calculation engine and the verdict screen exist; the only levers so far are the three economic
assumption sliders (interest rates, growth, inflation). Tax levers come in Phase 2 and spending
levers in Phase 3.

## Principles

- **Direct costings are official.** Fiscal effects come from HMRC ready reckoners, HM Treasury
  policy costings and OBR forecast lines. They are shown as numbers, with the source and every
  transformation step visible.
- **Second-round effects are words, not numbers.** Behavioural and macroeconomic knock-on
  effects are described qualitatively with sources. The interface labels every figure as a
  direct costing, a mechanical consequence, an assumption, or commentary.
- **Rebasing is a data refresh.** The baseline forecast is a versioned "vintage". When the OBR
  publishes a new forecast (next: Budget, 28 October 2026) the data is regenerated and the app
  re-reads it.

See `docs/methodology.md` for the accounting spine and `docs/adr/` for design decisions.

## Layout

```
apps/web            Vite + React front end (deployed on Vercel)
packages/engine     pure TypeScript fiscal engine, schemas and tests
packages/pipeline   scripts that fetch, extract and validate source data
data/               sourced JSON: vintages, rules, levers, references, raw source files
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
