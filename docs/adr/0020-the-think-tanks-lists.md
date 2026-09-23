# ADR-0020: The think tanks' lists

Status: Accepted, 2026-09-23. Follows ADR-0019 (the menu against the reporting, again).

## Context

The user asked for a review of the think tanks' proposals for the 28 October Budget: _"Resolution
Foundation, IPPR etc."_ On 23 September 2026 the progressive, fiscal and centre-right institutions
were read (their own reports and pages; the IFS site is unreachable from here, so its Green Budget
was read from the co-publisher's copy; the Social Market Foundation and the parliamentary sites
were not reachable at all) and set against the 88 live levers.

What each asks for, and what could be built under ADR-0002:

| Institution                                      | What it asks of the Chancellor                                                                                           | Costed, fetched and not on the menu                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolution Foundation                            | Fund every new commitment; target cost-of-living help rather than freeze fuel duty; pay for defence with broad-based tax | Local Housing Allowance relinked to the 30th percentile (£2bn a year by 2029-30); a smoothed earnings link in place of the triple lock (saves about £650m in 2029-30); a sugar and salt reformulation tax (£3.5bn net of the soft drinks levy); the VAT threshold cut to £30,000 (£2bn); £800m a year more for 300,000 social-rent homes                                         |
| IPPR                                             | Keep the fiscal rules; equalise capital gains with income tax; a temporary energy-bill ceiling                           | A levy on banks' reserve returns above 2% at the Bank of England (£5bn to £7bn of current-budget headroom by the end of the parliament)                                                                                                                                                                                                                                          |
| CenTax (_Taxes at the top_, published today)     | Do not raise CGT rates without the base reforms                                                                          | Its CGT package re-costed at £19.7bn in 2030 on the current OBR baseline (the card carried £11.8bn); partnership NICs £2.1bn; an equivalent of Class 1 NICs on rental income (up to £3bn static), savings (£0.6bn) and other investment income (£0.4bn)                                                                                                                          |
| Joseph Rowntree Foundation                       | Protect the poorest from deductions                                                                                      | A protected minimum floor in universal credit, 15% below the standard allowance (£680m in 2027-28, £760m in 2029-30)                                                                                                                                                                                                                                                             |
| Tax Justice UK, Patriotic Millionaires           | A 2% wealth tax for social care; close the carried-interest loophole                                                     | 2% a year above £10m, "up to £24 billion" with Advani's behavioural response; Tax Policy Associates re-runs it at £18.5bn on the Wealth Tax Commission's high-avoidance case; carried interest at 45% (£510m, CenTax's central case)                                                                                                                                             |
| IFS (Green Budget, October 2025)                 | Reform property and capital taxes; "think twice" on pension relief; a headroom norm                                      | Double council tax on bands G and H (£4.4bn as a national surcharge; £4.2bn if councils keep it); abolish the NICs upper earnings and profits limits (£14.1bn static, behaviour "likely to reduce this yield significantly"); 1% VAT on all zero-rated products (£4.2bn); time-limit the new unemployment insurance (six months saves about £1.4bn a year, twelve months £0.6bn) |
| Demos                                            | Fair, popular, pro-growth tax reforms                                                                                    | Cap the withdrawals that earn lump-sum pension relief at £400,000 (£2bn)                                                                                                                                                                                                                                                                                                         |
| Institute for Government                         | Publish a tax strategy; be open to dropping the tax lock                                                                 | No costings                                                                                                                                                                                                                                                                                                                                                                      |
| Centre for Social Justice                        | Cut the sickness benefit bill                                                                                            | Withdraw PIP and the UC health element for milder anxiety, depression and ADHD, awards reset to £103 a week (£7.4bn by 2029-30, at least £1bn reinvested); an in-person assessment for child DLA (£0.98bn to £1.47bn gross by 2030, £660m reinvested)                                                                                                                            |
| Adam Smith Institute                             | Cut spending, not taxes                                                                                                  | Abolish stamp duty on main homes (£9.2bn a year static, £5.1bn net)                                                                                                                                                                                                                                                                                                              |
| Onward                                           | Family support instead of the triple lock                                                                                | A child tax allowance for under-fives (costs £4.8bn a year); end the Motability VAT relief (£1.2bn; HMRC's relief row costs it at £1.49bn, of which Budget 2025 already takes £280m by 2029-30)                                                                                                                                                                                  |
| IEA, TaxPayers' Alliance, CPS, Growth Commission | Hold spending to inflation; tackle welfare                                                                               | Anchors for existing sliders; the CPS's CGT paper reproduces HMRC's own rows; no new lever                                                                                                                                                                                                                                                                                       |
| Reform UK, the Conservatives                     | £45bn to £50bn of welfare savings; £47bn of savings                                                                      | Party documents: context only, not levers                                                                                                                                                                                                                                                                                                                                        |
| SMF, Health Foundation, King's Fund, LGA, EPI    | Machine games duty; social care £3.4bn to £8.7bn; a council gap of £4.3bn in 2027-28                                     | Behind blocked sites, or pressures rather than levers                                                                                                                                                                                                                                                                                                                            |

Already on the menu and confirmed by the round: CGT alignment, at death and on leavers;
partnership NICs; the 50p rate; pension relief at 30% and 20%; the bank surcharge and levy; the
£1.5m band; the two-child limit; PIP; the triple lock to CPI.

## Decision

Build all four sets, nineteen cards, under one rule: **every card rests on a fetched primary
document**, the think tank's own report or page, quotes it, badges the figure `assumption`, and
says whether it is static or after behaviour. Party figures stay as context.

1. **Cards brought up to date.** The alignment card (`cgtalign`) takes CenTax's September 2026
   re-costing, £19.7bn in 2029-30 on today's baseline after behaviour, as one stated figure held
   flat; the netting of the 2024 rise goes, because the new figure already sits on the new
   baseline. Partnership NICs quotes CenTax's £2.1bn; the social rent and fuel duty cards quote the
   Resolution Foundation's £800m and £5bn.
2. **The progressive asks** (`nicrent`, `qelevy`, `carried`, `wealth2`, `sugsalt`, `vatthr`).
3. **Two welfare tabs and six welfare cards.** Welfare becomes Working-age benefits (`wuc`, `woth`,
   `lha30`, `ucfloor`, `uitime`) and Pensioners and disability (`wpens`, `cpilock`, `pensmth`, `wdis`,
   `csjmh`, `dlakids`), each with a briefing, so the spending screen stays inside its 700-word
   budget. Every welfare card has a Work and Pensions Secretary line with every figure sourced.
4. **The IFS, Demos and centre-right options** (`ctgh`, `nicuel`, `vat1z`, `pslump`, `sdltabol`, `cta`,
   `vatmot`).

Rulings that needed making:

- **"Up to" is scored at the cautious published figure.** The 2% wealth tax is scored at Tax
  Policy Associates' £18.5bn (the Wealth Tax Commission's high-avoidance case), with the campaign's
  £24bn in words; the reserves levy at IPPR's £5bn floor; the child DLA assessment at the CSJ's
  lower bound net of its reinvestment; rental NICs at CenTax's static ceiling, said to be one.
- **Static yields are drawn on by the OBR draw.** `static-not-yield` sits on the rental NICs,
  council tax, upper earnings limit, 1% VAT and Motability cards; `avoidance-and-emigration` on the
  2% wealth tax; `eligibility-savings-shortfall` on the CSJ mental-health card, as on PIP.
- **The tax lock.** A new National Insurance charge on income that bears none (rental income),
  charging the main rate above the upper earnings limit, and a new positive VAT rate on zero-rated
  goods are increases for the people who pay them, so `nicrent`, `nicuel` and `vat1z` break the lock
  (`when: on`), each with a legal consideration that says the think tanks argue the other way. The
  reserves levy, carried interest, the council tax surcharge and the lump-sum cap do not. A smoothed
  earnings link breaks the triple-lock promise, as prices-only uprating does.
- **Overlapping designs warn.** Both wealth taxes; the 1% rate and every 20% zero-rate toggle; the
  upper earnings limit and the 2% additional rate; bands G and H and the £1.5m surcharge; the CSJ
  reset and the PIP reversal; the smoothed link and prices-only uprating; stamp duty abolition and
  the 5% band.
- **Our own steps are named on the card.** Growing JRF's first-year figure with the OBR's universal
  credit line (it lands a little under JRF's own 2029-30 number, and the caveat says so); placing
  the Adam Smith Institute's four-year average in 2027-28 and growing it with property transaction
  taxes; netting the Budget 2025 Motability line off HMRC's relief row.

Not built: NICs on savings and other investment income (named on the rental card); the
Resolution Foundation's taper offset and the CSJ's reinvestment programmes as levers of their own;
the IFS's residence nil-rate band and bank surcharge lines (already on the menu); machine games
duty and the social care figures (unreachable or pressures, not policies); anything from a party
document. CenTax's own carried-interest paper is quoted second-hand through Tax Justice UK, and the
card says so.

## Consequences

- Counts: 75 tax levers (43 direct, 31 assumption, 1 mechanical) in eight tabs; 32 spending and
  welfare levers on offer in six tabs, six more kept for the record; 116 lever files; 132 sources.
- Sixteen new sources are think-tank documents registered `Other` (or `RF`) with licence `Other`,
  each quoted briefly with attribution and each carrying the sentence the card rests on in its
  notes. The IFS Green Budget is registered from its co-publisher's copy with the IFS landing page
  beside it.
- The Director of Tax's ranked suggestions now open with the two largest think-tank packages; the
  compromise test pre-switches them so the lock-breaking rate rises are still reached and tested.
- The reception's credibility rule (ADR-0013, ADR-0017) bites harder: nearly half the revenue menu
  is now badged assumption. Intended: a Budget built on think-tank arithmetic should read as one.
- The welfare split touches five lever files and one briefing; the tests pin the two groups and a
  minister on every card.
