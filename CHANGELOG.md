# Changelog

One entry per change, newest first. A decision that shapes the architecture also gets a short record
in `docs/adr`; older records are not revised.

## 2026-09-30

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
