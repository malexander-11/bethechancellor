import { plainText, segments } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import { context, glossary, levers, sourcesById } from '../data';
import {
  BRIEFING_SOURCES,
  BRIEFING_WORDS,
  briefingTemplates,
  fillIn,
  templateParts,
} from './briefingWords';

describe('the briefing’s words (Phase 28, ADR-0030)', () => {
  it('marks only words the glossary defines, and headroom once', () => {
    const ids = briefingTemplates().flatMap((t) =>
      segments(t).flatMap((s) => (s.kind === 'term' ? [s.id] : [])),
    );
    for (const id of ids) expect(glossary.terms[id], id).toBeDefined();
    expect(ids).toEqual(expect.arrayContaining(['fiscal-rules', 'obr', 'headroom', 'gilts']));
    // One Headroom a player can tap on the page: the line that says what it is.
    expect(ids.filter((id) => id === 'headroom')).toHaveLength(1);
  });

  it('types no figure: every sum, rate and year is filled from the data or the engine', () => {
    // The one exception: the Resolution Foundation's July figure, a quotation dated where it is given.
    const typed = briefingTemplates().filter((t) => t !== BRIEFING_WORDS.forecasts.others);
    expect(typed.length).toBeGreaterThan(20);
    for (const t of typed) expect(plainText(t), t).not.toMatch(/\d/);
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
    const refs = [
      ...Object.values(BRIEFING_SOURCES).flat(),
      ...(figures ? [figures.averageHeadroom.source, figures.giltSales.source] : []),
    ];
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
    // What reaching the record would take is filled from the two figures, never typed.
    expect(fillIn(BRIEFING_WORDS.headroom.buffer, { gap: '£22bn' })).toBe(
      'This means this Budget will need to find around £22bn to build in a sensible buffer.',
    );
  });
});
