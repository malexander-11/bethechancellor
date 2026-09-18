# ADR-0013: Show workings, a fixed manifesto, three audiences

**Status:** accepted, 2026-09-18

## Context

Phase 8 (ADR-0011, ADR-0012) turned the desk into a seven-stage game, and the game was honest.
Played by a newcomer it was also illegible: every screen led with citations, the Prime Minister's
stage carried a negotiation sub-game with political capital, and Budget day was twenty-seven
reaction bands in three columns. A clever geography graduate who does not follow politics could
not tell what they were being asked to do on a screen, or why it mattered.

The brief for Phase 9 named the fix: a rigid seven-step process, explained plainly, with the
sources and breakdowns hidden from view. Two things in that brief needed a decision rather than
a rewrite. Hiding the sources touches the honesty contract (ADR-0002). Judging a Budget out of
five for three audiences is an opinion the tool must hold without inventing a number.

## Decision

1. **A "Show workings" switch, off by default.** Sources, provenance drawers, breakdown tables,
   the expert switches and the ready-made Budgets sit behind one switch in the header, remembered
   in the browser. The badges stay whatever the switch says, because they are the contract, not the
   detail. The two reference pages force it on: they are the workings. A footer line says where the
   sources went. Nothing is removed; every number on screen is still the engine's or a document's,
   and the sources are one click away. The tests run with the switch on so every assertion about a
   source still holds, and the off state has its own tests.

2. **A guide at the head of every screen**, in plain English: which step this is, what you are
   doing, why it matters, what to do now, in at most sixty words, with a glossary of the dozen
   words a newcomer will not know. Guide and glossary are chrome, like the dateline: they carry no
   badge and may quote no figure that is not sourced.

3. **The appointment is step 1.** Three advisers brief the new Chancellor on one screen: the rules
   and why they matter, the economy since March (reading chips from the context file's own
   figures), and the politics, with the manifesto's red lines listed from the PM file the desk
   reads, so they can never drift from what is enforced.

4. **Themes as a list, flagships funded on the spot, the manifesto fixed.** The player ticks every
   theme that applies and then the flagships under each. Ticking a flagship moves its lever and the
   headroom falls while the PM is watching; un-ticking puts the money back. There is no pushing
   back, no concession and no political capital: the red lines are explained on the first screen,
   warned about on the lever they concern, and judged on Budget day. `GamePermalink.theme` became
   `themes[]`; `protectedPromises`, `concessions`, `capital` and `dropped` are gone and their link
   keys `pp`, `cn`, `cp`, `dp` are retired and never reused.

5. **The warning is on the lever.** A lever a red line watches wears a quiet tag naming it; move
   it across and the tag turns red. A flagship promised to the PM wears its promise while funded
   and a red tag once the desk pulls it back.

6. **Three audiences, five steps.** Budget day rates the Budget for the backbenchers ("Is this a
   Labour Budget?"), the markets ("Is the headroom enough? What about growth and the tax burden?")
   and the public ("Did it make a difference to them?"). Each rating is `clamp(3 + Σ points, 1, 5)`
   over authored rules, then held under any fired band's cap. A rule reads one engine figure, picks
   the first authored band the figure does not exceed and contributes the band's points; the
   public's manifesto rule carries a cap of one. Every threshold, point and sentence lives in
   `data/journey/reception.json`, badged simulated; each rule names the published anchor its
   thresholds lean on. The engine compares figures with authored thresholds and picks authored
   sentences. It produces no number of its own, which keeps the rule of ADR-0011.

7. **Budget day is three beats**: the speech, the reaction, the close. The morning-after beat is
   gone; what mattered in it (the credibility of the costings, the financing) survives as reasons.

## The thresholds, and what they lean on

| Audience     | Rule                                                              | Points                                                                  | Anchor                                                                                                                     |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Backbenchers | Public spending against the Spending Review                       | −1 below −£5bn, +1 above +£5bn                                          | about a fifth of March's £23.6bn headroom either way                                                                       |
| Backbenchers | Welfare U-turns of Budget 2025 re-run                             | −1 for one, −2 for more                                                 | the two-child limit, PIP and winter fuel: last November's three fights                                                     |
| Backbenchers | Working-age and pensioner benefits                                | −1 below −£2bn                                                          | felt in benefit rates; smaller moves are absorbed in uprating                                                              |
| Backbenchers | Revenue from the top and business less revenue from everyone else | −1 below −£2bn, +1 above +£2bn                                          | the manifesto's "working people" pledge; incidence tags from `incidence.json`                                              |
| Backbenchers | Manifesto red line crossed                                        | −1                                                                      | the PM file's detectors                                                                                                    |
| Backbenchers | Flagship agreed with the PM pulled back                           | −1                                                                      | the programme set out in public in July and September                                                                      |
| Markets      | Headroom                                                          | −2 and a cap of 2 if the rule is missed; −1 below £10bn; +1 above £20bn | £10bn: "wafer-thin" before Budget 2025 doubled it to £21.7bn; £20bn: the advisers' rule of thumb and about what March left |
| Markets      | Borrowing in the target year against the forecast                 | +1 below −£5bn; −1 above +£10bn                                         | a change in the financing remit the market notices                                                                         |
| Markets      | Tax take as a share of GDP                                        | −1 above +0.5pp                                                         | on top of a tax take the OBR already calls a historic high                                                                 |
| Markets      | Public investment                                                 | −1 below −£2bn                                                          | the framework rewritten in 2024 so investment is not the first thing cut                                                   |
| Markets      | The investment rule                                               | −1 if missed                                                            | the Charter                                                                                                                |
| Markets      | Uncertified share of the improvement                              | −1 above 40%                                                            | beyond that the OBR's re-scoring, not the Budget, sets the number                                                          |
| Markets      | Breach acknowledged                                               | −1                                                                      | the Charter's escape clause is for a shock, not a choice                                                                   |
| Public       | Manifesto promise broken                                          | −2 and a cap of 1                                                       | one is enough                                                                                                              |
| Public       | Themes with a funded flagship                                     | +1 for one, +2 for two or more                                          | a theme counts when a flagship it offered is funded                                                                        |
| Public       | Money behind a single fully funded theme                          | +1 at £5bn or more                                                      | a Budget people can describe in a sentence                                                                                 |
| Public       | Tax rises in the target year                                      | −1 above £5bn, −2 above £20bn                                           | £5bn passes quietly; £20bn is felt by most households                                                                      |
| Public       | Tax cuts in the target year                                       | +1 above £1bn                                                           | the least a cut can be and still be noticed                                                                                |
| Public       | A rabbit that costs money                                         | +1                                                                      | the headline, at the cost of the headroom                                                                                  |

These are judgements. They are written down here, shown in the "Why this rating" disclosure on
every card with the reading that fired them, and badged simulated, so a player can disagree with
them in the open.

## Consequences

- A Phase 8 link still opens. `th.security` decodes as a list of one; `pp`, `cn`, `cp` and `dp`
  decode to nothing, without a warning. A Budget that had negotiated away the tax lock now shows
  it broken, because the manifesto is fixed.
- `data/journey/reactions.json` (about 1,400 lines of sourced copy) is deleted. The best sentences
  and their sources moved into the reception bands in the same commit, so no source was lost.
- The journey asks eight Continues (the PM two, the desk three, the forecast one, Budget day two),
  inside the beat budget of eight to twelve. Every hand-off opens with at most 180 visible words;
  the two one-screen decisions, the outlook and the rabbit, with at most 300, measured with the
  workings off, which is how a newcomer sees them.
- Hiding sources must never become losing them. The badges stay, the footer names the switch, and
  the tests assert that the on state is intact. A page with no way to reach a source once the switch
  is on is a bug.
- The tension the game once drew from promised-but-unfunded flagships now comes from the desk and
  the forecast: the flagships are paid for at once, and the question is what else gives.
