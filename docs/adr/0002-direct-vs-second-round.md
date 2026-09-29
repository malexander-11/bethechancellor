# ADR-0002: Direct costings are numbers; second-round effects are words

**Status:** accepted, 2026-09-15; revised since (below), last by ADR-0032

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

## Revision, 2026-09-18 (ADR-0013)

The sources and derivations are now shown only when a "Show workings" switch is on; off is the
default. This changes how the contract is presented, not the contract: every figure is still the
engine's or a document's, every badge stays on show whatever the switch says, and the sources are
one click away on every page. A page that offered no way to reach a source with the switch on would
break this decision. The reference pages force the switch on, because they are the workings.

## Revision, 2026-09-27 (Phase 23)

The words on the badges were made plainer, for a reading age of ten to twelve: **Official figure**
(`direct`), **Worked out** (`mechanical`), **Assumption**, **Commentary** and **Game judgement**
(`simulated`). The ids in the data, the classes on the page and what each badge means are
unchanged; only the label and its tooltip moved.

## Revision, 2026-09-29 (ADR-0031)

On the briefing, and only there, the badges now wait for the Show workings switch, as the sources
do: the user asked for a page of plain copy. The figures are the same figures, and the words say
which is the OBR's and which is ours ("The OBR's March forecast", "Today's estimate"); with the
switch on, every figure and judgement wears its badge again. Every other screen keeps its badges
whatever the switch says, as the revision of 2026-09-18 set out.

## Revision, 2026-09-29, later (ADR-0032)

The "Show workings" switch is withdrawn for now, at the user's request, with the rest of the
footer's utilities. So no game screen offers its sources, which the revision of 2026-09-18 said
would break this decision. It is a deliberate departure for now, not a change to the contract:
every figure is still the engine's or a document's and badged for what it is on every screen but
the briefing, the About page lists every source, and the code and its tests stay for the switch's
return.
