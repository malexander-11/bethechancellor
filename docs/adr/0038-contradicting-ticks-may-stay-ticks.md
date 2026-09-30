# ADR-0038: Contradicting ticks may stay ticks

Date: 2026-09-30. Status: accepted. Supersedes the rule in ADR-0036 that two ticks in one decision
that exclude only each other must be a set of alternatives.

## Context

ADR-0036 drew two ticks in one decision that count the same money as one choice among radios, and
the validator named any such pair that was not declared a set. Capital gains tax at death and on
people who leave the UK were one: “Capital gains that go untaxed”, with “As planned”, “When someone
dies” and “When someone leaves the UK” as radios. They count the same money because the Resolution
Foundation’s £4 billion for ending the write-off at death is its estimate for that and an exit
charge together, and it publishes no split.

The user said:

> Capital gains taxes when someone leaves the country and dying should be tick box not radio

## Decision

- Whether two contradicting ticks in a decision are a set is the data’s to say. The validator still
  holds a declared set to its rules (ticks only, each excluding every other and nothing beyond, none
  set by a flagship, side by side, in one set), and no longer names a pair left as ticks.
- Capital gains at death and on leaving are ticks. They still count the same money, so choosing one
  takes the other out and says so first, as any contradicting choice outside a set does (ADR-0036):
  “Choosing this takes out “When someone dies”.” The reason is in the card’s fold. Nothing is
  counted twice.
- The wealth tax and the rates on dividends, savings and rent stay sets: each is one question with
  two answers.

## Consequences

- No decision on the tax screen now has a set beside other ticks, so a set’s name is always its
  card’s whole question and is heard, not shown. The screen still draws one beside other rows if the
  data declares it.
- Ticking both capital gains cards is not possible. Letting both count together would need the exit
  charge to add nothing on top of the death card, a figure the Foundation does not publish.
