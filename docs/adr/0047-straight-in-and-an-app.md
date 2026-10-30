# ADR-0047: Straight in, and an app

Date: 2026-10-30. Status: accepted. Supersedes ADR-0045's analysis page as the site's opening, and
ADR-0023's "official paper" revision where it set the look: the serif body, square corners, rules
rather than boxes, and the numerals on a rule as the progress. Supersedes ADR-0046's Treasury figure
on each card. ADR-0023's palette, words and journey stand, as do ADR-0034 (no badges) and ADR-0046's
road, floor and menus.

## Context

With the walk and the balance live (ADR-0046), the user looked at the site and asked:

> It needs much less content and to jump straight in. It should feel more like an app/interactive
> website and less like a blank page.

The site opened on a page of story, a list of themes and a button; every screen after it was a
single column of text between hairlines on warm paper. ADR-0023 had chosen that look over rounded
cards, a sans body and a segmented progress, which an earlier player had read as futuristic. This
user asks for the opposite, and their request decides it.

## Decision

- **Straight in.** Every visit is a game from the first screen: a link without one starts it, with
  the link's measures in it. The site's own address opens the walk's first page; the Budget page and
  its start button go. Above the first theme's cards, a welcome names the Budget and the Chancellor
  and says what to do in one line; what the Budget did waits in one closed fold, every figure the
  engine's or a quoted fact as before. "Start again" starts a fresh game at the same place. The
  first page has no way back, since nothing is behind it.
- **An app's frame.** A white bar with the Budget box drawn beside the name; a soft green-grey
  ground; white cards with rounded corners and a soft shadow for every block of a screen. The body
  is the reader's own sans; Fraunces stays for the headings and the brand. The money stays at the
  top of the screen in a coloured pill, red to find and green to spend, beside the headroom and the
  rules. On the walk and the balance page the way on stays at the foot of the screen, and the page
  keeps room so a focused control never sits under either strip.
- **The progress** is four segments, one a step, each over its numeral: a step behind you full with
  a tick, the step you are on filled as far as its pages have gone, the road ahead empty. The words
  above it and what a screen reader hears are as before.
- **The walk's cards are tiles** in a grid, one to three across by width. Agree and Disagree sit
  side by side with a tick and a cross; an answered card takes the answer's colour, green or red, as
  well as its pressed button. A card shows one figure, what disagreeing does to the player's money,
  worked out by the engine as the bar will say it; the Treasury's figure no longer shows, since two
  numbers for one answer read as a contradiction. What everyone said shows once the player has
  answered, as a poll's result does.
- **The balance page's options are tiles** with a stepper: a minus, the count and a plus, each a
  44px circle named in words for a screen reader. While money is still to find, only the ways to
  find it show; with money to spend, the priorities come first and the ways to find more after.
- **Fewer words.** The line repeating what to do on every theme, the menus' leads and the Treasury's
  figure on each card go; the small print's lead is one sentence; the word budgets come down to just
  above what each kind of screen now says.
- **The shared picture** takes the new ground, card and rule colours, which a test holds to the
  site's tokens.

## Consequences

- No screen sits between a visitor and the first decision. A link's measures are in the game at
  once, so the note promising them goes.
- The look is no longer a set document; it is an app on the reader's device. The accessibility audit
  holds as before: 4.5:1 contrast, 44px targets, 14px text and nothing moving when less motion is
  asked for.
- The Treasury's figure for a measure is still the data's and the engine's starting point, and the
  card's figure is that line with the interest on it; it is no longer printed on the card.
- The web app no longer loads a serif for the body; the shared picture keeps its own fonts.
