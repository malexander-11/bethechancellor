# ADR-0003: Units, periodicity and sign conventions

**Status:** accepted, 2026-09-15

## Decision

- Internal unit is £ million as plain numbers. Every `Series` object carries a `unit`
  (`GBPm`, `pctGDP`, `pct`, `index`, `count`) and a `periodicity` (`FY` or `CY`). Helper
  functions refuse to combine series whose unit or periodicity differ.
- £ billion and % of GDP are display formats, computed on the fly, never stored as results.
- Flows use financial-year nominal GDP; stocks use end-March-centred GDP.
- Sign convention in the engine: receipts positive = more revenue; spending positive = more
  spending; PSNB positive = borrowing. Source conventions (HMRC yield, HM Treasury
  "reduces borrowing") are converted at extraction with a recorded `signFlip` step.
- Fiscal years are strings `YYYY-YY`; ordering comes from the vintage's year arrays.

## Consequences

Mixing units or years fails loudly in validation and tests rather than silently in a chart.
