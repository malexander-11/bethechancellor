# ADR-0033: An invitation, then the road, and one link to the rest

Date: 2026-09-29. Status: accepted. Revises ADR-0014, ADR-0023, ADR-0024 and ADR-0032, each of which
carries a dated revision pointing here.

## Context

The user asked for a more inviting cover, calling the game by its former name:

> Update the opening screen of "Be the Chancellor" to make it more inviting and help users enter the
> game. Implement the three changes below, preserving the existing cream-and-green Westminster
> aesthetic, serif typography, headline, supporting copy and "Build my Budget" button.
>
> 1\. Show progress only after the user starts
>
> Remove "STEP 1 OF 6", "Briefing" and the numbered progress tracker from the opening screen. Treat
> this screen as the invitation to play.
>
> Show the progress indicator after the user selects "Build my Budget". It should reflect the actual
> existing journey, with a clear current-stage label and visually distinct completed, current and
> upcoming stages. Keep it compact on mobile and avoid relying on colour alone to communicate
> progress.
>
> 2\. Add a distinctive Budget-box illustration
>
> Introduce a tasteful illustration of the red Chancellor's Budget box as the opening screen's
> visual focal point.
>
> Use a lightweight SVG, an existing suitable asset or a simple CSS illustration. It should feel
> recognisably British and parliamentary, with enough character to make the game inviting. Match the
> current editorial style.
>
> Integrate it into the hero composition so the illustration, headline, supporting text and button
> feel like one coherent invitation. Rebalance the spacing, including the gap left by removing the
> tracker. Keep the primary button prominent and visible within a typical mobile viewport. Avoid
> oversized artwork or decorative animation that delays interaction.
>
> 3\. Simplify the footer
>
> Replace the three competing links, "Methodology", "About & sources" and "Sources and licence",
> with one understated link:
>
> "About the game & sources"
>
> Use this as the entry point to clearly organised information covering the game, methodology,
> sources and licensing. Preserve all existing information and attribution, and ensure it remains
> easy to access.

The cover then carried the running head every screen had: "Step 1 of 6", with "Briefing" beside it
because the cover’s own heading is not the step’s name, over six numerals on a brass rule. Below it
were the heading, the premise and the button, and nothing else since ADR-0032 took its picture away.
Every other screen’s head said "Step N of 6" and named the step only where the page’s heading did
not. The numerals behind you were links in ink, the current one green over a thicker rule, the ones
ahead muted, and the steps’ short names showed only from 900px. The footer was three links in a row.

## Decisions

### The cover is the invitation, not a step

The cover shows no step count, no step name and no road. The road starts on the screen "Build my
Budget" opens, the briefing, which is step 1 of 6 as before; the six steps are unchanged.

### The road, once you have started

- **Named on every screen.** The head always says where you are, "Step 2 of 6 · Set your
  priorities", adding "· 1 of 2" on a step with two screens, whatever the page’s own heading says.
- **Four states, each with its own mark:**
  - done: a tick on the green wash, and a link back; a screen reader hears "(done)";
  - current: the numeral, filled green and a little larger, marked `aria-current="step"`, its short
    name bold on a wide screen;
  - opened ahead: a step the game has reached that you have gone back from, an outlined numeral and
    a link;
  - not yet open: a dashed, muted numeral, inert; a screen reader hears "(not yet open)".
- **Not colour alone.** The tick, the fill, the outline and the dashes differ in shape, and so does
  the rule between the marks: solid where you have been, dashed ahead.
- **Done** means behind the step you are on, or short of the furthest step the game has reached. The
  marks read the same `enterable` rule as the guard on every page, so a mark is a link only where
  the guard would let you through (ADR-0014).
- **Compact on a phone**: the line and one row of six marks, each in a target at least 44px square,
  67px in all at 360px. The steps’ short names show under the marks from 720px rather than 900px,
  83px in all.
- **Square marks**, like the paper’s square corners (ADR-0023’s official paper). The tick is drawn,
  not a character from a font.

### The Budget box

- **The drawing.** The cover’s one picture is the red Budget box, drawn afresh as inline SVG
  (`BudgetBox` in `Motifs.tsx`). It is a flat despatch box in red leather with gilt tooling (a
  double rule and a small lozenge), a low brass handle, a brass lock and brass corners. It is tilted
  as if held up for the cameras, on a disc of Commons green, with three brass flashes round it. It
  carries no cypher, crown or other official mark, and no words.
- **Decoration beside the words.** The heading carries the meaning, so the drawing is hidden from
  screen readers. It does not move, and it costs no request: about 2KB of markup, coloured by six
  new tokens (`--box`, `--box-top`, `--box-side`, `--box-edge`, `--gilt` and `--gilt-light`).
- **One composition.** On a phone the box stands above the heading, the premise and the button, all
  on one centre line, the box 250px wide. From 720px the words take the left half and the box the
  right, up to 440px wide. The cover closes up the space the running head held.
- **Why a picture again.** ADR-0032 took the last drawing off the cover at the user’s request
  ("remove silly image"); this request asks for a tasteful one as the focal point. The new one is a
  despatch box rather than a chest (flat, with a low handle and gilt tooling), set beside the words
  rather than under the button.

### One link in the footer, one page behind it

The footer is one link, "About the game & sources", set small in the secondary ink and underlined.
The About page it opens is now titled "About the game & sources" and sets out what the three links
led to, under a contents list, "On this page":

- **The game**: what you do, in one sentence, and the credit to the Institute for Fiscal Studies and
  Nesta’s _Be the Chancellor_, whose name the game shared;
- **How the numbers work**: the five kinds of number, each badge beside its meaning in the badges’
  own words, a link to the full methodology, and the current baseline;
- **What the game does not do**;
- **Licence and attribution**: MIT for the code, the Open Government Licence for the data,
  commentary cited by link, and no affiliation;
- **Sources**: every source, with the date it was retrieved.

A contents link takes the reader to its part and moves focus there, so the next Tab carries on from
it. The Methodology page keeps its address and every word, and gains a link back to the About page.

Nothing was dropped. One sentence changed: the credit said the game "shows, for every number, which
official document it came from". Since ADR-0032 the game’s screens show no sources, so it now says
every number "can be traced to the official document it came from".

## Consequences

### Measured

- **The cover** fits a phone screen with the button in view: at 390×664 the button ends 471px down,
  and at 360×640 498px down; at 1300×900 it ends 393px down. The box is 250×184px on a phone and
  440×324px at 1300px wide. The cover still reads 19 words, since the drawing has none.
- **The footer** is 49px at every width, against 93px at 360px with three links.
- **On a phone** (360px): the briefing is 1,500px, 1.9 screens of 780px, from 1,549px; basic mode’s
  tax screen at rest is 3,429px, from 3,478px.
- **Tests**: the cover has one drawing, hidden, with no words, and no road or step count. The road
  names its step and marks the steps behind with a tick and "(done)". It tells a done step from one
  opened ahead and one not yet open, and offers nothing ahead with no game. The footer is one link.
  The About page’s title, contents and headings match, everything the three links led to is there,
  the sources table lists every source, and a contents link moves focus. The badges’ meanings are on
  the About page, and the Methodology page links back.
- **The walk** (`walk33.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): clean in both runs. It checks the cover’s drawing,
  that the cover has no road, and that its button is in view at 360×640, 390×664 and 1300×900. On
  every screen after it, the line names the step, the steps behind are ticks, every other mark is
  its numeral and the marks ahead are dashed. It checks the footer’s one link on every screen, and
  the About page: its contents, headings, badges, licence and sources, a contents link landing on
  its part with focus, and the way on to the methodology and back.

### Risks

- **A picture is back on the cover**, one round after one was taken off. This one was asked for, is
  drawn to a stated brief and never holds up the button; if it reads as decoration rather than
  invitation, it is one component to take out.
- **The box is a stylisation.** The real box carries the royal cypher and crest, left off on
  purpose: no official emblems. Without them it could be read as any red case; the colour, the gilt,
  the flashes and the heading beside it carry the reference.
- **The methodology is two links from a screen**, the footer and then the About page, where it was
  one. The About page names the five kinds of number itself, so the badges’ meanings stay one link
  away.
- **Centred on a phone.** The cover’s words are centred under the box on a phone while every other
  screen is set left: the cover is a cover.
- **An opened step ahead is a link.** On the review, Feedback is open, because Budget day opens from
  the review (ADR-0014), so it shows as an outlined numeral and a link. It was a link before, too.
