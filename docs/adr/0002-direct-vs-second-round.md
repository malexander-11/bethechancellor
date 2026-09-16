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

## Revision, 2026-09-16 (ADR-0011)

The four badges describe facts and arithmetic. Phase 8 added things the tool had never carried:
judgements nobody published, in the voice of a Prime Minister, ministers, a party, a market and an
electorate. Rather than stretch `commentary` to cover them, a fifth badge, **simulated**, marks a
game judgement: it may quote a sourced fact and read an engine number, but it never produces a
number of its own, and the schema forbids it on levers and presets. The list in the decision above
therefore reads: direct costing, mechanical, assumption, second-round commentary, simulated. The
rule that second-round effects never change a number is unchanged; the one place a game judgement
moves the arithmetic is the seeded forecast draw, which only chooses among published figures
(ADR-0012).
