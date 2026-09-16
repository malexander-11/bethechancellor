import { parseContext } from '@btc/engine';
import contextJson from '@data/context/2026-09.json';
import { describe, expect, it } from 'vitest';
import { context, levers } from '../data';
import { macroCodesOf, matchScenario, scenarioCards } from './scenarios';

const cards = scenarioCards(context, levers);
const codes = macroCodesOf(context.readings);
const card = (kind: string) => {
  const c = cards.find((x) => x.kind === kind);
  if (!c) throw new Error(`missing scenario ${kind}`);
  return c;
};

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

  it('builds the optimistic analyst from the lowest published rows', () => {
    // Bank Rate lowest runs 0.62 points a year below the OBR's; RPI lowest only 0.18 below,
    // which is inside half a step, so the rule rounds it away.
    expect(card('optimistic').values).toEqual({ rate: -0.5, ngdp: 0, rpi: 0 });
  });

  it('builds the pessimistic analyst from the highest published rows', () => {
    expect(card('pessimistic').values).toEqual({ rate: 0.25, ngdp: 0, rpi: 1 });
  });

  it('puts the pessimist’s rates below the adviser’s, and says why on the card', () => {
    // Not a slip: the adviser reads the 10-year gilt yield and the forecasters publish Bank Rate.
    expect(card('pessimistic').values.rate).toBeLessThan(card('adviser').values.rate ?? 0);
    const rates = card('pessimistic').settings.find((s) => s.leverCode === 'rate');
    expect(rates?.note).toMatch(/not gilt yields/);
    expect(rates?.note).toMatch(/No forecaster in the comparison publishes a gilt yield/);
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
    const series = (rpi as { alternatives: { pessimistic: { series: Record<string, number> } } })
      .alternatives.pessimistic.series;
    for (const year of Object.keys(series)) series[year] = (series[year] as number) + 1;
    const moved = scenarioCards(parseContext(tampered), levers);
    expect(moved.find((c) => c.kind === 'pessimistic')?.values.rpi).toBe(2);
    // and nothing else shifts with it
    expect(moved.find((c) => c.kind === 'optimistic')?.values.rpi).toBe(0);
  });
});

describe('which card the player is on', () => {
  it('recognises each card from its own settings', () => {
    for (const c of cards) expect(matchScenario(cards, c.values, codes)).toBe(c.kind);
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
