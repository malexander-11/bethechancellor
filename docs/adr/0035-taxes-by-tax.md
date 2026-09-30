# ADR-0035: Taxes by tax

Date: 2026-09-30. Status: accepted. Revises ADR-0015, ADR-0018, ADR-0019, ADR-0020, ADR-0021,
ADR-0022, ADR-0024, ADR-0025, ADR-0026, ADR-0027 and ADR-0028, each of which carries a dated
revision pointing here.

## Context

Step 4's tax screen grouped 76 taxes, 95 policies, by who pays them: Everyone, the best-off,
business, savers and owners, and "Drivers, smokers, gamblers and flyers" (ADR-0025, ADR-0027).
Advanced mode showed three cards a group and folded the rest: 15 cards on arrival, and 5,481px on a
phone in the walk. A tax that moves both ways was two cards, "Put up VAT" and "Cut VAT", each in
Small, Medium and Large sizes.

After the badges went (ADR-0034) the user asked:

> Change the IA of the tax to be around taxes.
>
> Then group things more into decisions with sub-decisions
>
> VAT
> Change headline rate - 15 18 19 21 22 25
> Make small changes - remove off gas, keep off electricity etc.
> Remove exemption - food, home energy, public transport fares, children's clothes, new homes,
> motability cars
>
> Also remove these options:
> Being back health and social care levy
> Premium insurance tax
> Drop salary sacrifice cap
> Tax capital gains at same rates
> Cut vat registration threshold
> Remove charge NI on landlords rent
> Put up tax on selling a business
> Add back last year's cancelled fuel duty rise
> Undo last year's gambling duties
>
> Add:
> Reducing personal allowance
> Reduce NI for self employed

Three questions went back to the user before the plan, and their answers set its shape:

| Question                                                                   | Choice                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What advanced mode shows on arrival                                        | **Decisions closed.** Each tax lists its decisions; one opens to show its choices and prices. A decision holding anything chosen, or held by a flagship, when the screen opens is open. |
| Basic mode's picks, two of which were retired (the levy and CGT alignment) | **Two replacements**, so there are still eight: a point on employer National Insurance and capital gains tax at death.                                                                  |
| How finely to split the taxes                                              | **Eleven sections**: Income tax, National Insurance, VAT, Capital gains tax, Inheritance tax, Wealth tax, Council tax, Stamp duty, Business taxes, Duties and The tax gap.              |

The plan the user approved also took these defaults without asking:

- **One scale per tax.** Every tax with sizes is one control, its levels in order and the planned
  level among them as a radio ("20% as planned"), which is the user's VAT example. That covers a tax
  that moves both ways and one that moves one way. The spending screen is unchanged.
- **The nine are retired the way retired levers always have been**: marked deprecated, kept for the
  record with their costings, offered nowhere.
- **VAT's "etc."**: books join "Remove an exemption", the same kind of relief and not on the user's
  removal list; the reduced rate and 1% on everything now zero-rated join "Make small changes".
- **Motability leads "Remove an exemption"**, because the rule that realistic choices come before
  those not on the table puts the six the user listed after it.
- **A lower personal allowance neither breaks nor strains the tax lock**, as a lower higher-rate or
  employee threshold does not: the manifesto names rates. A cut to Class 4 breaks nothing; only a
  rise does.
- **"Put up fuel duty" takes the emissions clause** of the retired "Add back last year's cancelled
  fuel duty rise", on the same HMRC source, so the game still says a fuel duty rise cuts emissions
  and its climate lines still run both ways.

## Decision

### The tax screen goes tax by tax

Eleven sections, 26 decisions and 67 taxes, 87 policies in all. A decision holds one to seven taxes;
a tax with no size is a tick. In display order:

- **Income tax**
  - _Change the rates:_ the basic, higher and additional rates; a new 50% rate above £125,140
  - _Change allowances and thresholds:_ the personal allowance; the higher-rate threshold; end the
    threshold freeze early; a child tax allowance for under-fives
  - _Change pension tax relief:_ the same 30% relief for everyone; relief at the basic rate only;
    cap the tax-free lump sum
  - _Tax on dividends, savings and rent:_ another 2p; undo last year's rises
- **National Insurance**
  - _Change what employees pay:_ the main rate; the rate above £50,270; the threshold; full National
    Insurance on all earnings; for workers over state pension age
  - _Change what the self-employed pay:_ Class 4; on partnership profits
  - _Change what employers pay:_ the employer rate; its threshold; on pension contributions
- **VAT**
  - _Change the headline rate:_ 15% · 18% · 19% · 20% as planned · 21% · 22% · 25%
  - _Make small changes:_ take VAT off gas too; keep it off electricity after March 2027; the
    reduced rate; 1% on everything now zero-rated
  - _Remove an exemption:_ Motability cars; then, not on the table, food, home energy, public
    transport fares, children's clothes, new homes, and books, newspapers and magazines
- **Capital gains tax**
  - _Change the rates on gains:_ the higher and lower rates; undo the 2024 rise; carried interest as
    income
  - _Tax gains that go untaxed:_ when someone dies; when someone leaves the UK; on main homes (not
    on the table)
- **Inheritance tax**: _Change the rate_; _Change the reliefs:_ the family-home allowance; the 2026
  farm and family-business changes
- **Wealth tax**: _Tax wealth above £10 million:_ 1% or 2% a year, one or the other
- **Council tax**: _Charge the biggest homes more:_ double bands G and H; the surcharge from £1.5
  million
- **Stamp duty**: _Change the 5% band_; _Cut it for some buyers:_ abolish it on main homes; the
  additional-homes surcharge back to 3%
- **Business taxes**: _Change corporation tax_; _Change business rates_; _Tax banks and energy firms
  more:_ the reserves levy, the bank levy, the bank surcharge and the energy profits levy
- **Duties**: _Change fuel duty:_ the April 2027 freeze and the rate; _Tax drink, tobacco and
  gambling_; _Tax cars and flights more:_ car tax and air passenger duty; _Tax sugar and salt in
  food_
- **The tax gap**: _Chase more unpaid tax_

A section's label is the family, the lever file's own `group`, of every tax in it, so the family is
the one record of which tax a lever is; otherwise the validator says
`tax lever X is in the F family, not S`. Twenty-eight lever files moved family: "Capital gains"
became "Capital gains tax", "Business" became "Business taxes", "Wealth and property" split into
Inheritance tax, Wealth tax, Council tax and Stamp duty, and the Budget 2025 decisions went to their
taxes (three to Income tax, gambling to Duties, and HMRC's compliance push to The tax gap). A tax
not on the table comes last in its decision. The who-pays groups and their validator rules went; a
tax's incidence tag still says who pays it, on the review and on Budget day.

**Advanced mode, on arrival**, shows eleven headings and 26 decisions, all closed, with no cards.
Each decision is a heading's button, its title with a status beside it: where a one-scale decision
stands ("20% as planned", or "22% · raises £19.8bn" once moved), or how many choices another holds
("4 choices", or "1 chosen · raises £2.4bn"). A section's heading says nothing at rest and "2 chosen
· raises £X" once something in it moves. Opening a decision mounts its cards, and closing it takes
them away. A decision holding a tax that had moved when the screen opened, a flagship's included,
starts open; one opened during a visit stays open. The headings run h1 page, h2 tax, h3 decision, h4
card.

**Basic mode** has no decisions: seven taxes hold the eight picks, in this order: the 30% pension
relief, employer National Insurance up, employer National Insurance on pension contributions, VAT
off electricity, capital gains tax at death, the family-home allowance, council tax on the biggest
homes and gambling duties. Wealth tax, Stamp duty, Business taxes and The tax gap have no pick and
are left out, unless something in them was already chosen. Only a spending group must now have a
pick.

**Why a button in a heading and not a `details`.** A screen-reader user can move from decision to
decision by heading and hear whether each is open; and the word budgets leave out every `details`,
so decision titles and open cards would never be counted.

### One scale for a tax

Every tax with sizes is one card: under its plain name when it moves both ways ("The main rate of
VAT"), under its policy's title when it moves one way ("Put up car tax"). Its radios are the planned
level and every size its ways come in, in order, each named by the level it sets, the planned one
saying so: "15% · 18% · 19% · 20% as planned · 21% · 22% · 25%" for VAT, "£200 as planned · £210 ·
£220 · £250" for car tax, "5% less · 2% less · 1% less · As planned · 1% more · 2% more · 5% more"
for business rates. At rest, the card prices the nearest level each way on a line of its own ("21%:
would raise £9.9bn · headroom would be £16.6bn"); once moved, the effect line, "20% → 22%", the tags
and Undo work as before, and the adviser speaks for the way the tax has moved. Choosing the planned
level puts it back. A level no radio names, from an old link, reads "Now 23%" with nothing checked.
A card blocked by a tax that counts the same money has one line, the swap's price, and Swap sets its
nearest level. Each level is a column with its radio above it, so seven levels take two rows at
360px. Basic mode draws its one way on show as a scale from the plan: "15% as planned · 16% · 17% ·
18%".

### Nine taxes off the table

The levy (`hscl`), insurance premium tax (`ipt`), dropping the salary-sacrifice cap (`rvsal`),
capital gains at income tax rates (`cgtalign`), a lower VAT registration threshold (`vatthr`),
National Insurance on landlords' rent (`nicrent`), a higher rate on selling a business (`badr`),
last year's cancelled fuel duty rise (`rvfuel`) and undoing last year's gambling duties (`rvgam`)
are marked deprecated, filed as "Shelved" and headlined "Kept for the record; not on offer at this
Budget. Old links still work." Their costings, their own interactions and the tests of their
arithmetic stay. Everything live that named them went: their step-4 items, the tax lock's strain on
the levy and its break on rent, their incidence tags, the households' lines, and the live levers'
interactions that named them, which leaves fifteen pairs that count the same money, from 22. An old
link carrying one opens without it and says `Ignored unknown lever code "hscl".`, as it already did
for child benefit.

### Two cuts

- **The personal allowance** can come down by £100 or £1,250, to £12,470 or £11,320. HMRC publishes
  the cost of a £100 rise and of a 10% rise; a cut uses the same figures with the sign reversed, as
  inheritance tax's cuts already did, and the card's assumptions say HMRC does not publish it. The
  cut leads, as it raises money: "Most taxpayers pay more; some who paid nothing start paying."
- **Class 4 National Insurance** can come down by 1, 2 or 4 points, to 5%, 4% or 2%, on HMRC's
  symmetric one-point row: "Self-employed workers keep more of every pound of profit." Only a rise
  breaks the tax lock.
- **Households**: the couple and the tradesperson pay a lower allowance, and the pensioner's line
  that a smaller allowance taxes more of the pension can now fire. The professional pays the
  additional rate, above £125,140, where the allowance is already gone, so an allowance cut does not
  reach them by name. The tradesperson gains from a Class 4 cut.
- **The lookup points' notes** stop saying HMRC published every point: the card and the provenance
  drawer now say each point is worked from a published figure.

## Consequences

### Measured

- **Word budgets**, folds closed and workings off, on the walk's game with employer National
  Insurance two points up: the advanced tax screen read 592 words, and 750 tuned, before the nine
  went, then 585 and 741; tax by tax, with the decision on what employers pay open for the walk's
  two points, 512; with one scale a tax, 405. The tuned game now opens the six decisions holding its
  choices, each showing every choice in it: 1,176, then 1,030 with one scale a tax. Basic mode reads
  352 and 536, against 329 and 471 before. Each is pinned with a tenth to spare. The review reads
  196 and Budget day 181, against 204 and 190, with employer National Insurance in the walk in place
  of the levy.
- **Reading grades**: the fine-tuning screens, with the decisions' titles read and the tax families
  no longer read on their own (they are the sections' headings), 5.3, from 5.7; their advisers'
  lines 4.8, unchanged.
- **Phone heights** at 360px: the tax screen on arrival is 2,764px, 3.5 phone screens of 780px,
  against 5,481px, 7.0 screens, in walk37; basic mode's is 3,372px, against 3,210px, with seven
  headings where there were five and a scale on employer National Insurance.
- **Tests**: the engine pins the eleven taxes and 26 decisions, the families, the seven-lever limit,
  the order within a decision, the schema's and the validator's refusals, the scale's levels and the
  two cuts; the page tests pin the closed decisions, the statuses, opening one with the focus kept,
  the scale's radios and prices, arrival-open decisions, basic mode's seven taxes, the blocked scale
  and the cuts. The gate passes: 66 files, 689 tests.
- **The walk** (`walk38.mjs`, 1300px and 360px, light and reduced motion, with the contrast, size,
  family, hit-box, radius and animation audits) checks the eleven sections and 26 closed decisions,
  opens VAT's headline rate by keyboard with the focus kept, moves along its scale by arrow keys
  (21% raises, 19% costs, the plan clears it), counts its rows, marks employer National Insurance
  amber, reopens the decisions holding a choice on the next visit, opens an old link carrying the
  levy, and walks basic mode's eight picks. At first seven levels took three rows on a phone; set as
  columns they take two. It is clean in both runs.

### Risks

- **A tuned game is longer.** An open decision shows every choice in it, so a game with choices in
  six decisions reads 1,030 words, against 741 when a group showed four. The decisions start closed,
  and nothing chosen is hidden.
- **Some decisions are thin, and a one-scale decision names its subject twice.** The tax gap and
  sugar and salt are one tick each, three levels deep; "Change the headline rate" sits over "The
  main rate of VAT". Both are accepted so that every tax reads the same way.
- **The tax lock and thresholds.** A lower employer threshold strains the lock (ADR-0024); a lower
  employee or higher-rate threshold, and now a lower personal allowance, does not, though each asks
  more of taxpayers. That follows the manifesto's literal words, which name rates.
- **Mirrored figures.** A cut to the personal allowance is HMRC's rise with the sign reversed, which
  HMRC does not publish. The card and its assumptions say so, as inheritance tax's cuts do.
- **Twice the resting prices.** A two-way scale prices a level each way, two engine runs where a
  card ran one. Cards mount only in an open decision, and the engine's cache holds 256 outcomes.
- **Old links** carrying a retired tax show the unknown-code note, as those carrying the levers
  shelved in Phase 12 do. A friendlier line is a possible follow-up.
