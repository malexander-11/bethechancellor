# ADR-0016: A plain, editorial skin

**Status:** accepted, 2026-09-19. Revises ADR-0009.

## Context

ADR-0009 made the game paperwork: a green leather desk, manila folders with clip-path tabs, rubber
stamps that slammed, an oxblood despatch box, sticky notes, press cuttings, a typewriter for every
label and a serif for every document. It gave the game a place and a pace, and it was drawn
entirely in CSS.

Played again after Phase 10, the user's verdict was blunt: _"I don't like the visuals. Should be
much more simple. Designed for easy access for people. Like BBC or FT etc."_

The inventory agreed with them. Of two stylesheets (3,500 lines), about two thirds was decoration.
Thirty-four selectors set uppercase, letter-spaced text between 9px and 13px; fifty declarations
sat under 12.8px; gold text sat on dark green in eight places; body text was a 15.5px serif. Every
one of those choices asked the reader to learn a metaphor before reading a number, and the smallest
of them failed anyone whose eyes are not young.

## Decision

The skin is plain and editorial, in the register of a BBC News or FT article, without copying
either.

- **One page colour, one accent.** An off-white page, white cards with a 1px hairline border and a
  4px radius, a single teal accent for links, buttons, focus and the current step. No shadows, no
  grain, no gradients, no transforms, no clip-paths. A dark theme with the same layout and inverted
  neutrals follows the system preference.
- **One type family.** The reader's own sans-serif at 16px (17px on a wide screen), line height
  1.5. Labels, kickers, tags, badges, sources and the footer are 14px, the floor for everything, in
  sentence case with no letter-spacing. No uppercase, no monospace, no serif.
- **Status is never colour alone.** Every met, missed and above-cap verdict is an icon beside a
  word; every reception label is words beside its bar, with "4 of 5" spelt out; every badge is
  text.
- **Contrast is checked, not eyeballed.** Every text-on-ground pairing in `tokens.css` is at or
  above 4.5:1 in both themes, and the chart series colour is used for marks only, never for words.
- **Motion is a courtesy.** No keyframes; short transitions on colour only; one
  `prefers-reduced-motion: reduce` block that switches everything off.
- **The words that named furniture go; the words that tell the story stay.** "The desk", "the
  file", "the folder", "the despatch box" and "Treasury Chambers" are gone from the interface and
  the data. The letter from the Prime Minister, the colleagues' letters, the OBR's envelope, the
  speech and the morning papers are the story, and they stay.
- **What the skin did for the game is kept by other means.** The stepper shows the road; the
  summary strip keeps the score; the status words and the reception bars show the verdicts; the
  copy keeps the voice.

The lever groups on the package's three screens are a row of underlined tabs that wrap rather than
scroll, with the tablist roles and manual arrow-key activation ADR-0009 chose. Cards that can be
chosen (the four forecasts, the themes, the flagships, the headroom targets) take a 2px accent
border and a tinted wash when picked, with a real 20px control beside the words. Buttons, tabs and
the slider thumb all have a 44px hit area.

## Consequences

- The stylesheets are much the same length (3,684 lines became 3,247 across `tokens.css`,
  `styles.css` and `components.css`; `objects.css` is gone), but every rule now describes layout,
  type or a status colour, and nothing outside `tokens.css` names a colour, so a palette change is
  one file.
- Six tests pinned decorative copy or ARIA ("Treasury Chambers", "The despatch box", "The desk",
  "6 papers", "File 1 of 3", "broken on the desk") and were updated in the same commits as their
  components. The eleven class names tests assert on directly were kept.
- ADR-0009's three rules survive under new names: badges are never status marks, beats
  accumulate, only the date is new.
- Before this was merged, a Playwright audit checked every rendered text node on every step, in
  both themes, for contrast, size, case and family, and every button, tab and slider for a 44px hit
  box; the walk through the journey runs light and dark, phone and desktop, with the workings off
  and on.
- The container this was built in falls back to a wide sans-serif, so anything that fits here fits
  on a reader's own system font.
