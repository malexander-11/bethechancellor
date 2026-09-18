# ADR-0014: One road through the game

**Status:** accepted, 2026-09-18

## Context

Phase 9 (ADR-0013) made the game a guided seven-step process. Played again, the user named the
fault in one line: too many tabs; it should be a directed journey. On the desk a player saw four
rows of tab-like navigation stacked: the site header (Start, Your Budget, Methodology, About),
the seven-step strip of clickable manila tabs, the desk's three tabs (Taxes, Spending, Policies)
and the folder drawer inside each. Every one was clickable in any order, and nothing gated a step:
a fresh game could type `/budget-day` and read the verdict before choosing an outlook. The game
had a route but no road.

## Decision

1. **One rule for what is open, in the engine.** `enterable(step, game)` in
   `packages/engine/src/game/stages.ts` says whether a stage may be opened given how far the game
   has got: a stage is open once the one before it has been left (`reached` is bumped by the button
   that leaves a stage), going back is always allowed, and Budget day opens from the rabbit,
   because `reached` only becomes `FINAL_STAGE` at the close and `opensEverything` keys on that to
   tell a finished, shared link from a game in play. With no game the desk and Budget day are a
   sandbox and stay open; the stages that tell the story (the PM, the forecast, the sums, the
   rabbit) are not. `furthestStep(game)` names where an early arrival is sent.

2. **A guard on every page.** `useStageGuard(step)` reads the same rule and returns a redirect to
   the furthest open stage, carrying the budget's query string, when a URL is ahead of the game.
   It replaces the ad-hoc `!game` and `!revealed` checks and adds a guard where there was none
   (Budget day, the desk).

3. **A progress rail, not a strip of tabs.** Seven numbered stops on a brass rail. A stop you have
   reached is a quiet link, so you can go back to the desk from the sums; the stop you are at is
   marked with `aria-current="step"` and is not a link; the stops ahead are inert text. The rail
   reads `enterable`, so it never offers a link the guard would bounce, and with no game it offers
   nothing ahead of you at all, although the guard would let a shared link into the desk or Budget
   day: the sandbox has its own door on the appointment letter. At phone width only the numbers
   and the current label show.

4. **The desk is three screens in sequence.** Taxes, then spending, then your colleagues' letters,
   each with one primary button forward and a plain link back, and no lateral tab bar. The folder
   drawer stays: it is an object on the desk (ADR-0009), not navigation. The guide's kicker says
   where you are inside the step ("Step 4 of 7 · File 2 of 3: the spending"), and the forecast and
   the sums say the same for step 5.

5. **A quieter header.** The brand is the way home; the header keeps the two reference pages and
   the workings switch and loses the Start and Your Budget links, which were doors into the middle
   of the road. The appointment letter's sandbox entry becomes a small text link.

## Consequences

- Exactly one obvious next action on every screen; going back allowed; going forward early
  impossible. The beats are unchanged (eight Continues), so the pacing of ADR-0013 holds.
- A `g=` link opened at a later URL than its game has reached now redirects. A finished link
  (`st.6`) still opens Budget day with every beat, and a sandbox `L=` link still opens the desk and
  Budget day; both are tested. Test fixtures that opened the forecast with `st.2` now use `st.3`,
  which is what leaving the desk writes.
- The only tab-like control left on a game page is the folder drawer, which is deliberate.
