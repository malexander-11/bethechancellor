# ADR-0040: No adviser above the fine-tuning cards

Date: 2026-10-01. Status: accepted. Supersedes, for step 4, the advisers' interventions of ADR-0022
and the one voice above the cards of ADR-0023 and ADR-0026.

## Context

Since Phase 18 (ADR-0022) an adviser has spoken up when something needed saying; on step 4 that was
one line above the cards, the most pressing that fired (ADR-0023, ADR-0026). By ADR-0026 the lines
were the Political Adviser on a broken, reversed or strained promise and the Director of Public
Spending on a priority short of delivery; the Permanent Secretary's two lines went at the user's
request on 30 September.

Offered the same for what was left, on the spending screen, the user said:

> Do make same changes to spending.

and, asked whether the line should go from the tax screen too, chose both screens.

## Decision

- Neither fine-tuning screen has an adviser speaking above the cards. What the line said is said
  elsewhere: a row wears the promise it breaks or strains, and the bar says how many promises a
  Budget breaks and how many priorities it delivers.
- The engine's interventions module, the screen's component and their tests go. The data keeps the
  Director of Public Spending's two lines on a priority short of delivery, which the review shows
  under that priority, and the schema keeps only those two kinds.

## Consequences

- One element fewer at the top of both screens, and no line that changes as choices are made.
- The Political Adviser's warning that a broken red line floors the public's rating on Budget day is
  no longer said on step 4. The rating still does it, and the row's red tag still names the promise.
