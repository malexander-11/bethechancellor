# Contributing

## How changes are made

- **Small steps.** One commit per change, each with one entry in `CHANGELOG.md`. Build the change
  and show it rather than planning it at length; ask only where a choice is genuinely open.
- **Docs say things once.** The README and `docs/methodology.md` describe how the game works now.
  They don't copy counts, measurements or on-screen wording; the data and the app are the record.
- **Decision records are not revised.** `docs/adr` holds decisions that shape the architecture. A
  new record supersedes an old one by reference; the old one stays as it was.
- **Markdown is wrapped by Prettier** (`npm run format`), never by hand.

## Checks

- While working: `npx vitest --changed` runs the tests touched by uncommitted changes, and
  `npm run typecheck` checks types.
- Before pushing: `npm run gate` runs everything CI runs, the independent checks side by side, and
  prints the output of whatever failed. The end-to-end suite needs Chromium
  (`npx playwright install chromium`, once).
- A test that fails is a failure. Nothing retries it, locally or in CI.
