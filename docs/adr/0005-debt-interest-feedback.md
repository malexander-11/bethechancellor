# ADR-0005: Debt interest on extra borrowing is modelled, labelled mechanical

**Status:** accepted, 2026-09-15

## Context

Extra borrowing accrues interest. The OBR adds this indirect effect when assessing policy
packages against the rules. Omitting it flatters borrowing-heavy budgets by several
£ billion in the target year. It is arithmetic given a rate assumption, not a behavioural
judgement.

## Decision

- Include the feedback by default, behind a toggle, as its own line labelled "Debt interest
  on extra borrowing (mechanical)".
- Marginal rate: the vintage's 10-year gilt yield assumption (4.5% for March 2026, flagged
  provisional) plus any interest-rate slider setting.
- Half-year convention: interest in year t accrues on last year's extra debt plus half of
  this year's extra borrowing, so ΔB_t = (ΔB^prim_t + r_t·ΔD_{t−1}) / (1 − r_t/2).
- No market reaction to the fiscal stance is modelled; that is a `market` consideration.

## Consequences

The current budget and PSNFL respond to capital spending through interest only, which is
the framework's intent and the game's central lesson.
