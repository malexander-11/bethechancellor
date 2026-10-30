# ADR-0045: The Chancellor's Budget is the baseline

Date: 2026-10-30. Status: accepted. Supersedes ADR-0025's one estimate and its six steps (its
curated levers stand); ADR-0022's priorities and the ways to deliver them; ADR-0028 and ADR-0041
(basic and advanced); ADR-0030 and ADR-0031 (the briefing); ADR-0033's cover; and ADR-0043's "play
again".

## Context

The Budget the game was built towards happened. The Chancellor delivered it on 28 October 2026 and
the OBR published its October 2026 forecast the same day. The user asked:

> Please create a plan to change this into an analysis of the chancellor's budget from 28/10/2026
> and allow people to tweak/vote on measures.

Asked, the user chose: the site opens on the analysis and a game starts from the Chancellor's own
measures, so the priorities and the flagships retire and fine-tune, review and Budget day stay; one
vote for or against each measure, one a device, with the counts shown; the measures that matter
become levers and the rest are listed; and the game's data is rebased to the OBR's October forecast.

Until then every game planned on "today's estimate": the OBR's March forecast brought up to date
with readings of gilt yields and prices, with a Budget still to write. That premise is over. What a
player can do now is read what the Chancellor did, judge it, and change it.

## Decision

- **The baseline is the OBR's October 2026 forecast with the Budget's measures in it.** A new
  vintage, `obr-2026-10`, typed from the Economic and fiscal outlook; the March vintage stays for
  old links. The context file carries no readings, so nothing is suggested: the forecast is the
  estimate, and a link's own economic settings (`M=`) are dropped with a note. The headroom every
  game starts from is the OBR's, pinned by the vintage's check.
- **A measure is a lever whose default is the Chancellor's setting.** Each movable measure is a
  toggle, off by default, that reverses the Treasury's own scorecard line:
  `costing.kind: "schedule"`, its effect minus the cited lines of Table 6.1, cited by line number so
  the validator can check the sum. The engine scales every costing by the lever's value and skips a
  lever at its default, so the Chancellor's Budget costs nothing to the headroom it left, and the
  review, the reception, the households and the picture all measure from it. A non-zero default is
  not an option; an "as announced" setting is always zero.
- **Which measures.** Every line of £100m or more in 2029-30, and a few headline ones under it,
  unless a reversal cannot take effect (an in-year line, a pre-announced one, a treaty or tariff in
  force, the resource effect of lending). The rest are listed and not offered; where a reader would
  expect to move one, the data says why. A vintage names `policyStart`, the April after its fiscal
  event, as the first year a measure can take effect, so a reversal of a measure already over by
  then is priced by the year it moves ("nothing in 2029-30; raises £0.8bn in 2027-28") rather than
  as changing nothing.
- **The site opens on the Budget.** `/` tells what the Budget did from the Budget file's story,
  every figure read from a quoted fact (the published steps of the margin since March) or worked out
  by the engine on the forecast (the headroom, the welfare cap's gap, what the measures do by the
  target year), with the engine's three verdicts on the untouched Budget. The movable measures come
  first, grouped by what each does in the target year (tax rises, tax cuts, less spending, more
  spending), each in one plain line with its figure from the extracted scorecard and a way to the
  screen its lever is on; the rest wait in one fold. One button starts a game at fine-tuning, a
  link's measures in it. The Chancellor is named once there, with the date and a source, as a fact
  of the Budget; everywhere else the words keep to roles.
- **The road is three steps**: fine-tune tax and spend, deliver the Budget, feedback. The briefing,
  the priorities, the flagships, the modes and the advisers' shortlist go, with their data (the
  options, the interventions, the three priority rules of the public's reception). The public
  approves instead of money that shows in a service and of revenue asked of the best-off, so five
  stays reachable. A Budget is named by how far it changed the Chancellor's: "The Chancellor's
  Budget, unchanged", "One change to the Chancellor's Budget", "3 changes to the Chancellor's
  Budget".
- **Old links open.** A link written on this road carries `rd.2` in its game (`g=st.1_rd.2`). One
  without it is read on the six-stage road and its stage mapped onto the three (the briefing, the
  priorities and the flagships open fine-tuning; the review and Budget day keep their place); a
  seven-stage link (`s=`) goes through the older map first. The priorities a link carries (`pr`) are
  dropped without a word, as the estimate's settings are dropped with one. The retired screens'
  addresses open the step that took their place.
- **Votes.** One a device on each measure, for or against, pressed again to take it back, kept by
  the leaderboard's server in a table of its own keyed on the measure's id and the device's hash,
  and tallied when asked: one statement covers every measure, so no counts table needs seeding.
  Networks are limited as the leaderboard's are. The tallies carry nothing of the reader and may be
  cached for a minute; a vote sends the browser's code, which the browser remembers beside its
  leaderboard votes. Without a database the page says voting is not open yet and shows no buttons.
- **Shelved.** Four levers the Budget overtook keep their costings and leave every screen: HMRC
  compliance again, another 2p on investment income, the April 2027 fuel duty freeze and the defence
  plan's gap, which the Budget funded by moving capital to defence.
- **The welfare cap.** On the OBR's own assessment the cap is missed by £2.8bn before any measure,
  so the untouched Budget reads "meets both fiscal rules, but misses the welfare cap", with the
  source. The copy says £14.5bn of headroom, the engine's figure; the Treasury rounds it to £15bn.

## Consequences

- Every figure on the analysis page is the engine's or a quoted fact, and the validator holds the
  Budget file to that: each movable measure names a live lever on the fine-tuning screens costed
  from that line, each fact quotes its source, the steps of the margin add up to the headroom the
  vintage reproduces, and the story's placeholders are the ones the page fills.
- Links shared and Budgets posted before the rebase were made on the March forecast. They open on
  October's data with any retired code dropped and the estimate's settings noted; the leaderboard
  had no database yet, so nothing migrates.
- The 2024-25 outturn is carried from the March vintage, marked provisional, because the levers
  derived from a 2024-25 base year still need it.
- The measures under £100m that are not headline ones are not offered; a reader can vote on them.
- Methodology §39 says how a tweak is priced and what the votes keep; the data README records the
  Budget file's rules and the measure levers' conventions.
