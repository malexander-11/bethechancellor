# ADR-0004: Uprating ready-reckoner costings to the target year

**Status:** accepted, 2026-09-15

## Context

HMRC's ready reckoner (June 2025) gives three years of effects from an April 2026 start on a
Spring Statement 2025 baseline. The fiscal rules bite in 2029-30 and the forecast runs to
2030-31. HMRC deferred the 2026 edition indefinitely.

## Decision

1. Map ready-reckoner year k to `implementationYear + k − 1`.
2. Scale each figure by the growth of the relevant OBR receipts head between the source year
   and the game year, using the current vintage.
3. Extend beyond the horizon by growing the year-3 figure with the same head.
4. Record every step as a `DerivationStep`; show raw and uprated figures side by side.
5. Non-linear items (CGT, SDLT, allowances) use lookup tables at published points and never
   extrapolate beyond them.

## Consequences

Costings are reproducible and transparent but inherit the vintage gap; a banner states that
HMRC is reviewing its behavioural assumptions.
