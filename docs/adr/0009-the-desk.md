# ADR-0009: The game is paperwork

**Status:** accepted, 2026-09-16

## Context

Phases 1 to 5 built a correct thing. Every number traces to a published document, the arithmetic
reproduces from its inputs, and a reader who disagrees with a figure can see exactly which cell to
argue with. Then someone played it and said the user experience was "way off the mark", that it
should "feel more like a game", and suggested "continue buttons and folders on desks".

They were right, and the diagnosis was measurable. The stylesheet had zero transitions, zero
animations, zero keyframes, no images and no textures. Every screen presented its whole contents at
once. Nothing on the page suggested a person sitting somewhere, being handed things, with a
deadline. It was a well-typeset report with sliders in it.

The risk in fixing that is specific and worth naming: **a game skin can make the sourcing look like
set-dressing.** The badges saying "Direct costing" or "Assumption" are the product. If they become
decorative ink alongside rubber stamps and manila folders, the redesign will have cost the project
the only thing that makes it different from a think-tank toy.

## Decision

### 1. The register is Whitehall paperwork, drawn rather than downloaded

Paper on green leather. Documents set in the system serif; labels, datelines, folder tabs and
badges typed in the system monospace and uppercased in CSS. Manila folders with punched holes and
treasury tags. Verdicts land as rubber stamps. Warnings are notes stuck to the file.

No image files and no webfonts. Paper grain is two hairline gratings, folder tabs are `clip-path`
trapezoids, punch holes are radial gradients, a press cutting's torn edge is a polygon. The
JavaScript bundle is unchanged and the stylesheet grew from 21KB to about 31KB. A real typewriter
face would have cost 30 to 60KB per weight and added a network dependency to a project whose whole
pitch is that it can be audited offline.

The colour model is inverted from the old one: the desk is dark and every surface representing
paper resets to dark ink, so a new component inherits the right colour rather than needing to be
told. This is the rule that stops the redesign leaking.

**Uppercase is done in CSS, never in the string.** A stamp still reads "Rule met" to a screen
reader and to a test.

### 2. Steps arrive in beats, and beats accumulate

Each step hands you something before it gives you the working surface. Two beats, not four: three
or more clicks per step turns pacing into a chore.

Beats **accumulate** rather than replace. This is not a stylistic preference. Source links render
inside adviser briefings, provenance drawers, reaction panels and the assumptions table; a
swap-based wizard would make a briefing's citations unreachable the moment you moved past it. Once
a hand-off is behind you it folds to a single line, so its contents stay in the document and one
click away while no longer burying the desk.

**The beat index never touches the URL.** The query string means one thing, a budget, and the
provider rewrites it 150 milliseconds after any change; anything else parked there would vanish
intermittently. A test pins that continuing leaves the query byte-identical.

Progress is per step in `localStorage`. A link carrying a budget opens every beat at once, because
someone sharing their Budget means "look at this", not "sit through the introduction". The Start
page has a switch to turn the ceremony off for good.

### 3. The levers are a drawer of folders, and that costs something

Taxes and spending are a row of manila tabs with one folder open below them. It is a real
`tablist`, not an accordion: with fifty levers an accordion makes a screen-reader user walk past
seven collapsed headers to reach anything, and buries "three changed" in a button label rather than
in tab state. Activation is manual, because auto-activation on arrow keys is only kind when a panel
is cheap and ours re-renders up to nine controls.

The cost is that a closed folder's papers leave the document, so find-in-page no longer reaches
them. The attribution list already names every lever you moved and stays on the desk beside the
folders, which is what you actually want when the question is "what have I changed". The drawer
also opens on the first file you have touched rather than the first in the run, so a shared Budget
does not look untouched.

### 4. The honesty contract is a constraint on the skin, not a casualty of it

Four rules, enforced by review and by tests:

- The four badge strings never change, and badges never become stamps. Stamps are for rule
  verdicts, which are the engine's own output about your Budget.
- The provenance drawer keeps its tables. It is the evidence locker and the highest
  test-coupling surface in the app; it was restyled from CSS and not restructured.
- No number appears that the engine did not compute. The dateline and the countdown to 28 October
  are the only new facts on screen, both derived from the Charter's own next formal assessment
  date, and they carry no badge, because badging chrome would put it in the same vocabulary as a
  costing.
- Six class names are asserted on directly by tests. The rule is **add classes, never rename**.

## Consequences

- The app now has a place and a pace. It also has a preference to switch both off, because a
  second play should not be a corridor.
- Gating hides content. The ceremony switch, the step navigation, the accumulate-don't-replace rule
  and the folded hand-offs are four separate mitigations, and they were all needed.
- Closing a folder removes it from find-in-page. That is a genuine regression against the old
  accordion and it is accepted in exchange for the tablist's keyboard model.
- The stylesheet is split into `tokens.css` and `objects.css` beside the original, because a
  1,656-line file with no surface tokens was most of why this was hard to change.
- One collision cost a build: `.drawer` already belonged to the provenance drawer, so the open
  folder is `.folder-body`. Worth recording, because the symptom was styling that silently did
  nothing rather than an error.
