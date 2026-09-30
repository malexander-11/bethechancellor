# Changelog

One entry per change, newest first. A decision that shapes the architecture also gets a short record
in `docs/adr`; older records are not revised.

## 2026-09-30

- A link whose `#` part is not valid percent-encoding opens its page instead of a blank one, and a
  fault while drawing any screen now shows a plain page with a way on rather than nothing.
- The address bar keeps up with the game. A change followed at once by moving to the next screen no
  longer puts the previous screen's address back, and Back no longer leaves an address with the
  budget as it was before the latest changes, which a player could share or reload by mistake.
- The workings view is deleted. Its switch had been withdrawn since ADR-0032, so no player could see
  its sources, provenance drawers, breakdown tables, charts or Budget-day briefings. Seven
  components, about 550 lines of unused styles and the page tests' "workings on" setting went with
  it, so the tests now see what a player sees. The About page still lists every source.
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
