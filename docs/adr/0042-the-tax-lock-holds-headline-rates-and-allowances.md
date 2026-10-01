# ADR-0042: The tax lock holds headline rates and allowances

Date: 2026-10-01. Status: accepted. Supersedes the tax lock's reach in ADR-0019 (National Insurance
on working pensioners breaks it), ADR-0020 (so does 1% VAT on zero-rated goods) and ADR-0035 (a
lower personal allowance, higher-rate threshold or employee threshold breaks nothing), and reverses
the widening of 30 September that made every VAT rise break it.

## Context

The manifesto says Labour "will not increase National Insurance, the basic, higher, or additional
rates of Income Tax, or VAT". The game had read those words two ways at once: literally for
allowances and thresholds, which the pledge does not name, so cutting them broke nothing; and widely
for VAT and National Insurance, so charging either where none is charged today broke the lock. The
user said:

> manifesto should be more narrow. Just headline rates and allowances break it.

Asked which rates and allowances, the user chose every National Insurance rate on workers and both
thresholds, and no tag at all for what stops breaking it.

## Decision

- **A rise in a headline rate breaks the lock:** income tax's basic, higher and additional rates;
  the National Insurance rates workers pay (the employee main rate, the 2% above £50,270, Class 4,
  and the main rate charged on all earnings); and the main rate of VAT.
- **So does a cut to an allowance:** the personal allowance, the higher-rate threshold and the
  employee National Insurance threshold. A rise in any of them breaks nothing. Each lever carries a
  legal consideration saying why, since a `breaks` rule carries no text.
- **Nothing else breaks it, and what no longer does carries no tag:** VAT on anything now exempt or
  zero-rated, 1% on everything zero-rated, a higher 5% rate, and National Insurance on workers over
  pension age. Their notes say critics would call each a rise. The amber strains (employer National
  Insurance, its threshold, pensions and partnerships, and the new 50% rate) are unchanged.
- The promise's text says how the game reads it, after the manifesto's words, and so does the
  glossary.

## Consequences

- A lower personal allowance is red on the tax screen, and the scenarios a test plays for a tax on
  higher earners that breaks nothing now raise inheritance tax and stamp duty instead.
- Widening VAT or National Insurance is a free choice as far as the manifesto goes; the public and
  the backbenches still judge who pays.
