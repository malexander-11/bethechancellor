# ADR-0041: Step 4 has no basic mode

Date: 2026-10-01. Status: accepted. Supersedes ADR-0039, and ADR-0028 for step 4: neither
fine-tuning screen has a shortlist or a basic mode. Step 3 keeps its own.

## Context

ADR-0039 took the shortlist off the tax screen and kept it on the spending screen, where a first
game saw its adviser's few best ideas, one card a section, behind "See every idea" and "Show only
the best ideas". Told the tax screen had lost the button, the user said:

> Do make same changes to spending.

## Decision

- The spending screen has no shortlist. Its policies carry no picks and its side of `finetune.json`
  no `shortlistLead`, and the schema drops both fields, so step 4 is the same in both modes: every
  policy, in its decisions, closed until one is opened, with no mode line.
- The shortlist rules (ADR-0028) now hold for step 3 alone: one or two ways a priority, at least one
  in full; each counts by the target year, is on the table and breaks no promise; and no two ways
  basic mode shows count the same money.
- The desk rule becomes a plain rule beside the briefing's in-tray: every lever on the desk is on
  step 4, where every lever is on show.
- Step 3 keeps its shortlist, its button and the remembered mode.

## Consequences

- A first game's step 4 is the whole of step 4, and the engine's step-4 shortlist code, the basic
  view's markup and their tests go.
- The mode a player chooses on step 3 no longer changes anything on step 4.
- A spending choice that takes another out still says so first, in its decision.
