# ADR-0046: Agree or disagree, then balance it

Date: 2026-10-30. Status: accepted. Supersedes ADR-0045's road and its way into the game (the
fine-tuning step, and the analysis page's list of measures with "Change it" and its vote buttons),
and the fine-tuning screens of ADR-0025, ADR-0027, ADR-0035, ADR-0036, ADR-0037, ADR-0038 and
ADR-0040. The levers those records curated stay in the data with their costings; ADR-0042's reading
of the tax lock and the `excludes` interactions between levers stand.

## Context

ADR-0045 started every game from the Chancellor's Budget and let a player change it on the
fine-tuning screens: every tax and every budget, as policies in decisions, tax by tax. The user
asked for something plainer:

> This should be really clear: explain each budget measure. And the user either agrees or disagrees
> with the option. You then go to the end and can spend the money you've saved or you have to raise
> the money you haven't. Group the budget measures thematically to ensure there's not too many
> pages. Then equally, the extra measures should be done in a really simple UI way. e.g. What are
> your priorities - funding NHS, funding defence etc. Then give an option to do that until they run
> out of cash. They shouldn't be allowed to run the headroom any lower.

Asked, the user chose: the fine-tuning screens go entirely; the measures that cannot be reversed sit
on one page at the end of the walk, with a tick or a cross each and a line saying they do not change
the money; a menu choice is a fixed step that can be pressed again; and agreeing or disagreeing is
the public vote, one action.

## Decision

- **The walk.** The Budget file groups the measures a player can reverse into themes, a page each,
  one card a lever. A card's `title` says what the Chancellor did and its `explain` what that means,
  in plain words with no figure. The page adds the Treasury's figure for the card's lines, summed on
  the scorecard's own sign, and the engine's price of disagreeing on the Budget as it stands. Agree
  keeps the measure (the lever at 0, the Chancellor's setting) and Disagree reverses it (the lever
  at 1); pressing the pressed answer again takes it back. The validator holds every reversible
  measure to one card, a lever to at most one card, and a card to at least one measure.
- **The answer is the vote.** Agree is a vote for each measure the card stands for and Disagree a
  vote against; taking the answer back takes the vote back. The browser remembers the answer and
  sends it when voting is open. Disagree reads as pressed from the link, which is the truth for the
  money; Agree from the remembered vote. The analysis page shows no vote buttons: it tells the story
  and lists the themes, each a way into the walk.
- **The small print.** A last page lists every measure no card asks about, with the line the user
  asked for: these were in the Budget too, and none changes the money a player has to play with.
  Each has a tick and a cross, which are votes and move nothing.
- **The money.** What a player has to play with is the headroom against the stability rule in the
  target year less the Chancellor's, interest included, read from the review's own reconciliation
  (`balanceGbpm`), so the bar, the balance page, the review and the server say one figure. The game
  says money to a tenth of a billion, so within half of that either way it balances.
- **The balance page.** `data/journey/balance.json` holds two menus: ways to find money and
  priorities to spend it on, each a lever moved a fixed `step` a press, with a label and a few words
  on what one press does. Short of money, the ways to find it come first; with money to spend, the
  priorities. Each option shows its live price and how many times it has been added, and "Take one
  back" undoes a press. The validator holds each option to a live lever on its own steps, never a
  measure's (its card asks about it), never the economy's and never investment, which the headroom
  counts only by its interest, so it would read as nearly free; a lever is offered once. A test
  holds every option to its side of the money at every press and to breaking no promise; a strain is
  allowed and tagged.
- **The floor.** A Budget may not leave less headroom than the Chancellor's. A priority that would
  take the money short cannot be pressed and says by how much; the balance page's way on and the
  review's Deliver wait while money is still to find; and the leaderboard's server works the money
  out from a posted link and refuses a Budget short of it. Finding more than is needed is allowed:
  money left unspent is headroom.
- **What a link brings.** A link may carry levers neither a card nor a menu offers, from an older
  road or a hand-edited address. They count in the money, and the balance page lists them, each with
  Undo.
- **The road** is `measures`, `balance`, `review` and `budget-day`, numbered from one by the guide.
  A link written on it carries `rd.3`. A link from ADR-0045's road (`rd.2`) opens fine-tuning's
  place on the walk and keeps its review or Budget day; older links go through their own maps first.
  The game's progress moves on when the player leaves the small print, leaves the balance page and
  delivers. The fine-tuning addresses open the first theme.
- **Names.** Each lever carries the plain `name` the fine-tuning screens gave it, which the review
  and the shared picture read it back by. The fine-tuning file, its schemas and its engine module
  go.

## Consequences

- The game offers the measures' reversals and the two menus, and nothing else. The other levers keep
  their costings, sources and tests for old links and the record; a player can no longer reach them
  from a screen.
- Every Budget that is delivered or posted to the leaderboard holds the Chancellor's headroom or
  more. A link can still carry a Budget short of it, from an older road or edited by hand: the
  review will not deliver it until the money is found, and the server will not post it.
- The fine-tuning screens' rules go with them: the scales of levels, the decisions, the radio sets
  of contradicting choices, the tags on each row and the advisers' lines. The promises' tags
  reappear on the menus as strains.
- The word budgets name the walk, the small print and the balance page as kinds of screen of their
  own; the readability test reads the cards, the themes and the menus.
- Methodology §40 says how a card's money line and a menu's price are worked out and what the floor
  checks; the data README records the themes, the cards, the menus and the levers' names.
