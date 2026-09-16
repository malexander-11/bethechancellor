# ADR-0011: The game may judge, and must say so

**Status:** accepted, 2026-09-16

## Context

Phases 1 to 7 carried four badges, and all four describe **facts and arithmetic**: a direct
costing is a published number, a mechanical figure follows from one by stated arithmetic, an
assumption is a setting the player chose, commentary is sourced words about a second-round effect.
Nothing in the tool had an opinion.

Turning the desk into a game about _delivering_ a Budget needs opinions. What the Prime Minister
wants; what a minister says when their budget is cut; how "the markets" read a thin margin; what a
family on universal credit feels; whether a Budget was cautious or reckless. No document publishes
any of that. If those sentences wore the commentary badge they would borrow the authority of the
sourced words beside them, and the first quiet lie in the tool would be a costume.

## Decision

**A fifth badge, `simulated`, for a judgement nobody published.** Its rules:

1. A simulated line may **quote** a sourced fact and may **read** a mechanical number, but it never
   **produces** a number of its own. The Prime Minister may say a flagship costs what the engine
   says it costs; a household may say it is worse off because a lever moved; neither may put a
   figure into the world that the engine or a document did not.
2. It wears its badge **wherever it appears**: on a speech line, a minister's note, a reaction band,
   a household's sentence, the kind of Budget at the close. Badging is per item, never per file, so
   a line cannot inherit honesty from its neighbours.
3. The schema forbids it on **levers and presets**. A costing cannot be simulated; the badge exists
   so that the opposite confusion is impossible too.
4. `commentary` is **not** repurposed. Commentary is sourced words about a second-round effect;
   simulated is a judgement. Conflating them would defeat the point of having either.
5. The sourced fact inside a simulated line keeps its own `SourceLink`. A minister who says the
   asylum system cost £4.0 billion last year cites the National Audit Office in the same breath.

**Roles, not people.** The Prime Minister, the Justice Secretary, the Chief Economic Adviser, MPs
in marginal seats. Their positions come from manifesto text, gov.uk statements and official
statistics, all fetched and registered; no invented words go into a named person's mouth, and the
copy never describes a real minister identifiably. This extends the rule the advisers have carried
since Phase 4.

**The one place a judgement moves a number is the forecast draw** (ADR-0012), and it does so only
by choosing among published figures.

## Consequences

The game can have a Prime Minister, ministers, a party, a market and an electorate without any of
them pretending to be a source. Every one of their sentences is inspectable: the badge says what it
is, the citation says what it leans on. A test forbids the badge on levers; another asserts that
every simulated line quoting a figure carries a source; the close re-runs the engine rather than
guessing. What the tool gives up is the pretence that it has no view. It has views now, about two
hundred of them, and each one is labelled.
