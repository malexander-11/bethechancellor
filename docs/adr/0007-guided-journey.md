# ADR-0007: A guided journey with advisers; levels shown, changes costed

**Status:** accepted, 2026-09-15

## Context

The sandbox page put every lever on one screen and expressed settings as changes ("+1p",
"+2%"). Players asked for a walk-through: appointed Chancellor, a Budget to deliver on
28 October 2026, advisers to explain the choices, controls that show where a rate or threshold
ends up, and a verdict at the end. The honesty contract (ADR-0002) must survive the framing:
nothing an adviser says may be invented, and every number must keep its badge.

## Decision

1. **Four steps, one URL.** Start, Assumptions, Taxes and spending (tabs under a scorecard),
   Budget day. The budget lives in the query string on every step; the old `/b` route redirects.
2. **Advisers are roles with sourced scripts.** Five titles, no names. Briefings are authored
   paragraphs, each with sources, validated against the registry; Budget day notes reuse the
   levers' considerations, routed to an adviser by kind. The app never generates prose.
3. **Suggested assumptions follow a stated rule.** Latest reading minus the OBR's March figure,
   rounded to the slider step, or an authored value with its reasoning shown. Both are badged
   assumptions and the OBR's path is one click away.
4. **Levels are display only.** `control.level` describes how to show the level a setting moves
   to; costings, permalinks and tests keep the change. Percentage-of-baseline levers show the
   resulting £bn from their baseline path.
5. **Static relief costs are shown as such.** VAT base-broadening toggles use HMRC's cost-of-relief
   estimates, badged direct because they are official figures, with HMRC's own caveat quoted on
   every toggle and in the methodology.
6. **Abolition uses the forecast line.** Abolishing inheritance tax removes the OBR's receipts
   line; intermediate cuts mirror HMRC's rise-only row and are flagged as an assumption.

## Consequences

The tool reads as a game without becoming fiction: the framing is the player's, the numbers are
the OBR's, HMRC's and the Treasury's, and the advisers only ever quote. Authoring cost rises
(every briefing paragraph needs a source), and the September 2026 readings date the assumptions
step; both are refreshed by editing data files, not code.
