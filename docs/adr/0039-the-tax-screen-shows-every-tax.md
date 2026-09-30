# ADR-0039: The tax screen shows every tax

Date: 2026-09-30. Status: accepted. Supersedes ADR-0028 for step 4's tax screen: it has no shortlist
and no basic mode. The spending screen and step 3 keep theirs.

## Context

ADR-0028 played a first game in basic mode: each step-4 screen showed its adviser's few best ideas,
one card a section, and a button on the screen, "See every idea", showed the whole screen and then
offered "Show only the best ideas" back. On the tax screen that meant two views of the same taxes,
the shortlist and the decisions of ADR-0035, with a switch between them.

The user said, of the tax screen:

> Remove show only the best ideas

## Decision

- The tax screen has no shortlist. Its policies carry no picks and its side of `finetune.json` no
  `shortlistLead`, so it is the same in both modes: every tax, in its decisions, closed until one is
  opened, with no mode line. A player in basic mode meets it as a player in advanced mode does.
- A screen's shortlist is optional in the data. A side with a `shortlistLead` is held to ADR-0028's
  rules (one way a lever, six to ten picks, one in every spending section); a side without one picks
  nothing, and the validator says so when it does.
- The desk rule holds where basic mode trims: a lever on the desk is sure to show on a trimmed
  screen, and on the tax screen everything shows.
- The spending screen and step 3 keep their shortlists, the button and the remembered mode.

## Consequences

- A first game's tax screen is the whole tax screen, and one button fewer.
- The mode a player chooses on the spending screen or step 3 no longer changes the tax screen.
- The word caps for each kind of screen are unchanged; the tax screen is still read in both modes,
  and both readings are now the same.
