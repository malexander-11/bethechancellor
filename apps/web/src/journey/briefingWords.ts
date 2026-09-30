import type { SourceRef } from '@btc/engine';

/**
 * The briefing's words (Phase 28, ADR-0030): three parts, each a heading and a few sentences, in
 * the order the player asked for them. Your headroom; what headroom is; how it is calculated. The
 * wording is the player's own, as they rewrote it on 29 September 2026, and it is plain: no word
 * opens a definition (ADR-0031). No figure is typed here: every sum, rate and year is a
 * {placeholder} the page fills from the data or the engine, so a rebase re-reads them. Exported so
 * the readability and words tests read what the player reads.
 */
export const BRIEFING_WORDS = {
  headroom: {
    heading: 'Your headroom',
    /** The one figure to plan on. {estimate} is the engine's: today's estimate, an assumption. */
    figure: 'You start with {estimate} of breathing space in {year}.',
    /** The same line should a rebase ever leave the estimate below zero. */
    shortfall: 'You start {estimate} short of the rules in {year}.',
    /** The OBR's record of what Chancellors have kept, an Official figure. */
    history: 'Since {since}, Chancellors have kept about {average} on average.',
    /** Why they keep it, in words with their sources: Commentary. */
    safety: 'This builds in some safety for adverse economic impact.',
    /**
     * What the record means for this Budget, softened in the player's own words (2026-09-30):
     * "likely", and no figure. "Sensible" is a judgement, so the line is a Game judgement, and
     * nothing scores it; the page shows it only while the estimate is below the record above it.
     */
    buffer:
      'This means this Budget will likely need to increase the headroom to build in a sensible buffer.',
  },
  what: {
    heading: 'What is headroom?',
    rules:
      'Two rules: pay for day-to-day spending with tax by {year}, and have debt falling by then.',
    meaning: 'Headroom is how much you can spend, or cut in tax, and still meet the rules.',
    /** What lenders must buy this year, an Official figure: gross sales, so not "borrows". */
    gilts:
      'This year the government plans to sell {gilts} of gilts, to fund its borrowing and repay old ones.',
    /** Why that matters, in words with their sources: Commentary. */
    lenders:
      'Lenders charge more when they doubt the sums. Meeting the rules with headroom to spare keeps their trust.',
    /**
     * The debt rule, in the running text beneath the rules in both modes (it was one fold away
     * until 2026-09-30), in plain type: first that it is the second of the two rules above it, then
     * the player's words, with its year the rule's own and said as the Charter and the rules' own
     * plain words have it (the year before, not "in five years"). The investment it counts is the
     * lesson: the day-to-day rule leaves it out.
     */
    debtRule: {
      text: 'The second rule is the debt rule. Government debt must be a smaller share of the economy in {year} than the year before. Critically, this includes any borrowing for investment as well as day-to-day spending.',
    },
  },
  calc: {
    heading: 'How the headroom is calculated',
    /**
     * What moved the forecast, in words; the rows give the sums. The inflation row is interest on
     * index-linked gilts, which moves with RPI (the OBR, March 2026, paragraph 4.27), not the
     * benefits that rise with CPI, so the line says debt, not spending.
     */
    intro:
      'Since March, interest rates and inflation have been higher than expected. This means the government is paying more money to borrow, and paying more on debt linked to inflation.',
    forecast: 'The OBR’s March forecast',
    /** What each economic setting of the estimate is called, by the way it moved from March. */
    steps: {
      rate: { up: 'Higher interest rates', down: 'Lower interest rates' },
      rpi: { up: 'Higher inflation', down: 'Lower inflation' },
      ngdp: { up: 'Faster growth', down: 'Slower growth' },
    } as Record<string, { up: string; down: string }>,
    estimate: 'Today’s estimate',
  },
  workings: 'How the estimate is made',
} as const;

/**
 * Where the briefing's words come from, by line (Phase 28), shown with the workings on. The
 * figures carry their own sources in the data; these are the sources of the words around them.
 */
export const BRIEFING_SOURCES = {
  /** Why Chancellors keep a margin: the OBR on shocks, and the Chancellor's own letter. */
  safety: [
    {
      sourceId: 'obr-efo-2025-11',
      paragraph: '1.30',
      page: '18',
      quote:
        'increases the margin held against the Government’s fiscal targets, it still leaves the UK public finances relatively vulnerable to future shocks',
    },
    {
      sourceId: 'hmt-tsc-budget-2026-letter',
      quote:
        'ensuring we retain a buffer to protect us against uncertainty and the impact of instability in the Middle East',
    },
  ],
  /** A buffer the size of the record: the OBR sets a margin beside its typical revision. */
  buffer: [
    {
      sourceId: 'obr-efo-2025-11',
      paragraph: '1.3',
      page: '5',
      quote:
        'close to the £21 billion average absolute revision in the fourth year of our pre-measures forecast between fiscal events, and around three-quarters of the £29 billion average margin set aside by previous Chancellors',
    },
  ],
  /** Lenders and the sums: the Bank on 2025's long rates, and the Chancellor's own letter. */
  lenders: [
    {
      sourceId: 'boe-insights-long-rates-2025',
      quote:
        'uncertainty about the extent of the Government’s fiscal headroom and issuance needs as being potential drivers of higher term premia',
    },
    {
      sourceId: 'hmt-tsc-budget-2026-letter',
      quote: 'Fiscal credibility is the bedrock of economic stability',
    },
  ],
  /**
   * What moved the forecast: the readings behind "higher than expected" are the context file's, and
   * this is why the inflation row is debt, the OBR tying RPI to debt interest.
   */
  calc: [
    {
      sourceId: 'obr-efo-2026-03',
      paragraph: '4.27',
      page: '72',
      quote:
        'Debt interest spending is forecast to be, on average, £2.8 billion lower than November 2025, largely reflecting weaker RPI inflation',
    },
  ],
} as const satisfies Record<string, readonly SourceRef[]>;

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g;

/** A template with its placeholders filled; one with no value is left as it is, for a test to see. */
export function fillIn(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(PLACEHOLDER, (whole, key: string) => values[key] ?? whole);
}

/** A template in pieces: its text, and its placeholders by name, in order. */
export function templateParts(template: string): ({ text: string } | { key: string })[] {
  return template
    .split(/(\{[a-zA-Z]+\})/)
    .filter((piece) => piece !== '')
    .map((piece) => {
      const key = /^\{([a-zA-Z]+)\}$/.exec(piece)?.[1];
      return key ? { key } : { text: piece };
    });
}

/** Every string of the briefing's words, headings included, as templates. */
export function briefingTemplates(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(BRIEFING_WORDS);
  return out;
}
