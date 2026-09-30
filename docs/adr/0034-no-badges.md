# ADR-0034: No badges

Date: 2026-09-30. Status: accepted. Revises ADR-0002, ADR-0011, ADR-0013 and ADR-0031, each of which
carries a dated revision pointing here.

## Context

Every figure and every line in the game is one of five kinds: an official figure, a worked-out
figure, an assumption, commentary or a game judgement (ADR-0002, ADR-0011). Each wore its kind as a
badge, a label in small capitals: "Official figure", "Worked out", "Assumption", "Commentary" or
"Game judgement". The briefing had shown none since ADR-0031, and with the "Show workings" switch
withdrawn (ADR-0032) it never did. Every other screen still wore them: on the flagship cards and
step 4's policies, on every adviser's, minister's and the Prime Minister's line, on the review, on
Budget day's cards, speech and close, and in the provenance drawers. The first flagship screen had a
line saying what they meant.

After the debt rule changes of the same day the user asked:

> Also, remove the badges everywhere.

## Decision

**No screen carries a badge.** "Everywhere" is read as every screen of the game and its two
reference pages, the About page and the Methodology page. The component that drew them,
`LabelBadge`, its styles and its colours are gone, and so is the line on the first flagship screen
that said what they meant.

**The other labels stay.** The red and amber manifesto tags, "Promised to the PM", an earliest
start, "Not on the table", "Protected" and the rest are not badges: they say what choosing something
does, not what kind of number it is. The user's word, and the code's, is "badge" for the five kinds
alone.

**The kinds stay in the data and the words.** Every figure and line still records its kind in the
data (the field keeps its name, `badge`), the validator and the tests still hold each to it, and the
markets' credibility rule still reads which costings are our own arithmetic. Where a badge was the
only thing saying a figure was ours, the words now say so: a provenance drawer's note that the last
settlement is carried forward ends "our assumption". Elsewhere the words already said it:

- an adviser's, a minister's or the Prime Minister's line is in the speaker's voice, under their
  role;
- the speech's strip says every sentence in it is a game judgement;
- our own arithmetic says so where it is explained ("our arithmetic on HMRC's figures", "we apply it
  to the rise in gilt yields alone");
- a size past its source's range says so in its caveat.

The About page gives the five kinds a sentence each ("An official figure is one HMRC, HM Treasury or
the OBR published, shown with its working."), and the Methodology page's table names them in words,
after a line saying the screens do not label them.

## Consequences

### Measured

- **Word budgets**, folds closed and workings off: every screen that wore badges lost their words.
  The priorities read 172 words, against 178; the flagship screens 171, 170 and 153, against 205,
  182 and 165 (the first also lost the line on what the badges meant), and in basic mode 101, 49 and
  102, against 130, 54 and 110; step 4's tax screen 592 and 750, against 615 and 780, and its
  spending screen 554 and 723, against 582 and 763 (in basic mode tax 329 and 471, against 343 and
  492, and spending 403 and 556, against 424 and 589); the review 204, against 213; Budget day 190,
  against 199. Each is re-pinned with a tenth to spare. The briefing showed none with the workings
  off: its count reads 208, against 210, for the same words, because two paragraphs no longer end or
  start with a space.
- **Tests**: the page tests of the briefing, the priorities, the flagship screens, step 4, the
  review and Budget day each fail on a badge, with the workings on as the shared setup has them, and
  the workings test fails on one with them off. The About and Methodology pages' test pins the five
  kinds in words.
- **The walk** (`walk37.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): every screen fails on a badge or a key to them, the
  About page must give the five kinds in sentences and the Methodology page must say why the screens
  carry no labels. It is clean in both runs.

### Risks

- **A player can no longer tell at a glance which figures are official and which are ours.** That
  was ADR-0002's point: the screen was to separate certified costings from our arithmetic visibly.
  The distinction is still true, recorded and tested, but on screen it is now carried only where the
  words carry it, and on the flagship cards and step 4's policies they mostly do not: a card priced
  from HMRC's rows and a card priced from a think tank's static estimate look alike. The About page
  says every figure is one of five kinds, and the workings, when they return, show each one's
  source.
- **Judgements can read as facts.** Budget day's ratings, the kind of Budget and the households are
  the game's judgements. The speech says so, and each rating's reasons say what they read, but
  nothing on the cards says "judgement".
- **Two departures from the contract at once.** With the workings withdrawn (ADR-0032) and the
  badges gone, a player sees neither a figure's source nor its kind. Both are one change away: the
  switch's code and tests are kept, and the data still carries every kind.
