# ADR-0048: A landing page, and a news site's look

Date: 2026-10-30. Status: accepted. Supersedes ADR-0047's opening straight on the measures and its
app look (the coloured cards on a tinted ground, the welcome banner, the tiles in a grid), and its
rule that a card shows only the engine's figure. ADR-0047's game from the first screen, the money
kept in view, the filling progress and the steppers stand, as do ADR-0046's road, floor and menus.

## Context

After ADR-0047 the user looked again and said:

> This is so bad. Imagine someone clicks on the page and doesn't know what they are looking at.
>
> Landing page - John Healey announced his budget. Blah Blah. Give your feedback and the tweaks you
> think he should have delivered.
>
> Page 1 - Cluster of budget measures, see more component explaining in more detail, click to
> approve/remove.
>
> just make the UI nice please. Think "would I launch this on BBC/FT".

Opening on the measures left a visitor with no idea what the site was. The app look read as a
template rather than as journalism.

## Decision

- **A landing page at the site's own address.** A kicker with the Budget's name and date; a headline
  naming the Chancellor and asking what the reader would change; a standfirst saying what the game
  does; one button that starts it. Under them, three numbers (the headroom the Budget left, the tax
  its measures raise by the target year, how many measures can be changed), how the game works in
  three steps, and the Budget's own chart of how the headroom changed since March, as a waterfall
  with its unit and source, with the story in one closed fold. Every figure is a quoted fact or the
  engine's, as before. The landing page is no step and shows no road.
- **A measure, as a news site would set it.** The face shows what the Chancellor did and the
  Treasury's figure for it ("Raises £0.5bn in 2029-30"), the number a reader of the Budget expects.
  "See more" opens what it means in plain words, what removing it does to the player's money with
  the interest, and the line of the Budget's table it comes from. The answers are Approve and
  Remove, the reader's words for keeping and taking out; either is still the vote. An answer marks
  the panel's left edge in its colour as well as filling its button.
- **A quieter look.** A near-white ground and white panels with hairline borders, black rules over a
  section with a small-capital heading, small corners and almost no shadow; Fraunces for headlines
  and big numbers, the reader's own sans for the rest. The steps a player decides on sit in one
  readable column, and the masthead and the footer line up with it. The masthead is white with a
  band of Commons green above it and the Budget box beside the name.
- **The words** on a page of measures fall by about two thirds; the word budgets are lowered to just
  above what each kind of screen now says, and the landing page has its own.

## Consequences

- A visitor knows what they are looking at before they act, and a single button takes them in.
- A card shows two figures with different jobs: the Treasury's on its face, what removing it does to
  the player's money under "See more". The bar at the top always says the second.
- The look matches what readers know from news sites' interactives, not an app's; the accessibility
  audit holds it to 4.5:1 contrast, 44px targets and 14px text as before.
- Methodology §42 says what changed for the numbers; the README describes the landing page and the
  cards.
