# ADR-0043: Feedback is three ratings and five households

Date: 2026-10-01. Status: accepted. Supersedes, for step 6, the Budget in three sentences (ADR-0023,
decision 7), the "Why this rating" disclosure and its nudges (ADR-0013, decision 6; ADR-0018,
decision 4; ADR-0023's revisions of 27 and 28 September; ADR-0026's markets' fold), the close and
the speech (ADR-0013, decision 7; ADR-0023, decision 2; ADR-0026, R3, R19 and R21), and the Budget
documents (ADR-0018, decision 3; ADR-0025).

## Context

Step 6 had grown to the Budget in three sentences, the rules line, three rated audiences each with a
"Why this rating" fold, a close saying which ambitions survived and who paid, and three more folds:
the speech, five households, and the Budget documents with the Red Book's table of decisions. The
user said:

> Remove the "your budget in 3 sentences". Remove the "why this rating". Replace your backbenches
> with Labour backbenches. After the public bit, remove how your budget went, remove priorities,
> promises, and who paid. Remove read the speech. Keep the five households analysis but remove from
> the drop-down and make it default. Remove budget documents.

Asked, the user chose "Labour backbenchers" for the first card, to remove "What the money does and
does not buy" with the priorities, and to let the markets' growth and interest notes and the
public's "Who feels these measures" go with the fold that held them.

## Decision

- Step 6 is the rules line, three cards (Labour backbenchers, the markets, the public), each with
  its rating, its one reason and the line for the other side, and the five households, shown without
  a fold. Then the ways on: copy the link, change something, play again.
- Each removed part goes with everything only it used: its component and styles, the engine code
  that wrote it, the data it read, their schemas and tests. What other screens use stays.
- The audiences' rules, their thresholds and the note on what each leans on stay in the data, the
  written record of each judgement, though no screen lists them. A rule that scores nothing, which
  only the fold could show, goes.

## Consequences

- The card titles are the page's sections, so they are its h2s, with the households beside them.
- Budget day shows more words before any fold than a story screen allows, since the households are
  open: it has a word cap of its own.
- The game no longer writes a speech, an Opposition reply, three sentences or a kind of Budget.
