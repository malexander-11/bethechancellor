# ADR-0021: Nothing before it can start

Status: Accepted, 2026-09-23. Follows ADR-0020 (the think tanks' lists).

## Context

Playing the Phase 16 build, the user said: _"I think the wealth taxes need some extra scrutiny.
They would take ages to put in place so I doubt they'd raise money this parliament?"_

They were right, and the game contradicted them. Both wealth-tax cards paid their full yield from
April 2027, the game's first implementation year, as if an annual wealth tax announced on
28 October 2026 could be legislated, valued and collected in six months. Every costing zeroes the
years before the game's start year, but nothing let a card say "and not before this year either".
The same overstatement sat on eight other Phase 16 cards that create a new tax or reform a benefit.

What the sources say:

- **Tax Policy Associates** (`tpa-wealth-tax-2025`), in a section written for exactly this Budget:
  "The usual Budget timetable is sixteen months between a Budget announcement and legislation
  applying from the start of the next tax year." "if a wealth tax were announced in the Autumn 2026
  Budget and the usual sixteen month timetable was followed, it would first apply in the 2028/29 tax
  year, with the first revenue from the tax received in January 2030 (i.e. after the next General
  Election). However, if – as we expect – the wealth tax legislative process was slower than for
  normal legislation, the tax would first apply in the 2029/30 tax year, with the first revenue
  received in January 2031."
- **The Wealth Tax Commission** (`wtc-final-report-2020`): a comprehensive policy process for an
  annual wealth tax "could take a total of four years from inception to full operation"; an annual
  tax "would be much more difficult to deliver effectively than a one-off wealth tax".
- **Two gov.uk precedents** for a new tax, now registered: the digital services tax, announced at
  Budget 2018 and applying "to revenue earned from 1 April 2020"; the soft drinks industry levy,
  announced at Budget 2016 and taking "effect from April 2018".
- **The proposers themselves**: the Resolution Foundation says its sugar and salt tax "would take
  several years to design and roll out" and gives its £3.5bn for 2029-30; IPPR calls its reserves
  levy "relatively straightforward to implement"; the IFS gives its unemployment insurance saving
  "in the long run, after any transitional protections are exhausted"; the Centre for Social
  Justice dates its savings "by 2029/30" and "annually by 2030"; Budget 2025 Table 4.1 line 54
  announced the £2m council tax surcharge 28 months ahead, with set-up costs before it.

The OBR scores a tax paid the January after its tax year in the fiscal year the cash arrives (the
capital gains rows in Autumn Budget 2024 line 27 show a small first year for that reason), so TPA's
expected case puts the wealth taxes' first receipts in 2030-31: nothing in 2029-30, the year the
fiscal rules test.

## Decision

A lever may carry `earliestStart: { year, text, sources }`: the first fiscal year its measure can
take effect on its source's own timetable, the sentence that says why, and the sources that say so.

- **The engine takes the latest of three dates**: the game's start year, the player's delay for the
  lever, and the lever's own earliest start (`effectiveStartYear`, applied once in `costLever`, so
  every caller inherits it). A player can delay a measure past its floor, never bring it forward.
- **The effect maps stay whole.** The validator reproduces every year a `statedProduct` or
  `weightedSum` authors, so the early years are zeroed at run time, as the £1.5m surcharge card
  already relied on. For a `linearPerUnit` or `lookupTable` costing a floor would shift the
  published profile to the floor year rather than zero it; no card with a floor is one today, and
  `data/README.md` says so.
- **The year must be one the vintage covers** (`validate:data`), and a macro slider may not carry
  one (schema).
- **The cautious published date is scored**, as ADR-0020 scores the cautious published figure: the
  wealth taxes take TPA's expected case (first receipts 2030-31), not its usual-timetable case
  (2029-30); the child DLA assessment reads CSJ's "by 2030" as 2030-31. Set-up costs (TPA's £600m
  for HMRC) stay in words.
- **The card says it.** A quiet "Earliest start April 2030" tag (a glossary term, the reason read
  aloud for screen readers), the reason under "What this assumes", the headline naming the year, and
  an effect line that reads "nothing yet; from 2030-31 raises £18.5bn" instead of "unchanged". The
  running list and the Budget-day measures table say "from 2030-31" beside the honest £0.0bn.
- **Downstream, nothing pretends.** The Director of Tax never suggests a measure that yields
  nothing in the target year; the OBR's re-scored table skips one; the speech, which speaks of the
  target year, says nothing about it (a "starts later" fragment is a follow-up, not built here).

The ten cards:

| Code                | Earliest start | Anchor                                                                        |
| ------------------- | -------------- | ----------------------------------------------------------------------------- |
| `wealth`, `wealth2` | 2030-31        | TPA's expected case; the Commission's four years                              |
| `sugsalt`           | 2029-30        | The soft drinks levy's 25 months; RF's "several years" and 2029-30 figure     |
| `ctgh`              | 2029-30        | The £2m surcharge's 28 months and set-up costs; the IFS figure is for 2029-30 |
| `qelevy`            | 2028-29        | The digital services tax's 17 months; IPPR's "relatively straightforward"     |
| `nicrent`, `cta`    | 2028-29        | TPA's usual sixteen-month timetable                                           |
| `csjmh`             | 2029-30        | CSJ's "by 2029/30"                                                            |
| `dlakids`           | 2030-31        | CSJ's "annually by 2030", read cautiously                                     |
| `uitime`            | 2030-31        | The IFS's "in the long run, after any transitional protections are exhausted" |

## Consequences

- The two wealth taxes raise nothing in the year the rules test. A Chancellor can announce one and
  cannot book it against the target, which is the lesson the user asked for.
- Counts: 116 lever files, 134 sources; 75 tax and 32 spending levers on offer, unchanged.
- The Director of Tax's list opens with the alignment package and the pension reliefs again; the
  credibility rule (ADR-0013) no longer counts a wealth tax that improves nothing.
- Tests that needed a re-scored measure yielding in 2029-30 use the death write-off card, which
  carries the same draw factors as the wealth cards; a new suite pins the ten floors, the
  max-of-three rule and the refusals.
- The compromise step's delay control counts from a lever's floor; no card on offer reaches it
  today (tax cards and savings never get the control), so the change is for correctness.
- `appliesFrom` remains set on every lever and read by nothing; left alone.
