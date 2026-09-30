# ADR-0032: A plain cover and a flat footer

Date: 2026-09-29. Status: accepted. Revises ADR-0002, ADR-0013, ADR-0023, ADR-0024, ADR-0026,
ADR-0028 and ADR-0031, each of which carries a dated revision pointing here.

## Context

Looking at the cover on a phone, the user asked:

> - move methodology and about & sources to footer only.
> - remove eyebrow heading.
> - remove bullets
> - remove silly image
> - also make the footer much flatter. Remove the option of advanced mode (for now) and for show
>   workings (for now). Just show the about and sources and methodology alongside licensing and
>   sources

The cover then read: a line above the heading with the Budget's date ("The Budget · 28 October
2026"); "It's your Budget now."; the premise; two bullets ("About 9 minutes", "Six steps"); "Build
my Budget"; and a drawing of the red Budget box. The header carried the name and links to the
Methodology and About pages. The footer, under every screen, stacked a line on the figures, the
"Advanced mode" and "Show workings" switches, a hint about the workings, a link to the sources and
licence, and a fold explaining the badges: about a phone screen's third.

## Decisions

### The cover: the premise and the button

The date above the heading, the two bullets and the Budget box went. The cover says "It's your
Budget now.", the premise in one sentence, and "Build my Budget"; the progress line above it still
says "Step 1 of 6". The Budget's date is on the About page, and the playtime estimate stays in the
record (ADR-0028), not on the cover. The box's drawing and its two colours went from the code; the
benches and the papers stay, and the papers still head the briefing's first part.

### The header: the name alone

The header is the game's name, which is the way home, and nothing else.

### The footer: one row of links

The footer is three links: "Methodology", "About & sources" and "Sources and licence". Nothing else:
the line on the figures went (the About page's "What the game does not do" says the same), and so
did both switches, the hint and the badges' key. "Sources and licence" lands on the About page's
licence, which moved above the long table of sources so that the link lands on both; a link to part
of a page now scrolls to that part. On a phone the row fits on one line from about 400px wide and
wraps to two below: 49px against 93px.

### The switches, withdrawn for now

- **Show workings.** No switch offers the workings, so the game's screens show no sources,
  provenance drawers or breakdown tables. The two reference pages, which are the workings, still
  show them: the About page lists every source. The preference moved to a new key
  (`btc.workings.v2`), so that a player who had turned the workings on before cannot keep them on
  with no way to turn them off. The code stays, and the page tests set the key to keep it tested, so
  the switch can come back as it was: it last lived in `apps/web/src/components/Disclaimer.tsx` at
  `05170ed`.
- **Advanced mode.** The footer's switch went. The button on each screen basic mode trims ("See
  every idea", then "Show only the best ideas") stays the way between the modes, remembered in the
  browser as before, since without it a player could never see most of the policies. "Remove the
  option of advanced mode" could also mean removing that button, and with it advanced mode; that was
  not done.

### The badges: plain labels

A badge opened the key at the foot of the page when tapped (ADR-0026). With the key gone, a badge is
a plain label, its meaning in its title for a mouse, and the Methodology page's "Five kinds of
number", one link away in the footer, says what each means. A badge inside a card's label no longer
takes the tap: the tap reaches the card's control.

## Consequences

### Measured

- **Word budgets**: the cover is 19 words, from about thirty, pinned at 25; the words test's floor
  against an empty render drops from 20 to 15.
- **On a phone** (360px, from the walk): the cover is one screen; the briefing is 1,549px, 2.0
  screens of 780px, from 1,752px, since the footer shrank; basic mode's tax screen at rest is
  3,478px, from 3,680px.
- **Readability**: the modes' words, without the switch's, read at grade 3.8.
- **Tests**: the cover says the premise and the button and nothing else; the header has one link;
  the footer three, in order, with nothing else in it and no switch anywhere; a badge is a plain
  label and the Methodology page names all five; the workings are off on the game's screens and
  ignore the old key, on for the reference pages and for the preference the page tests set; the
  modes change by the screen's button, are remembered, leave the workings and the link alone.
- **The walk** (`walk32.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): clean in both runs. It checks the cover's words and
  that it has no picture, the header's one link, the footer's three and nothing else, no switch and
  no source on any game screen, the modes changed by the screens' own buttons, and the footer's
  "Sources and licence" landing on the licence, above the sources.

### Risks

- **Sources off the game's screens.** ADR-0002 held that a page offering no way to its sources with
  the switch on would break the honesty contract. For now no game screen offers its sources; every
  figure is still an official number or a stated calculation, badged for what it is on every screen
  but the briefing, and the About page lists every source. This is a deliberate departure for now,
  at the user's request.
- **Badge meanings on a phone.** A tap no longer opens a badge's meaning. Its words are plain
  ("Official figure", "Assumption") and the Methodology page explains them.
- **The cover no longer gives the date or the playtime.**
- **Two links to one page.** "About & sources" opens the About page at the top, "Sources and
  licence" at its licence.
- **Advanced mode stays one button away** on steps 3 and 4. A player who chose it keeps it until
  they press the button again.

## Revision (2026-09-29, later): a new Budget box, no road on the cover, one link (ADR-0033)

At the user’s next request the cover became an invitation to play: the running head ("Step 1 of 6 ·
Briefing") left it, and a new drawing of the red Budget box came back as its focal point, a flat
despatch box set beside the heading, the premise and the button rather than under them. The cover
still says only the premise and the button. The footer’s three links became one, "About the game &
sources"; the About page sets out what the three led to, with the licence under its own heading and
a contents list in place of the link that landed on it.
