import { plainText, segments } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import { context, levers, sourcesById } from '../data';
import { BRIEFING_WORDS, briefingTemplates, fillIn, templateParts } from './briefingWords';

describe('the briefing’s words (Phase 28, ADR-0030)', () => {
  it('is plain copy: no word opens a definition (ADR-0031)', () => {
    for (const t of briefingTemplates()) {
      expect(
        segments(t).every((s) => s.kind === 'text'),
        t,
      ).toBe(true);
    }
  });

  it('types no figure: every sum, rate and year is filled from the data or the engine', () => {
    const typed = briefingTemplates();
    expect(typed.length).toBeGreaterThan(20);
    for (const t of typed) expect(plainText(t), t).not.toMatch(/\d/);
  });

  it('says the debt rule as the Charter has it, with the year filled in', () => {
    // Said to be the second of the two rules, then the player's words, with the rule's own year and
    // "the year before" in place of "in five years": the Charter's rule is debt falling by 2029-30,
    // and the rules' own plain words say so.
    expect(fillIn(BRIEFING_WORDS.what.debtRule.text, { year: '2029-30' })).toBe(
      'The second rule is the debt rule. Government debt must be a smaller share of the economy in 2029-30 than the year before. Critically, this includes any borrowing for investment as well as day-to-day spending.',
    );
  });

  it('names every economic setting today’s estimate can move, whichever way it moves', () => {
    const macro = levers.filter((l) => l.category === 'macro');
    expect(macro.length).toBeGreaterThan(0);
    for (const lever of macro) {
      const words = BRIEFING_WORDS.calc.steps[lever.code];
      expect(words, lever.code).toBeDefined();
      expect(words?.up, lever.code).not.toBe(words?.down);
    }
  });

  it('cites only sources the registry holds, and quotes both published figures', () => {
    const figures = context.briefing;
    expect(figures).toBeDefined();
    const refs = figures ? [figures.averageHeadroom.source, figures.giltSales.source] : [];
    for (const ref of refs) expect(sourcesById.get(ref.sourceId), ref.sourceId).toBeDefined();
    expect(figures?.averageHeadroom.source.quote).toBeTruthy();
    expect(figures?.giltSales.source.quote).toBeTruthy();
  });

  it('fills a template, and leaves a placeholder it has no value for where a test will see it', () => {
    expect(fillIn(BRIEFING_WORDS.headroom.history, { since: '2010', average: '£29bn' })).toBe(
      'Since 2010, Chancellors have kept about £29bn on average.',
    );
    // Should a rebase ever leave the estimate below zero, the line says so rather than "breathing".
    expect(fillIn(BRIEFING_WORDS.headroom.shortfall, { estimate: '£2.0bn', year: '2029-30' })).toBe(
      'You start £2.0bn short of the rules in 2029-30.',
    );
    expect(fillIn('{estimate} of breathing space', {})).toBe('{estimate} of breathing space');
    expect(templateParts(BRIEFING_WORDS.headroom.figure)).toEqual([
      { text: 'You start with ' },
      { key: 'estimate' },
      { text: ' of breathing space in ' },
      { key: 'year' },
      { text: '.' },
    ]);
    // What the record means for this Budget, in the player's softer words (2026-09-30): no
    // figure, so nothing to fill.
    expect(templateParts(BRIEFING_WORDS.headroom.buffer)).toEqual([
      {
        text: 'This means this Budget will likely need to increase the headroom to build in a sensible buffer.',
      },
    ]);
  });
});
