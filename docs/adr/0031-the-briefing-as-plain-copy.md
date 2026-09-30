# ADR-0031: The briefing as plain copy

Date: 2026-09-29. Status: accepted; revised the same day (below, ADR-0032) and on 2026-09-30
(below). Revises ADR-0030 and ADR-0028, and narrows where the badges of ADR-0002, ADR-0011 and
ADR-0013 show; each carries a dated revision pointing here.

## Context

After the briefing took the user's own words (ADR-0030's revision), the user asked for a plainer
page:

> Get rid of the tags "assumption" etc
> Get rid of the dots under the words that can expand things.
> Replace About the fiscal rules with The debt rule. Then it says "Government debt must be a
> smaller share of the economy in 5 years or end of parliament. Critically, this includes any
> borrowing for investment as well as day-to-day spending.
> Remove what's changed since March and why forecasts move. Remove whats already on your desk.
> Remove show the short briefing.

The briefing then carried a badge on every figure and judgement whatever the workings switch said;
four words that opened a definition when tapped ("rules", "Headroom", "gilts", and "OBR's" in the
first row), each underlined with dots; in advanced mode three folds (the rules in the Charter's
words, what changed since March, why forecasts move); "Already on your desk" under the three parts;
and a line that switched the briefing between a short and a full version.

## Decisions

The request is read as being about the briefing, the page it was written on. The rest of the game
keeps its badges and its tappable words.

### The badges wait for the workings

On the briefing a badge shows only with Show workings on, as the sources already did (ADR-0013).
With the workings off the page reads as plain copy; with them on, every figure and judgement wears
its badge again, beside its sources, exactly as before: the estimate and the last three rows
Assumption, the record, the gilts and the March forecast Official figure, why a margin is kept and
why lenders care Commentary, the buffer Game judgement.

The honesty contract (ADR-0002, ADR-0011) is kept, one switch away rather than on the surface.
Every number is still an official figure or a stated calculation on one, and the words say which
without a badge: "The OBR's March forecast", "Today's estimate", "Since 2010, Chancellors have
kept". Every other screen keeps its badges whatever the switch says.

### No word opens a definition

The briefing's words carry no glossary marks, so nothing on the page is dotted or tappable. A test
reads every template and fails on a glossary mark. The glossary itself is unchanged, and so are the
words that open it elsewhere: the manifesto on the priorities screen, a card's earliest start, and
on step 4 the tax lock, "protected", HMRC's points and Barnett. The test of the toggletip now uses
the priorities' "manifesto".

### The debt rule, one fold away

"About the fiscal rules" becomes "The debt rule", a fold under the rules line, closed on arrival
and on the page in both modes. It says:

> Government debt must be a smaller share of the economy in 2029-30 than the year before.
> Critically, this includes any borrowing for investment as well as day-to-day spending.

The user's second sentence is as written. The first changes "in 5 years or end of parliament" to
the rule as the Charter sets it: debt "falling as a share of the economy by 2029-30, until 2029-30
becomes the third year of the forecast period. Debt should then fall by the third year of the
rolling forecast period" (the Charter for Budget Responsibility, paragraph 3.7). 2029-30 is about
three and a half years after this Budget and about the end of the parliament, not five years; and
once the target rolls it is the forecast's third year. The year is the rule's own target year,
filled from the verdict and never typed, so the line stays true when the October forecast makes
the rule roll. "Than the year before" is the rules file's own plain English for "falling". With
the workings on the fold also quotes the Charter and links it.

The second sentence is why the debt rule matters beside the day-to-day rule: the day-to-day rule
leaves investment out, and debt counts every pound borrowed. The day-to-day rule and the welfare
cap, which the old fold also set out, are named elsewhere: the day-to-day rule in the rules line
above the fold, and either of them by name on the bar and on Budget day when it is missed.

### What went

- **What changed since March.** The calculation's opening line says it in words and its rows say
  it in figures; the gilt yield and prices against what the OBR assumed are that line's sources,
  with the workings on. The three decisions since March stay in the context file, where the
  validator checks their sources, but no screen shows them now, so the readability set that read
  them went (seventeen sets).
- **Why forecasts move.** The Chief Economic Adviser's note, with its figures: the OBR's typical
  error, still shown beside the headroom on Budget day, and the Resolution Foundation's July
  estimate, the only figure typed into the briefing's words, now gone.
- **Already on your desk.** The in-tray stays in the context file, and the review still lists what
  a Budget leaves as it found it ("Still on your desk"). Basic mode's desk rule stays too: the
  levers on the desk are always on show on steps 3 and 4, so the review never points at something
  hidden.
- **The line that switched the briefing.** The briefing is the same in both modes. The footer's
  switch and the button on steps 3 and 4 still swap the shortlist for every idea; the switch's note
  now reads "Shows every policy, not only your advisers' best ideas."

In the code: the briefing's list component went and `inTrayText` and `leftAsIs` stay for the
review; the mode line lost its briefing words; the briefing's words lost their sections on March
and on forecasts, their glossary marks and their one typed figure; and the CSS for the rules' key,
the paragraphs on March and the in-tray's heading went.

## Consequences

### Measured

- **Word budgets**, folds closed and workings off: 175 words, against 232 in either mode before.
  The page is the same in both modes, so it is measured in basic mode alone, pinned at 195.
- **Readability**: the briefing reads at grade 4.6, against 5.1, with no sentence over eighteen
  words; the modes' words, without the briefing's line, at 5.2.
- **On a phone** (360px, from the walk): 1,752px in both modes, 2.2 screens of 780px, against
  2,119px and 2,255px before (2.7 and 2.9 screens). With the workings on, 3,227px (4.1 screens).
- **Tests**: the briefing's page tests cover the three parts and nothing after them; each part's
  words with the workings on (badges and sources) and with them off (plain copy, every figure still
  there, no badge, source or tappable word in any part); the debt rule's fold, closed on arrival,
  its words, and the Charter's with the workings on; and the page reading the same, word for word,
  in both modes. The words file's tests fail on a glossary mark or a typed figure, and pin the debt
  rule's line.
- **The walk** (`walk31.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): clean in both runs. It checks the three headings
  and nothing after them, each line's words with the workings off and no badge or tappable word,
  the debt rule's fold (closed, opening, keeping the focus, closing, and quoting the Charter only
  with the workings on), every badge back with the workings on and gone again with them off, the
  same briefing in both modes and across the footer's switch, and that none of the retired lines is
  anywhere on the road.

### Risks

- **Badges off the surface.** With the workings off a player cannot see which figures are official
  and which are ours. The words say it, and one switch shows the badges. The request could also be
  read as removing the briefing's badges even with the workings on, or every screen's; neither was
  done.
- **The OBR is not spelt out on the briefing.** "OBR's" in the first row no longer opens its full
  name. The glossary still has it, and the speech and the Methodology page spell it out, but a
  first game now meets the letters before the name.
- **Scope.** Only the briefing changed. Step 4's tags, the flagship cards' badges and the words
  that open definitions elsewhere are as they were.
- **The debt rule's line is simpler than the rule.** Debt is measured as net financial liabilities;
  the fold's plain words say "government debt", and the Charter's own words, with the workings on,
  say which measure.

## Revision (2026-09-29, later): no switch for the workings (ADR-0032)

The "Show workings" switch is withdrawn for now, so the briefing shows no badges and no sources at
all: they waited for a switch nothing now offers. Its words still say which figure is the OBR's and
which is ours.

## Revision (2026-09-30): the debt rule in the text, and a softer buffer line

The user asked:

> Integrate the debt rule into the main text.
> Soften text "This means this Budget will likely need to increase the headroom to build in a
> sensible buffer."

**The debt rule is in the running text.** It is no longer a fold: it is its own paragraph in "What
is headroom?", straight after the rules line and before the line on what headroom is, with its name
in bold as a run-in head and the same two sentences:

> **The debt rule.** Government debt must be a smaller share of the economy in 2029-30 than the year
> before. Critically, this includes any borrowing for investment as well as day-to-day spending.

The year is still the rule's own target year, filled from the verdict, and with the workings on the
paragraph still quotes the Charter and links it. The rules line names the debt rule's half of the
test ("have debt falling by then"); the paragraph after it says what falling means and what it
counts. The briefing now has no fold at all.

**The buffer line is softened, in the user's words.** The quoted sentence is read as the new
wording, since it is softer than the line it replaces: "likely", and no figure. "This means this
Budget will need to find around £22bn to build in a sensible buffer" becomes "This means this Budget
will likely need to increase the headroom to build in a sensible buffer." It keeps its badge, Game
judgement, and its source, the OBR's November 2025 outlook, paragraph 1.3, both shown only with the
workings. It still shows only while today's estimate is below the record beside it, so "increase the
headroom" is always true where it appears. It names no figure now, so nothing is filled: the £22bn,
the record less the estimate, is no longer on the page, and ADR-0030's risk that the figure moves
with the data goes with it. Nothing is scored against the line, and nothing asks for a target.

In the code: the briefing's words give the debt rule a `name` in place of a `heading`, and the
buffer line has no placeholder; the page lost its fold and gained the paragraph.

**Measured.** 206 words with the folds closed, against 175, since the rule's 31 words are no longer
folded away; pinned at 230. Grade 4.7, against 4.6. On a phone (360px) the briefing is 1,608px tall
in both modes, 2.1 screens of 780px, against 1,500px (1.9 screens) the day before, after ADR-0032
and ADR-0033 had trimmed the header, footer and progress bar; the paragraph runs to five lines. The
page tests pin the paragraph's words, its bold name, its place after the rules line, the Charter
only with the workings on, and the new buffer line; the words file's test pins the buffer line with
no placeholder. `walk35.mjs` (1300px and 360px, light and reduced motion, with the contrast, size,
family, hit-box, radius and animation audits) is clean in both runs: it checks the paragraph's words
and place, that its name is bold, that no fold is left in the briefing in either mode, the new
buffer line, and that the old one is nowhere on the road.
