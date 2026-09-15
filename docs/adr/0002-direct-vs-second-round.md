# ADR-0002: Direct costings are numbers; second-round effects are words

**Status:** accepted, 2026-09-15

## Context

The user wants a realistic tool whose figures come from the OBR, HMRC, HM Treasury and
similar bodies. Behavioural and macroeconomic feedback is real but contested, and any number
we attached to it would be our judgement dressed as an official figure.

## Decision

- Fiscal effects of levers use official direct costings only, with sources and derivation
  steps displayed.
- Second-round effects are recorded as `considerations`: kind, direction, magnitude in words
  and sources. They never change a number.
- Every displayed figure carries one of four badges: direct costing, mechanical, assumption,
  second-round commentary.
- The engine may add mechanical consequences (debt interest on extra borrowing, ratios) but
  no behavioural or macro feedback.

## Consequences

Players see clearly what is official and what is our framing. The tool understates dynamic
effects and says so in a standing footer.
