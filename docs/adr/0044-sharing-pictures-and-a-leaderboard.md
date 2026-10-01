# ADR-0044: Sharing pictures and a leaderboard

Date: 2026-10-01. Status: accepted. Supersedes ADR-0001's "no backend, no authentication and no
database" and its reserved `apps/web/api/`; ADR-0033's single footer link and its bare cover; and,
for step 6, ADR-0043's ways on (copy the link, change something, play again).

## Context

The user asked:

> Add a way to share this on social networks with a graphic that explains their budget - taxes
> changed and spending changes. This is to get other people to play. Also a leaderboard with a
> budget title and allow people to upvote/downvote budgets.

Asked, the user chose Neon Postgres added through Vercel for the leaderboard's storage; titles of up
to 60 characters written freely and shown at once, with a filter for swearing, links and handles and
three reports to hide one until the owner looks; voting with no sign-in, one vote per device; and
links to the leaderboard from the cover, from Budget day and from the footer.

The game was a static single-page app: the Budget lives in the link and nothing is stored. Both
features need a server. A leaderboard needs storage that every player shares, and a link only
unfurls on a social network with the player's own picture if a server writes the page's preview tags
and draws the picture, because the networks do not run the page's code.

The site deploys on Vercel from this repository's default branch, so every push is live.

## Decision

- **Two functions beside the static site.** The site's build and its single-page rewrite stay as
  they were. `api/app.js` and `api/card.js` re-export bundles that `npm run build` writes to
  `apps/server/dist/` after the site's build: esbuild bundles the engine and the server, and the
  data the browser gets is written beside them. Vercel builds framework output before functions
  (`sortBuilders` in its build), so the bundles are there when the functions are packed. The build
  asks each bundle what Vercel will ask it, and fails if it does not answer, so a broken server
  never replaces the live site; a server path that fails at run time breaks only that path.
- **Handlers are the web's own**: a Request in, a Response out, exported as `fetch`, so Vercel calls
  them without its Node helpers; the Vite plugin adapts Node's requests to them for the dev server
  and the preview.
- **Nothing from a player is trusted but the link and the title.** The server reads the link with
  the engine (`readFinishedBudget`) and works out every figure itself, as any link reopens on
  today's data. An entry keeps its link and its title, never figures, so the picture, the list and
  the page cannot disagree.
- **The picture is a pure function of the link**: the theme, the tax and spending changes, the
  headroom, the rules and the three ratings, with an invitation to play. The player's title never
  appears on it, so it can be cached and needs no moderation.
- **A shared link opens a page of its own** (`/shared`), which invites the reader to make their own
  Budget, with its preview tags written by the server. Each leaderboard entry has a page too.
- **Votes** are one per device: a random code the browser keeps once its owner first votes or
  reports, sent only with a vote or a report. The server keeps codes and networks only as keyed
  hashes, limits what one network can do, and forgets the networks after a month.
- **Moderation**: the filter and the limits stop the obvious; reports from three different networks
  hide a title; the owner shows, hides or deletes entries with a secret token. No player's words are
  logged.

## Consequences

- The game has a server and a database. Without the database, the leaderboard says it is not open
  and the rest of the game, the picture and the shared page work as before.
- Every new on-screen word joins the plain-words checks, and Budget day's word cap rises for the
  share and the leaderboard.
- The footer has two links, and the cover a quiet second way in.
- A free-text leaderboard makes the site a service where users can see each other's words. The
  report button, the owner's moderation and a contact on the About page are the start of what that
  asks; the owner should weigh the duties UK law places on such a service.
- After a data change, an entry is read on the new data like any link; its votes stay. The picture's
  address carries the data's code, so the networks fetch it again.
