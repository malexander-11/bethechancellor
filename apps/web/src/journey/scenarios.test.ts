import { computeOutcome, parseContext } from '@btc/engine';
import contextJson from '@data/context/2026-09.json';
import { describe, expect, it } from 'vitest';
import { context, levers, rules, vintage } from '../data';
import { IMPLEMENTATION_YEAR } from '../state/budget';
import { macroCodesOf, matchScenario, scenarioCards } from './scenarios';

const cards = scenarioCards(context, levers, vintage);
const codes = macroCodesOf(context.readings);
const card = (kind: string) => {
  const c = cards.find((x) => x.kind === kind);
  if (!c) throw new Error(`missing scenario ${kind}`);
  return c;
};

/** Headroom against the stability rule, in £bn, on a budget with nothing but these assumptions. */
function headroom(values: Record<string, number>): number {
  const outcome = computeOutcome({
    vintage,
    rules,
    levers,
    settings: {
      leverValues: values,
      implementationYear: IMPLEMENTATION_YEAR,
      debtInterestFeedback: true,
      assessAsOf: 'vintage',
    },
  });
  return (outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0) / 1000;
}

describe('the four sets of assumptions', () => {
  it('offers exactly the four the step is built around', () => {
    expect(cards.map((c) => c.kind)).toEqual(['baseline', 'adviser', 'optimistic', 'pessimistic']);
  });

  it('leaves every slider on the OBR’s path for the March baseline', () => {
    expect(card('baseline').values).toEqual({ rate: 0, ngdp: 0, rpi: 0 });
  });

  it('reproduces the adviser’s own rule, unchanged', () => {
    expect(card('adviser').values).toEqual({ rate: 0.75, ngdp: 0, rpi: 0.5 });
  });

  it('gives the optimist the kindest published figure on each slider', () => {
    // Bank Rate's lowest published path runs 0.62 points a year below the OBR's. RPI's lowest is
    // only 0.18 below, which is inside half a step, so the rule rounds it away.
    expect(card('optimistic').values).toEqual({ rate: -0.5, ngdp: 0, rpi: 0 });
  });

  it('gives the pessimist the cruellest, which for rates is today’s gilt yield', () => {
    // Not the comparison's highest Bank Rate row (+0.25): the gloomiest published rates figure
    // anywhere in the data is the 10-year gilt yield the adviser reads, so the pessimist takes it.
    expect(card('pessimistic').values).toEqual({ rate: 0.75, ngdp: 0, rpi: 1 });
  });

  it('says growth stays on the OBR path because no published range reaches it', () => {
    for (const kind of ['optimistic', 'pessimistic']) {
      const growth = card(kind).settings.find((s) => s.leverCode === 'ngdp');
      expect(growth?.value).toBe(0);
      expect(growth?.workings).toMatch(/No published range/);
    }
  });

  it('shows the rows and the arithmetic it used, not just the answer', () => {
    const rpi = card('pessimistic').settings.find((s) => s.leverCode === 'rpi');
    expect(rpi?.workings).toMatch(/Highest of the forecasts/);
    expect(rpi?.workings).toMatch(/2027 4.8%/);
    expect(rpi?.workings).toMatch(/average gap of 1\.14 points/);
    expect(rpi?.workings).toMatch(/0\.5 step/);
  });

  it('derives the settings, so tampering with a published row moves the card', () => {
    const tampered = structuredClone(contextJson) as typeof contextJson;
    const rpi = tampered.readings.find((r) => r.id === 'rpi');
    // Push the highest published RPI path up by a point across the board.
    const series = (
      rpi as unknown as { alternatives: { highest: { series: Record<string, number> } } }
    ).alternatives.highest.series;
    for (const year of Object.keys(series)) series[year] = (series[year] as number) + 1;
    const moved = scenarioCards(parseContext(tampered), levers, vintage);
    expect(moved.find((c) => c.kind === 'pessimistic')?.values.rpi).toBe(2);
    // and nothing else shifts with it
    expect(moved.find((c) => c.kind === 'optimistic')?.values.rpi).toBe(0);
  });
});

describe('the cards come out ordered, by construction', () => {
  // The whole point of building the analysts from a candidate pool that already contains the OBR's
  // path and the adviser's reading. A refresh of the published rows must never be able to put the
  // pessimist above the adviser again, which is exactly the bug this replaced.
  it('runs optimist ≥ baseline ≥ pessimist and optimist ≥ adviser ≥ pessimist in headroom', () => {
    const h = Object.fromEntries(cards.map((c) => [c.kind, headroom(c.values)]));
    expect(h.optimistic).toBeGreaterThanOrEqual(h.baseline as number);
    expect(h.optimistic).toBeGreaterThanOrEqual(h.adviser as number);
    expect(h.pessimistic).toBeLessThanOrEqual(h.baseline as number);
    expect(h.pessimistic).toBeLessThanOrEqual(h.adviser as number);
  });

  it('makes the pessimist strictly gloomier than the adviser, not merely no better', () => {
    expect(headroom(card('pessimistic').values)).toBeLessThan(headroom(card('adviser').values));
  });

  it('keeps the baseline on the OBR’s published headroom', () => {
    expect(headroom(card('baseline').values)).toBeCloseTo(23.6, 1);
  });

  it('gives no two cards the same settings, so each can be selected', () => {
    const seen = cards.map((c) => JSON.stringify(c.values));
    expect(new Set(seen).size).toBe(cards.length);
  });
});

describe('which card the player is on', () => {
  it('recognises each card from its own settings', () => {
    for (const c of cards) expect(matchScenario(cards, c.values, codes)).toBe(c.kind);
  });

  it('tells the adviser and the pessimist apart although they share a rates setting', () => {
    expect(card('adviser').values.rate).toBe(card('pessimistic').values.rate);
    expect(matchScenario(cards, card('adviser').values, codes)).toBe('adviser');
    expect(matchScenario(cards, card('pessimistic').values, codes)).toBe('pessimistic');
  });

  it('ignores tax and spending levers when matching', () => {
    const withBudget = { ...card('pessimistic').values, itbr: 1, dhsc: 2 };
    expect(matchScenario(cards, withBudget, codes)).toBe('pessimistic');
  });

  it('returns nothing for hand-set sliders that match no card', () => {
    expect(matchScenario(cards, { rate: 0.1 }, codes)).toBeNull();
  });

  it('treats an absent lever as the OBR path, so an empty budget is the baseline', () => {
    expect(matchScenario(cards, {}, codes)).toBe('baseline');
  });
});
