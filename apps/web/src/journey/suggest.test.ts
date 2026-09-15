import { describe, expect, it } from 'vitest';
import { context, levers } from '../data';
import { gapOf, suggestSetting, suggestedSettings } from './suggest';

const reading = (id: string) => {
  const r = context.readings.find((x) => x.id === id);
  if (!r) throw new Error(`missing reading ${id}`);
  return r;
};
const lever = (code: string) => {
  const l = levers.find((x) => x.code === code);
  if (!l) throw new Error(`missing lever ${code}`);
  return l;
};

describe('advisers’ suggested settings', () => {
  it('turns the gilt yield gap into +0.75pp on the rates slider (0.85 rounded to a 0.25 step)', () => {
    expect(gapOf(reading('gilt-10y'))).toBeCloseTo(0.85, 6);
    const s = suggestSetting(reading('gilt-10y'), lever('rate'));
    expect(s?.value).toBe(0.75);
    expect(s?.rule).toBe('gap');
    expect(s?.rationale).toMatch(/5\.35%/);
    expect(s?.rationale).toMatch(/4\.5%/);
  });

  it('averages a series gap: RPI half a point higher rounds to +0.5', () => {
    expect(gapOf(reading('rpi'))).toBeCloseTo(0.46, 6);
    expect(suggestSetting(reading('rpi'), lever('rpi'))?.value).toBe(0.5);
  });

  it('uses the authored value and reasoning for growth', () => {
    const s = suggestSetting(reading('gdp-growth'), lever('ngdp'));
    expect(s?.value).toBe(0);
    expect(s?.rule).toBe('authored');
    expect(s?.rationale).toMatch(/nominal GDP/);
  });

  it('collects one setting per lever-linked reading and nothing for context-only readings', () => {
    expect(suggestedSettings(context.readings, levers)).toEqual({ rate: 0.75, ngdp: 0, rpi: 0.5 });
    expect(suggestSetting(reading('bank-rate'), lever('rate'))).toBeNull();
  });
});
