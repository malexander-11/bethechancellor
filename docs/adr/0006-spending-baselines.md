# ADR-0006: Spending baselines from Spending Review 2025 and the OBR, Barnett described not computed

**Status:** accepted, 2026-09-15

## Context

Tax levers rest on published direct costings. Spending has no ready reckoner: the published
material is the Spending Review 2025 settlements (departmental resource DEL excluding
depreciation to 2028-29, capital DEL to 2029-30), the OBR's forecast lines for total DEL and
welfare (EFO Tables 4.1 and 4.6), and Treasury scorecard costings for the Budget 2025 spending
decisions. The OBR forecast runs to 2030-31, two years beyond the departmental plans. Changes to
comparable English spending also change the devolved block grants through the Barnett formula.

## Decision

1. **Departments scale their published settlement.** A department lever is a percentage change
   to its Spending Review resource line, applied from the start year. Eight departments have
   their own lever; everything else in resource DEL (including the devolved block grants and the
   Reserve) is one residual, rebuilt by the validator as the published total less the eight rows.
2. **Beyond the Spending Review, extend pro rata and say so.** For 2029-30 and 2030-31 the
   2028-29 settlement grows with the OBR's total RDEL path. The drawer marks those years as an
   assumption and the lever notes that the OBR reads the same envelope as real cuts to
   unprotected budgets.
3. **Cash percentages, not real growth rates.** Sliders change cash plans in per cent. Real-terms
   figures are quoted from the Spending Review's own average real growth column; no deflator
   arithmetic of our own enters the numbers.
4. **Investment and welfare scale OBR lines.** Total capital DEL and the four welfare lines of
   Table 4.6 are scaled directly. Welfare-cap membership is approximated by line (pensioner
   spending outside, the rest inside) and the approximation is stated on every welfare lever.
5. **Spending-side signs are enforced by the validator.** HMRC "cost" rows and scorecard lines
   are converted with a side-aware rule, so child benefit and the four Budget 2025 spending
   toggles reproduce from the same extracted tables as the tax levers.
6. **Barnett consequentials are commentary.** Comparable departments carry a devolution note with
   their comparability factors from the Statement of Funding Policy (June 2025). No multiplier is
   applied: the size depends on programme-level factors and population shares that change, and a
   hidden knock-on would blur the direct-versus-commentary line the tool is built on.

## Consequences

Department numbers are mechanical arithmetic on published plans and are badged as such, not as
direct costings. The extension beyond 2028-29 is the largest assumption in the spending layer and
is visible in every drawer. Devolved budgets cannot be set by the player except through the
residual, which the residual's description explains. When the Spending Review 2027 allocates
2029-30 onwards, the extension rule becomes unnecessary and the levers rebase by data refresh.
