# ADR-0029: What’s your Budget?

Date: 2026-09-29. Status: accepted.

## Context

The game was called Be the Chancellor. That is also the name of the tool that inspired it: the
Institute for Fiscal Studies and Nesta's interactive tool, credited on the About page and listed in
the source registry under that title. Two things with one name leave a reader unsure who made which.
The user asked:

> Let's rebrand this. Help me with the name. I'm thinking what's your budget?

## Decision

The game is called **What’s your Budget?**

- **It is the game's own question.** The cover says "It’s your Budget now.", step 5 is "Deliver the
  Budget" and the one red button says "Deliver my Budget".
- **It is written the way the game writes everything:** sentence case, like every heading; a capital
  B for the fiscal event, as in all the copy; a curly apostrophe.
- **Where it appears:**
  - the header, which is also the way home;
  - every tab title, after the screen's own ("Your briefing · Step 1 of 6 · What’s your Budget?");
  - the page title and description in `index.html`;
  - the About page, whose credit to the IFS and Nesta tool now says the game shared its name until
    September 2026;
  - the README, the methodology and the package descriptions.
- **In running text the name is set in italics**, as a title, so its question mark reads as part of
  the name. Where a line allows, the name comes last.

What does not change:

- **The storage keys** (`btc.workings.v1`, `btc.mode.v1`, `btc.beats.v1`), so a returning player
  keeps both switches.
- **The link format**, so every shared Budget still opens.
- **Identifiers that follow the repository:** the repository `bethechancellor`, the package names
  and the lockfile, the licence line and the pipeline's user agent. Renaming the repository, the
  Vercel project and any domain is for the owner to do; these identifiers follow in one commit when
  that happens.
- **The IFS and Nesta tool's title** in the source registry, which is that tool's own name.

## Consequences

- **A common phrase.** Shops, estate agents and budgeting apps all ask it, so search results will be
  crowded. The capital B helps, and the page description names the Chancellor and the UK's fiscal
  rules. A web search on 29 September 2026 found no game or app with this name. It was not a
  trademark or domain search, which should come before buying a domain.
- **The name no longer says "Chancellor".** The description says "You are the Chancellor", and the
  cover's tab still reads "Become Chancellor".
- **Two stale lines are brought up to date.** The page description and the README's opening line
  offered "economic assumptions", a choice retired in Phase 24 (ADR-0025). Both now say what the
  game asks: who pays and what to fund.
