# ADR-0018: Accessible, brief, and in the order the Budget happens

**Status:** accepted, 2026-09-20. Revises ADR-0013 (the reception gains nudges), ADR-0015 and
ADR-0017 (the 50p rate is no longer badged direct), and the Phase 9 rule that milestones and
interactions sit behind the workings switch.

## Context

The user asked, on 20 September 2026: _"Conduct a review in making the game better. It should be
accessible for all. Not too wordy. Reflect the budget process. Offer realistic solutions. Show
trade offs and challenges."_ Three read-only audits set the game against those five tests.

- **Access.** Good bones (labelled sliders, a real tablist, reduced motion, a 14px floor, focus
  rings), but three outright failures for a screen reader or a keyboard: one page title for
  eleven screens, no focus move on a change of screen, and fiscal-rule pills that said met or
  missed by colour, a hidden glyph and a tooltip. A dozen meanings lived only in tooltips (the
  badge definitions, which promise a red tag named, "Barnett applies", "HMRC points only"). The
  lever card was not a group, the attribution list was a table built from a list, the summary
  strip was a live region that spoke on every slider step, and the sticky scorecard could hide the
  focused control. The glossary had thirteen terms and reached only the guide.
- **Words.** The spending screen showed about 1,280 words on its longest tab, 389 of them
  ministers' opening lines averaging 42 words each. A 99-word disclaimer repeated on every screen.
  Headroom was said three times on one screen. The two package screens shared one guide entry.
- **Process.** The OBR arrived once, in an envelope labelled pre-measures that also held the
  scoring of the measures; nothing showed the decisions taken since March; the documents Budget
  day produces existed in the app unnamed; nine identical department sliders hid that the OBR's
  forecast protects health, defence and schools and has the rest falling 4.4% a year in real terms
  after 2028-29 (EFO March 2026, paragraphs 4.15 to 4.16).
- **Realism.** The 50p rate wore the direct badge although it is five times HMRC's one-penny row,
  which HMRC itself calls approximate beyond small changes; the six VAT base toggles and "abolish
  inheritance tax" were live options nobody proposes, shown like any other; every caveat about a
  figure sat behind the switch.
- **Trade-offs.** Who pays, the interactions, the reference points and the resilience of a package
  were computed but shown only on Budget day or behind the switch; three sign conventions shared
  one screen; the reception had cliff-edge bands and never said what would have moved them.

## Decisions taken with the user

| Question          | Choice                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| "Not too worry"   | Not too wordy: cut text first, then spend some of the saving on trade-offs.                              |
| Scope             | Review, then build the top items in one phase.                                                           |
| Access audience   | Plain English and cognition weighted most; WCAG blockers fixed regardless.                               |
| Process additions | The OBR in two rounds, the decisions since March, protected-department tags. Parliament's vote deferred. |
| Realism           | Re-badge the 50p rate, tag the teaching options "Not on the table", add a health and social care levy.   |

## Decisions

1. **Reach every screen.** Every screen names itself in the tab title; a change of screen scrolls to
   the top and puts focus on the main region; a skip link is first in the tab order. The rule pills
   say "Stability: met" in words. The badges are explained under "What the badges mean" on every
   screen. A lever is a group with an `h3` title, its control described by the headline and the
   effect line, its buttons naming the lever, its tags carrying their meaning in text. The running
   list is a table with row and column headers; every sideways-scrolling table is a named, focusable
   region. The summary strip is a plain region, and "Link copied" is announced beside a button whose
   label does not change. Every disclosure is a 44px target; chart and gauge labels are 14px at the
   size they are drawn.
2. **Fewer words.** A simulated line may carry `short`, the same line in at most eighteen words,
   shown first with the full line one click behind; every minister's asking line and every band over
   eighteen words has one, and a figure in the short line is a figure in the long one. The footer is
   one line. Headroom against the target is said on the scorecard and nowhere else on the screen.
   The group briefing headlines show without the switch. The two package screens have their own
   guide entries; the compromise routes fit forty words; the glossary has twenty-six terms and each
   screen lists the ones it uses. Tests hold the widest tax tab to 500 visible words and the widest
   spending tab to 700 (measured after the cuts: 395 and 659, before the who-pays panel), every
   minister line a newcomer reads to eighteen words, and Treasury shorthand out of the lines a
   newcomer reads.
3. **The process, in order.** The forecast comes in two rounds: the pre-measures forecast, then the
   measures back scored. The context file records the decisions taken since March on the
   government's own figures, shown on the outlook with what paid for each. Budget day names the
   documents: Table 4.1 (on the page whatever the switch says), the OBR's forecast, the policy
   costings. The breach route quotes the Charter's escape clause. Nine department levers carry a
   `commitment`, protected or unprotected, sourced to the OBR.
4. **Realistic options.** The 50p rate is badged assumption, carries the caveat and a behavioural
   consideration, and the two harder forecast outcomes revise it. A lever may be `notOnTheTable`:
   the six VAT base toggles wear the tag, sort to the foot of their group and say why they are here;
   the inheritance tax abolish option says so in its label. Every card has "What this assumes", one
   click away without the switch. A health and social care levy joins National Insurance at the
   legislated 1.25%, on HM Treasury's own 2021 figure of about £12 billion a year, badged
   assumption. The plan had it at the 1.8% being reported, scaled from that figure; no registered
   source carries the 1.8%, so under ADR-0002 the card scores the published rate and says in words
   that a higher rate has been reported and never costed.
5. **Trade-offs in view.** Every effect is a verb, and the tables say "worse" or "better"; green is
   better everywhere. The package carries "Who pays · who benefits" whenever something has moved, the
   interactions notice without the switch, and Budget 2025's measures for scale beside the running
   total. Milestones are one click away on every spending card; the gauge says what it is drawn
   against; a flagship's delivery line shows before it is ticked. The compromise screen has a stress
   test under every forecast the draw could have produced. A reception rule may carry a `nudge`, the
   distance to the next better band in the reading's own unit dropped into an authored sentence.
6. **Not done, and why.** Parliament's vote, at the user's choice. A bonus band for a fully certified
   package, because an empty package would earn it too. An automated axe run, because the library is
   not installed and the build environment installs nothing from the network; the walk's own audits
   cover contrast, size, hit boxes, landmarks, headings, titles, focus, dangling references and
   tooltip-only meanings instead.

## Consequences

- 53 tax levers (40 direct, 12 assumption, 1 mechanical), 26 spending and welfare levers on offer
  and six kept for the record, 88 lever files, 105 sources (HM Treasury's 2021 plan registered),
  a glossary of 26 terms, 475 tests. The journey asks eight Continues; ADR-0017 records seven.
- The markets' credibility rule bites more often again: the 50p rate and the levy are assumptions.
  Intended, and the cards say why.
- The "Not on the table" tags and the protected tags are judgements with sources (the manifesto and
  HMRC's relief statistics; the OBR's forecast). The education lever covers more than the schools
  the OBR protects, and its text says so. The decisions since March are the government's own
  figures, uncertified, and the table says so.
- Every audit finding this phase fixed has a test: titles, focus, the skip link, the group and
  heading on a lever, the described slider, distinct button names, the status words, the region,
  the table, the two rounds, the since-March table, the tags, the disclosure, the verbs, the
  comparator, the who-pays panel, the stress test, the nudge.
