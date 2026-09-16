# ADR-0012: A seeded forecast inside the published range

**Status:** accepted, 2026-09-16

## Context

The brief asks for a consequential, random-but-seeded OBR forecast that arrives after the player
has built their package, independent of the outlook they planned on, weighted to the centre,
foreshadowed, decomposed into what the economy did and what the OBR made of the player's own
costings, and replayable under the same conditions.

Every one of those properties is achievable with invented numbers, and the tool refuses invented
numbers (ADR-0002). So the question was whether a random forecast can be built out of published
figures alone.

## Decision

**Five named outcomes, each a choice among published candidates; a seed chooses among them.**

- A seed is an integer from 1 to 999, minted when the player confirms their outlook and carried in
  the link. A 32-bit mixer (mulberry32) turns it into one of five outcomes with weights 10, 25, 30,
  25 and 10. The centre is the adviser's own reading, because the OBR conditions its forecast on
  market gilt yields and today's yield is the best published guess at October's.
- Each outcome names a **published candidate** for each macro slider — `obr`, `adviser`, `lowest`
  or `highest` — and the value is derived by the same rounding rule the assumption cards use
  (ADR-0010). The draw decides _which_ published figure arrives, never _what_ the figure is. A test
  asserts every drawn value is a candidate the context file carries.
- **Growth never moves.** No published range reaches the growth slider (the comparison's lowest real
  row would be a £32bn swing with no path behind it), so the fifth outcome is not gloomier growth
  but _the OBR takes a harder line_: the same economy as sticky inflation with the harshest
  re-scoring. The card says so.
- **Re-scoring is keyed to sourced uncertainty, not to badges.** An outcome names consideration ids
  (`static-not-yield`, `cgt-behaviour`, `avoidance-and-emigration`, `already-excluded`,
  `eligibility-savings-shortfall`) and a factor; any lever carrying that consideration is scaled
  after costing, with a `scale` step in its provenance and a "re-scored" tag beside its original
  badge. HMRC rate rows and Treasury scorecard lines carry none of those considerations and are
  never revised; the validator refuses a draw that names a certified caveat. The factors are
  illustrative and badged simulated.
- **The draw knows nothing of the plan.** The outcome is a function of the seed alone. A player who
  planned on the adviser's view and drew the adviser's outcome sees an economy line of nought,
  which is the honest reward for reading the room; one who planned on the optimist pays for it.
- **Decomposition without double counting.** Three engine runs: the plan's macro with measures as
  scored, the draw's macro with measures as scored, the draw's macro with measures revised. Economy
  is the second minus the first, costings the third minus the second, and they sum exactly to the
  move. The economy line includes what dearer money does to the player's own borrowing, because the
  sensitivity covers the baseline stock and the feedback the increment; the label says so.
- **The clue is a note, not a newspaper.** The foreshadowing in stage 3 is the Political Adviser's
  press summary, badged simulated. A fabricated headline under a masthead would imitate a source.
- After the envelope opens, `M=` in the link holds the OBR's draw rather than the player's
  assumption, `g.rv` records that, and the plan survives in `g.pl`. `PERMALINK_VERSION` stays at 1
  because no existing key changes arithmetic.

## Consequences

The forecast can be random, consequential, fair and replayable while every number in it remains a
published figure or a stated transformation of one. The player can be vindicated or punished for
their outlook without the game ever typing a number. What is given up: the draw can only be as
gloomy as the gloomiest published row, and the plan says so rather than pretending the range is
wider than it is.
