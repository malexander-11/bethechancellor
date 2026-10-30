# ADR-0049: The small print grouped, and budgets to cut

Date: 2026-10-30. Status: accepted. Supersedes ADR-0046's small print page, which listed every
measure no card asks about, and its balance page's two one-way menus of priorities and ways to find
money, where the department and benefit lines could only be added to. ADR-0046's road, floor and
cards stand, as does ADR-0048's look.

## Context

After the landing page and the news site's look (ADR-0048), the user asked:

> Remove the least relevant budget options and where possible cluster them. Try and get that last
> set down to 20.
>
> At the end, you should be able to cut budgets (welfare, foreign aid, military, etc to save money
> too)

and, while that was being done:

> Also, the minor measures should also have a little explanation if users need it

"That last set" is the walk's last page, which listed every measure no card asks about, one row
each. "The end" is the balance page, where a department or a benefit could be added to as a priority
but never cut.

## Decision

- **The last page is groups.** The Budget file gains `rest`, at most twenty rows, each a plain
  heading over the measures it stands for: help with bills this winter, defence and Ukraine, more
  money and powers for mayors, and so on. The least relevant lines, small technical changes a reader
  would not look for, are in no row; they stay in the file, because the scorecard check needs every
  line of the Treasury's table once. A tick or a cross on a row is a vote on each of its measures.
- **Each row has "See more"**, as a card does: each measure's own plain line, and the lines of the
  Budget's table they come from.
- **Budgets to cut.** The menus' file gains `budgets`: the departments' lines (the NHS, schools,
  defence, police, prisons, councils, transport, foreign aid and the rest) and the benefits' lines
  (universal credit, disability, pensioner and other benefits). Each is one row with a minus that
  cuts it a step and a plus that adds a step, where it stands between them and what a step is worth.
  A cut saves money and an addition spends it; an addition the money cannot pay for cannot be
  pressed, as before. The rows are grouped as departments and benefits. A cut that tests a promise's
  spirit (defence's path, the waiting time target, the triple lock) is tagged before it is pressed.
- **The page's order.** The budgets come first. Short of money, the taxes to raise follow; with
  money to spend, the tax cuts and other priorities, then the taxes to raise. The department and
  benefit lines leave the one-way menus, which keep the taxes, the tax cuts and free school meals.
- **The rules.** The validator holds the rows to measures no card asks about, each in one row at
  most, twenty rows at most; and the budgets to spending lines on a scale, each first step down and
  up on the lever. A test holds every cut to saving money and every addition to spending it all the
  way along each scale, and every end of every scale to breaking no promise.

## Consequences

- The last page fits a phone in a few screens, and every row says what it is and can say more.
- A Budget can now be balanced by spending less as well as by taxing more, which is the choice the
  user asked to see. Cutting a budget deeply strains promises the reception reads, as any move does;
  none breaks one.
- A shared link that set a department or benefit line opens with the row at that level, whichever
  way it moved.
- Methodology §43 says how a budget's step is priced; the data README records the rows and the
  budgets.
