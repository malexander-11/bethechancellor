import { describe, expect, it } from 'vitest';
import {
  GUIDED_STEPS,
  STEP_COUNT,
  guideFor,
  plainText,
  segments,
  stageTerms,
  validateDataset,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const FIGURE = /£\d|\d{3},\d{3}|\d+%|\d+bn/;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('the guide and the glossary', () => {
  it('has an entry for every screen, numbered one to six in the order they are met', () => {
    const numbers = GUIDED_STEPS.map((step) => guideFor(ds.guide, step)?.number);
    expect(numbers.every((n) => n !== undefined)).toBe(true);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(6);
    expect(STEP_COUNT).toBe(6);
    for (let i = 1; i < numbers.length; i += 1) {
      expect(numbers[i]!).toBeGreaterThanOrEqual(numbers[i - 1]!);
    }
    // The old step names still find their screen.
    expect(guideFor(ds.guide, 'assumptions')?.step).toBe('outlook');
    // Step 4 is fine-tuning: every lever is a policy there, and the desk has gone (Phase 26).
    expect(guideFor(ds.guide, 'finetune')?.number).toBe(4);
    expect(ds.guide.stages.map((s) => s.title)).not.toContain('Build the package');
    expect(guideFor(ds.guide, 'review')?.title).toBe('Deliver your Budget');
    expect(validateDataset(ds).filter((p) => /guide|glossary/.test(p))).toEqual([]);
  });

  it('says what to do now in one short line, and quotes no figure in it', () => {
    for (const stage of ds.guide.stages) {
      const line = plainText(stage.now);
      const n = words(line);
      expect(n, `${stage.step}: "${stage.now}" runs to ${n} words`).toBeLessThanOrEqual(20);
      // The guide carries no sources, so it may quote no figure at all.
      expect(FIGURE.test(line), `${stage.step}: "${stage.now}" quotes a figure`).toBe(false);
    }
  });

  it('brackets only words the glossary defines, and defines them in words, not figures', () => {
    for (const stage of ds.guide.stages) {
      for (const id of stageTerms(stage)) {
        expect(ds.glossary.terms[id], `${stage.step} refers to unknown term ${id}`).toBeDefined();
      }
    }
    for (const [id, term] of Object.entries(ds.glossary.terms)) {
      if (FIGURE.test(term.short)) {
        expect(term.sources.length, `${id} quotes a figure without a source`).toBeGreaterThan(0);
      }
    }
  });

  it('reads a bracketed term as a glossary reference, with or without an explicit id', () => {
    expect(segments('Keep some [headroom] for [the OBR](obr).')).toEqual([
      { kind: 'text', text: 'Keep some ' },
      { kind: 'term', text: 'headroom', id: 'headroom' },
      { kind: 'text', text: ' for ' },
      { kind: 'term', text: 'the OBR', id: 'obr' },
      { kind: 'text', text: '.' },
    ]);
    expect(segments('[Fiscal rules] first')[0]).toEqual({
      kind: 'term',
      text: 'Fiscal rules',
      id: 'fiscal-rules',
    });
    expect(plainText('a [b](c) d')).toBe('a b d');
  });
});
