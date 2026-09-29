# ADR-0030: The briefing in three parts

Date: 2026-09-29. Status: accepted. Revises ADR-0025, ADR-0026 and ADR-0028, each of which carries
a dated revision pointing here.

## Context

After the rename (ADR-0029) the user gave feedback on step 1, the briefing, in the form it should
take:

> Feedback on Your Briefing
> Should be formatted:
> Your headroom
> £6bn breathing space.
> Historically, 10-20bn is kept.
> What is headroom
> Explain fiscal rules and how this is created to provide credibility to bond market. UK gov borrows
> x amount a year so we need to ensure willingness to lend money.
> How the headroom is calculated
> £23bn was provided at march budget
> Inflation and interest rates nudge that higher
> As you decide on new policies, stay above a headroom of 10bn to keep markets calm.

The briefing then opened with "The Treasury's briefing": the figure, what headroom is, its year in
months and about £240 for each household, a source line, the advisers' yardstick, the rules in one
line and what is already on the desk. Advanced mode added "Since March" and a fold on what headroom
is. The user asked for three plain parts in their place.

Four things in the draft had to change before it could be printed, because every number in the
game is an official figure or a stated calculation on one, and every claim has a source that can be
fetched:

- **The figure is £6.8bn**, the engine's estimate, not £6bn.
- **The record is higher than £10bn to £20bn.** The OBR's November 2025 forecast gives the average
  margin Chancellors have left against their rules as "around £29 billion" (paragraph 7.6), "since
  2010" (paragraph 7.11).
- **March was the OBR's forecast, not a Budget.** It left £23.6bn.
- **Interest rates and inflation pushed the headroom down, not up.** The engine splits the fall
  exactly: higher interest rates take £11.25bn, higher inflation £5.5bn. 23.6 − 11.25 − 5.5 =
  6.85, shown as £6.8bn; rounded, the rows still add up: 23.6 − 11.3 − 5.5 = 6.8.

Three questions were put to the user:

| Question           | Choice                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The history line   | **"Since 2010, Chancellors have kept about £29bn on average"**: the OBR's own record, badged Official figure.                                                                                                                                 |
| The borrowing line | **£246bn of gilts this year**: what lenders must buy in 2026-27, for new borrowing and for gilts that fall due. HM Treasury's revision of the Debt Management Office's remit, 23 April 2026, paragraph 2.3: "gilt sales of £246.2 billion".   |
| Everything else    | **"Already on your desk" stays under the three parts, in both modes**, since basic mode's desk rule relies on it. Three folds show in advanced mode only: the rules in the Charter's words, what changed since March, and why forecasts move. |

## Decisions

### The three parts

Both modes show the three parts, then "Already on your desk", the line that switches the mode, and
"Set your priorities" with Back. Each part is a section with its own heading.

**1. Your headroom**

- "£6.8bn of breathing space in 2029-30, the year the rules are tested." Assumption: it is our
  estimate, the OBR's March forecast brought up to date.
- "Since 2010, Chancellors have kept about £29bn on average." Official figure, from the OBR's
  record: paragraph 7.6, p. 162, and paragraph 7.11, p. 165. Chart 7.3 puts each past margin in
  today's terms, its share of GDP at the time applied to the OBR's latest forecast of GDP.

**2. What is headroom?**

- The two rules in one line, as before, with the OBR spelt out where the briefing first names it
  ("the Office for Budget Responsibility (OBR), the official forecaster"), since the source line
  that used to do it went.
- "Headroom is how much you can spend, or cut in tax, and still meet the rules." The page's only
  Headroom a player can tap.
- "This year the government plans to sell £246bn of gilts, to fund its borrowing and repay old
  ones." Official figure. The line says what the sales pay for rather than "borrows £246bn": gilt
  sales are gross financing, and the remit's own arithmetic (Annex C) sets them against £137.2bn
  of cash borrowing and £140.2bn of gilts falling due.
- "Lenders charge more when they doubt the sums. Meeting the rules with headroom to spare keeps
  their trust." Commentary: words about an effect, with their sources. The Bank of England notes
  that for much of 2025 market participants pointed to "uncertainty about the extent of the
  Government’s fiscal headroom and issuance needs" as potential drivers of higher term premia, the
  extra return lenders ask for; the Chancellor's letter to the Treasury Committee says "Fiscal
  credibility is the bedrock of economic stability".
- In advanced mode, the fold "About the fiscal rules", unchanged.

**3. How the headroom is calculated**

| Row                      | Figure   | Badge           | From                                                                                               |
| ------------------------ | -------- | --------------- | -------------------------------------------------------------------------------------------------- |
| The OBR's March forecast | £23.6bn  | Official figure | The vintage's own headroom, checked against the OBR's Table 5.1                                    |
| Higher interest rates    | −£11.3bn | Assumption      | Today's setting (the gilt yield's gap), priced by the OBR's sensitivity (paragraphs 1.21 and 6.16) |
| Higher inflation         | −£5.5bn  | Assumption      | Today's setting (the forecasters' RPI gap), priced by the OBR's sensitivity (paragraph 6.17)       |
| Today's estimate         | £6.8bn   | Assumption      | The same figure part 1 gives                                                                       |

- The two middle labels are the user's own words for the causes. Each step is named by the way its
  setting moved from March, so a rebase that lowered rates would say "Lower interest rates".
- The last row says "Today's estimate", never a second "Your headroom".
- The rows' sources sit in one list after them, with the workings on, so the figures stay in one
  column on a phone. The rows are one grid, shared through subgrid, so the figures line up as a sum
  does.
- The advice: "As you choose your policies, aim to keep more than £10bn. Below that, the markets get
  nervous." Game judgement. The £10bn is `THIN_HEADROOM_GBPM`, the markets' own line on Budget
  day: a margin under it costs a point with them, "below the ten billion commentators called
  wafer-thin before the last Budget". Its sources: the OBR's record of March 2025's margin,
  "(£10 billion)" (paragraph 7.6); the Institute for Government's "wafer-thin amount of
  headroom ... which evaporated post-budget"; the Bank of England's July 2026 Financial
  Stability Report.
- In advanced mode, two folds:
  - **What changed since March**: gilts pay 5.29% against the 4.5% the OBR assumed; forecasters
    expect prices to rise 3.3% a year on average to 2030, not 2.8%, and some government debt costs
    more when prices rise; three decisions since March cost money, but each was paid for by moving
    money, so none used the headroom; then the decisions, with their sources. This was the "Since
    March" section.
  - **Why forecasts move**: the Chief Economic Adviser's note, Game judgement. The OBR's tax
    forecasts have been out by about £33bn over five years on average (its 0.9% of GDP is for
    receipts, so "tax" is the accurate word); the Resolution Foundation put headroom at about
    £10bn in July, and the independent forecasts imply less; in a real Budget the OBR sends
    several rounds of forecast before the day, and here one estimate stays fixed.
- With the workings on, "How the estimate is made", unchanged.

### Where the words and the figures live

- **The words** are in `apps/web/src/journey/briefingWords.ts`, in the style of the mode line's:
  the headings and sentence templates, with glossary words marked `[word](id)` and every figure a
  `{placeholder}`, and the source lists for the lines whose words, not figures, need sources. The
  page fills them; the readability and words tests read them. No figure is typed into a template:
  the one exception is the Resolution Foundation's July figure in the fold on why forecasts move, a
  quotation dated where it is given.
- **The calculation** is a pure engine helper, `fromForecast(pre)`, beside `reconcile`: the
  current-budget verdict's baseline headroom (the forecast), the macro rows of the attribution with
  their sign turned into a change of headroom (the steps, each keeping its row's badge), and the
  verdict's headroom (the estimate). Given today's estimate with no measure of the player's own,
  the forecast and the steps come to the estimate exactly; part 1 and the last row both read it,
  so they cannot differ.
- **The two published figures are data, not words.** The context file gains an optional
  `briefing` object: the average headroom (`gbpm`, `since`, source) and the gilt sales (`gbpm`,
  `year`, source), each source with its paragraph, page and quote. The validator refuses a figure
  whose source quotes nothing, and gilt sales for any year but the one the context is dated in
  (`fyOfDate(asOf)`, a new helper), so "this year" stays true when the context is re-dated. Every
  source id is checked as before.
- **One new source**, `dmo-remit-2026-04`: HM Treasury's revision of the Debt Management Office's
  remit. Its organisation is HMT: the remit is HM Treasury's ("revised by HM Treasury today",
  paragraph 1.1) and the Office is its executive agency (footnote 1), so the Official figure
  badge's wording, "a figure HMRC, HM Treasury or the OBR published", stays literally true. Its
  licence is recorded as Other: the Office's terms of use sit behind a captcha that could not be
  passed from here, so the one figure is quoted briefly with attribution. Every quote was re-read
  from the documents on 29 September 2026: the OBR's November 2025 outlook (paragraphs 7.6 and
  7.11, and Chart 7.3's note), the remit (paragraphs 1.1 and 2.3, footnote 1 and Annex C), the
  Bank's note on 2025's long rates (now dated 23 January 2026), and the Treasury Committee letter,
  the Financial Stability Report and the Institute for Government's note, each now with its date.

### What went, and why

- **"The Treasury's briefing"** as a heading. The page's own heading already says "Your briefing".
- **The source line** ("Our estimate: the March forecast ..."). The rows say it now.
- **About £240 for each household.** It is not in the user's format, and the £29bn record now gives
  the scale. `perHousehold` stays: the verdict card uses it.
- **"Since March" as a section.** Its figures are rows now; its account is a fold.
- **"Your advisers think the markets get nervous below about £20bn"**, from the old fold. It would
  contradict the £10bn advice, since the markets score £10bn to £20bn as neutral. £20bn still
  scores as ample on Budget day.
- **The yardstick on the briefing.** `Yardstick` is the review's alone now; the briefing gives the
  same line as advice, beside the calculation it follows from.

### Still no target

The £10bn is ADR-0026's yardstick reworded as advice. Nothing asks the player to choose a target,
nothing new is scored, the bar is unchanged, and the markets already mark a margin under £10bn
down a point on Budget day. It is not added to the bar or the review.

## Consequences

### Measured

- **Word budgets**, folds closed: the briefing is 205 words in either mode, against 159 in basic
  mode and 237 in advanced before. Basic mode reads more, the user's format: the record, the
  gilts, the lenders and four rows. Advanced mode reads less, since "Since March" is a fold. Both
  are pinned at 225.
- **Readability**: an eighteenth set, the briefing, its folds included, reads at grade 5.1, with no
  sentence over eighteen words.
- **On a phone** (360px, from the walk): the briefing is 1,999px tall in basic mode, 2.6 screens of
  780px, and 2,135px in advanced mode, 2.7 screens.
- **Tests**: 676 across 65 files. Among them: the page in both modes; `fromForecast` on the
  estimate, adding up exactly and as shown, with no steps when nothing is set and three when growth
  is set too; a tampered context file for each new validator message; and a words file that marks
  only glossary words, types no figure and names every economic setting both ways.
- **The walk** (`walk29.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits): clean in both runs. It checks the four headings in
  order, the figure and the record with their badges, the gilts and lenders lines, the four rows
  and the advice, the three folds in advanced mode only (each closed on arrival, opening, keeping
  the focus and closing), the glossary word by tap and keyboard, and that none of the retired lines
  is anywhere on the road.

### Risks

- **£246bn is a remit.** HM Treasury revises it at each fiscal event, so the Budget on 28 October
  will change it. The validator ties its year to the context's date, and re-reading the remit joins
  the rebase routine in `data/README.md`.
- **The £29bn is the OBR's November 2025 average**, in November 2025's terms. The March 2026
  forecast did not assess the rules, so there is nothing newer. It is an Official figure because
  the OBR published it and makes this comparison itself.
- **Rounding.** £6.85bn shows as £6.8bn, and the rows add up as shown. If new data breaks that,
  the engine test fails before a player sees it.
- **More figures on the surface.** Basic mode shows the parts of the one figure, about eight
  figures in all. That is the user's format.
- **"Breathing space"** also appears, in another sense, in the cost-of-living priority on the next
  screen. It is the user's phrase, so it stays.
- **Below zero.** Should a rebase leave the estimate negative, part 1 says "£X short of the rules"
  rather than "breathing space", and the last row shows the minus sign.
