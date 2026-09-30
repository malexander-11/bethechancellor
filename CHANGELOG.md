# Changelog

One entry per change, newest first. A decision that shapes the architecture also gets a short record
in `docs/adr`; older records are not revised.

## 2026-09-30

- The tax lock counts every VAT rise: raising the reduced rate, or removing any exemption (food,
  home energy, public transport, children's clothes, new homes, books, Motability cars), now breaks
  it, as the main rate and 1% on zero-rated goods already did.
- `CONTRIBUTING.md` sets out how changes are made: small steps, one changelog entry each, docs that
  say things once, decision records that are superseded rather than revised. `npm run gate` runs
  every check CI runs.
- Prettier wraps Markdown at 100 characters, so no document is wrapped by hand; every `.md` file was
  reformatted once.
