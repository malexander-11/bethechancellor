import type { ContextReading } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import { levers } from '../data';
import { gapOf, suggestSetting, suggestedSettings } from './suggest';

/**
 * Readings in the shape a context carries them (ADR-0025): the OBR's assumption against a later
 * published figure, each a scalar or a series. The Budget's own context has none, so these are
 * the readings the September 2026 context carried, kept here as fixtures.
 */
const SOURCE = { sourceId: 'obr-efo-2026-03' };
const LATER = { sourceId: 'hmt-forecasts-2026-08' };
const GILTS: ContextReading = {
  id: 'gilt-10y',
  title: '10-year gilt yield',
  unit: 'pct',
  leverCode: 'rate',
  obr: { value: 4.5, label: 'Market expectations in January', source: SOURCE },
  latest: { value: 5.29, label: 'Close on 18 September 2026', source: LATER },
  suggestion: { rule: 'gap' },
  text: 'Gilt yields have risen.',
};
const BANK_RATE: ContextReading = {
  id: 'bank-rate',
  title: 'Bank Rate',
  unit: 'pct',
  obr: { value: 3.6, label: 'Average 2026 to 2030', source: SOURCE },
  latest: { value: 3.75, label: '14 September 2026', source: LATER },
  text: 'Bank Rate is close to the average the OBR assumed.',
};
const RPI: ContextReading = {
  id: 'rpi',
  title: 'RPI inflation',
  unit: 'pct',
  leverCode: 'rpi',
  obr: {
    series: { '2026': 3.1, '2027': 2.9, '2028': 2.9, '2029': 2.9, '2030': 2.3 },
    label: 'OBR March 2026',
    source: SOURCE,
  },
  latest: {
    series: { '2026': 3.7, '2027': 3.8, '2028': 3.2, '2029': 2.9, '2030': 2.8 },
    label: 'Average of the forecasts the Treasury received in August 2026',
    source: LATER,
  },
  suggestion: { rule: 'gap' },
  text: 'Forecasters expect higher inflation.',
};
const GROWTH: ContextReading = {
  id: 'gdp-growth',
  title: 'Real GDP growth',
  unit: 'pct',
  leverCode: 'ngdp',
  obr: {
    series: { '2026': 1.1, '2027': 1.6, '2028': 1.6, '2029': 1.5, '2030': 1.5 },
    label: 'OBR March 2026',
    source: SOURCE,
  },
  latest: {
    series: { '2026': 1.1, '2027': 1.2, '2028': 1.4, '2029': 1.4, '2030': 1.5 },
    label: 'Average of independent medium-term forecasts, August 2026',
    source: LATER,
  },
  suggestion: {
    rule: 'authored',
    value: 0,
    rationale:
      'Receipts follow nominal GDP, where weaker growth and higher inflation roughly cancel.',
  },
  text: 'Forecasters expect weaker growth.',
};
const READINGS = [GILTS, BANK_RATE, GROWTH, RPI];

const lever = (code: string) => {
  const l = levers.find((x) => x.code === code);
  if (!l) throw new Error(`missing lever ${code}`);
  return l;
};

describe('advisers’ suggested settings', () => {
  it('turns the gilt yield gap into +0.75pp on the rates slider (0.79 rounded to a 0.25 step)', () => {
    expect(gapOf(GILTS)).toBeCloseTo(0.79, 6);
    const s = suggestSetting(GILTS, lever('rate'));
    expect(s?.value).toBe(0.75);
    expect(s?.rule).toBe('gap');
    expect(s?.rationale).toMatch(/5\.29%/);
    expect(s?.rationale).toMatch(/4\.5%/);
  });

  it('averages a series gap: RPI half a point higher rounds to +0.5', () => {
    expect(gapOf(RPI)).toBeCloseTo(0.46, 6);
    expect(suggestSetting(RPI, lever('rpi'))?.value).toBe(0.5);
  });

  it('uses the authored value and reasoning for growth', () => {
    const s = suggestSetting(GROWTH, lever('ngdp'));
    expect(s?.value).toBe(0);
    expect(s?.rule).toBe('authored');
    expect(s?.rationale).toMatch(/nominal GDP/);
  });

  it('collects one setting per lever-linked reading and nothing for context-only readings', () => {
    expect(suggestedSettings(READINGS, levers)).toEqual({ rate: 0.75, ngdp: 0, rpi: 0.5 });
    expect(suggestSetting(BANK_RATE, lever('rate'))).toBeNull();
    // The Budget's own context carries no readings: nothing to estimate, and nothing suggested.
    expect(suggestedSettings([], levers)).toEqual({});
  });
});
