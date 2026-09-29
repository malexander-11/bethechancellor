import type { SourceRef } from '@btc/engine';

/**
 * The briefing's words (Phase 28, ADR-0030): three parts, each a heading and a few sentences, in
 * the order the player asked for them. Your headroom; what headroom is; how it is calculated.
 * Glossary words are marked [word](id), as in the guide, and open where they are used. No figure
 * is typed here: every sum, rate and year is a {placeholder} the page fills from the data or the
 * engine, so a rebase re-reads them. The one exception is the Resolution Foundation's July figure
 * in the fold on why forecasts move, a quotation dated in the sentence that gives it. Exported so
 * the readability and words tests read what the player reads.
 */
export const BRIEFING_WORDS = {
  headroom: {
    heading: 'Your headroom',
    /** The one figure to plan on. {estimate} is the engine's, and wears the Assumption badge. */
    figure: '{estimate} of breathing space in {year}, the year the rules are tested.',
    /** The same line should a rebase ever leave the estimate below zero. */
    shortfall: '{estimate} short of the rules in {year}, the year they are tested.',
    /** The OBR's record of what Chancellors have kept, an Official figure. */
    history: 'Since {since}, Chancellors have kept about {average} on average.',
  },
  what: {
    heading: 'What is headroom?',
    rules:
      'Two [rules](fiscal-rules): pay for day-to-day spending with tax by {year}, and have debt falling by then. Miss one and the Office for Budget Responsibility ([OBR](obr)), the official forecaster, says so on Budget day.',
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
    forecast: 'The OBR’s March forecast',
    /** What each economic setting of the estimate is called, by the way it moved from March. */
    steps: {
      rate: { up: 'Higher interest rates', down: 'Lower interest rates' },
      rpi: { up: 'Higher inflation', down: 'Lower inflation' },
      ngdp: { up: 'Faster growth', down: 'Slower growth' },
    } as Record<string, { up: string; down: string }>,
    estimate: 'Today’s estimate',
    /** The advisers' advice, a Game judgement; {thin} is the markets' own thin line. */
    advice:
      'As you choose your policies, aim to keep more than {thin}. Below that, the markets get nervous.',
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
  /** The advice: a margin of £10bn, as March 2025 left, called wafer-thin once it evaporated. */
  advice: [
    {
      sourceId: 'obr-efo-2025-11',
      paragraph: '7.6',
      quote: '0.3 per cent of GDP (£10 billion) in March',
    },
    {
      sourceId: 'ifg-healey-tax-budget-2026',
      quote:
        'a wafer-thin amount of headroom against her fiscal rules which evaporated post-budget',
    },
    { sourceId: 'boe-fsr-2026-07' },
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
