import type { SourceRef } from '@btc/engine';

/**
 * The briefing's words (Phase 28, ADR-0030): three parts, each a heading and a few sentences, in
 * the order the player asked for them. Your headroom; what headroom is; how it is calculated. The
 * wording is the player's own, as they rewrote it on 29 September 2026. Glossary words are marked
 * [word](id), as in the guide, and open where they are used. No figure is typed here: every sum,
 * rate and year is a {placeholder} the page fills from the data or the engine, so a rebase re-reads
 * them. The one exception is the Resolution Foundation's July figure in the fold on why forecasts
 * move, a quotation dated in the sentence that gives it. Exported so the readability and words
 * tests read what the player reads.
 */
export const BRIEFING_WORDS = {
  headroom: {
    heading: 'Your headroom',
    /** The one figure to plan on. {estimate} is the engine's, and wears the Assumption badge. */
    figure: 'You start with {estimate} of breathing space in {year}.',
    /** The same line should a rebase ever leave the estimate below zero. */
    shortfall: 'You start {estimate} short of the rules in {year}.',
    /** The OBR's record of what Chancellors have kept, an Official figure. */
    history: 'Since {since}, Chancellors have kept about {average} on average.',
    /** Why they keep it, in words with their sources: Commentary. */
    safety: 'This builds in some safety for adverse economic impact.',
    /**
     * What reaching that record would take. {gap} is the record less the estimate, both on show
     * above it; "sensible" is a judgement, so the line is a Game judgement, and nothing scores it.
     */
    buffer: 'This means this Budget will need to find around {gap} to build in a sensible buffer.',
  },
  what: {
    heading: 'What is headroom?',
    rules:
      'Two [rules](fiscal-rules): pay for day-to-day spending with tax by {year}, and have debt falling by then.',
    meaning:
      '[Headroom](headroom) is how much you can spend, or cut in tax, and still meet the rules.',
    /** What lenders must buy this year, an Official figure: gross sales, so not "borrows". */
    gilts:
      'This year the government plans to sell {gilts} of [gilts](gilts), to fund its borrowing and repay old ones.',
    /** Why that matters, in words with their sources: Commentary. */
    lenders:
      'Lenders charge more when they doubt the sums. Meeting the rules with headroom to spare keeps their trust.',
    rulesFold: 'About the fiscal rules',
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
    /** A basic page names the OBR first here, so its full name is a tap away, the possessive kept. */
    forecast: 'The [OBR’s](obr) March forecast',
    /** What each economic setting of the estimate is called, by the way it moved from March. */
    steps: {
      rate: { up: 'Higher interest rates', down: 'Lower interest rates' },
      rpi: { up: 'Higher inflation', down: 'Lower inflation' },
      ngdp: { up: 'Faster growth', down: 'Slower growth' },
    } as Record<string, { up: string; down: string }>,
    estimate: 'Today’s estimate',
  },
  since: {
    fold: 'What changed since March',
    rates: 'Gilts pay {giltsNow} against the {giltsObr} the OBR assumed.',
    prices:
      'Forecasters expect prices to rise {pricesNow} a year on average to {pricesTo}, not the OBR’s {pricesObr}. Some government debt costs more when prices rise.',
    decisions:
      'Since March the government has taken {count} decisions that cost money. Each was paid for by moving money, so none used the headroom.',
  },
  forecasts: {
    fold: 'Why forecasts move',
    who: 'Chief Economic Adviser',
    error:
      'Forecasts move: over five years the OBR’s tax forecasts have been out by about {error} on average.',
    /** The one typed figure: the Resolution Foundation's, quoted with its month. */
    others:
      'Others put it differently. The Resolution Foundation said about £10bn in July; the independent forecasts the Treasury collects imply less.',
    process:
      'In a real Budget the OBR sends the Chancellor several rounds of forecast before the day. It also checks the costing of each measure. Here one estimate stays fixed.',
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
  /** Why forecasts move: the OBR's record, estimates on both sides, and how a Budget is made. */
  forecasts: [
    { sourceId: 'obr-efo-2026-03', paragraph: '3.4' },
    { sourceId: 'rf-headroom-2026-07-21' },
    { sourceId: 'hmt-forecasts-2026-08' },
    { sourceId: 'obr-efo-2026-03', note: 'Foreword: how the forecast was produced' },
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

/** Every string of the briefing's words, headings and folds included, as templates. */
export function briefingTemplates(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(BRIEFING_WORDS);
  return out;
}
