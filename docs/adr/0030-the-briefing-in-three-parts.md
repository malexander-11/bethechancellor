# ADR-0030: The briefing in three parts

Date: 2026-09-29. Status: accepted; revised the same day (below), then by ADR-0031. Revises
ADR-0025, ADR-0026 and ADR-0028, each of which carries a dated revision pointing here.

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

## Revision (2026-09-29): the briefing in the user's own words

Later the same day the user rewrote the briefing's words, part by part:

> Changed copy: Your briefing
> The headroom you have to play with, and the rules you need to meet to keep markets onside.
>
> Your headroom
> You start with £6.8bn of breathing space in 2029-30.
>
> Since 2010, Chancellors have kept about £29bn on average. This builds in some safety for adverse
> economic impact.
>
> This means this budget will need to find around £22bn to build in a sensible buffer.
>
> What is headroom?
> Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then.
>
> Headroom is how much you can spend, or cut in tax, and still meet the rules.
>
> This year the government plans to sell £246bn of gilts, to fund its borrowing and repay old
> ones. Lenders charge more when they doubt the sums. Meeting the rules with headroom to spare
> keeps their trust.
>
> How the headroom is calculated
> Since March, interest rates and inflation have been higher than expected. This means government
> are paying more money to borrow, and are paying more for spending linked to inflation.
> The OBR’s March forecast
> £23.6bn
> Official figure
> Higher interest rates
> −£11.3bn
> Assumption
> Higher inflation
> −£5.5bn
> Assumption
> Today’s estimate
> £6.8bn

The page now reads as written, with one change of fact, two of house style and two of layout:

- **"Debt linked to inflation", not "spending linked to inflation".** The calculation's inflation
  row is the OBR's RPI sensitivity, and the OBR ties RPI to debt interest: its March 2026 outlook
  puts debt interest "on average, £2.8 billion lower than November 2025, largely reflecting weaker
  RPI inflation" (paragraph 4.27, p. 72), and its Table 4.8 carries RPI inflation as a line of
  debt interest. The debt is index-linked gilts. Benefits rise with CPI, which the estimate does
  not move, so "spending" would have told the player the row counts benefits when it does not.
- **"The government is"** for "government are", as the page already says "the government plans";
  and **"this Budget"** with a capital B, as all the copy writes the fiscal event.
- **The OBR's name.** The rules line's second sentence went, and with it the one place the page
  spelt the OBR out. A basic page now names it first in the calculation's first row, so "OBR's"
  there opens the glossary's line, "The Office for Budget Responsibility: the independent body
  that produces the official forecast and checks the Chancellor's sums."
- **Badges.** The copy's sentences carry none; the page keeps one on every figure and every
  judgement, the estimate's row included, which the pasted rows left bare. Where the user joined
  lines, each part keeps its own badge inside the one paragraph: the record (Official figure) then
  why it is kept (Commentary); the gilts (Official figure) then why lenders care (Commentary).

The new lines and their sources:

| Line                                                                                                                                                                               | Badge                                                             | Sources                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "This builds in some safety for adverse economic impact."                                                                                                                          | Commentary                                                        | The OBR, November 2025, paragraph 1.30 (p. 18): the Budget "increases the margin held against the Government’s fiscal targets, it still leaves the UK public finances relatively vulnerable to future shocks"; the Chancellor's letter to the Treasury Committee: "retain a buffer to protect us against uncertainty".                                                                |
| "This means this Budget will need to find around £22bn to build in a sensible buffer."                                                                                             | Game judgement                                                    | The record less the estimate, £29bn less £6.85bn, to the nearest billion, filled from the data and never typed. "Sensible" is the judgement. The OBR, November 2025, paragraph 1.3 (p. 5), puts a margin of £22bn "close to the £21 billion average absolute revision in the fourth year of our pre-measures forecast" and "around three-quarters of the £29 billion average margin". |
| "Since March, interest rates and inflation have been higher than expected. This means the government is paying more money to borrow, and paying more on debt linked to inflation." | None: it says in words what the badged rows below give in figures | The 10-year gilt yield, 5.29% against the 4.5% the OBR assumed; CPI, 2.9% in July against the OBR's 2.3% for 2026; the OBR, March 2026, paragraph 4.27.                                                                                                                                                                                                                               |

What went, besides the rules line's second sentence and "the year the rules are tested": **the
advice**, "As you choose your policies, aim to keep more than £10bn. Below that, the markets get
nervous." The user's third part ends at the rows, and the buffer line now says how much to aim for.
The £10bn stays where it counts: the markets' thin band on Budget day and the review's yardstick
when a Budget ends thin.

**Still no target, but a level to aim for.** Where the advice named a floor, the buffer line names
the record. It is advice in words: nothing asks the player to choose a target, the bar is
unchanged, and nothing new is scored. The markets already reward it: a Budget that finds the £22bn
ends near £29bn, which they score as a wide buffer (+1).

**Measured.** The line under the heading is eighteen words, and the words test now allows the
briefing's line eighteen, every other screen's ten. The briefing is 232 words in either mode,
pinned at 255; it reads at grade 5.1; on a phone it is 2,119px tall in basic mode and 2,255px in
advanced, 2.7 and 2.9 screens of 780px. `walk30.mjs` is clean at 1300px and 360px in light and
reduced motion, with the audits on.

**Risks.**

- **Two advisers' levels.** Budget day's markets band calls twenty billion "comfortable"; the
  briefing now aims at about twenty-nine. Both are Game judgements and neither contradicts the
  scoring, but a player may notice the difference.
- **The £22bn moves with the data.** A rebase that changes the estimate or the record changes it,
  and the line goes if the estimate ever passes the record.

## Revision (2026-09-29): plain copy (ADR-0031)

Later the same day the user asked for a plainer page. On the briefing the badges now wait for the
workings, as the sources do, and no word opens a definition, the OBR's name in the first row
included. "About the fiscal rules" became "The debt rule", a fold in both modes that gives the rule
in the user's words with the Charter's year. The folds on what changed since March and on why
forecasts move went, and so did "Already on your desk" and the line that switched the briefing
between its short and full forms: the briefing is the same in both modes. It reads 175 words and
is 2.2 phone screens tall.
