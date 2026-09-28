import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_DIR, listJsonFiles } from './fixtures.js';

/**
 * Words from mechanisms the game no longer has (Phase 25). Phase 24 retired the seeded forecast
 * draw and its re-scoring (ADR-0025), so nothing a player can read may say that "the harsher
 * forecasts" mark a figure down: the engine counts every figure in full. The decision records keep
 * their history; the data and the methodology describe the game as it is.
 */
const RETIRED = [
  /\bharsher forecasts?\b/i,
  /\bharder forecast outcomes?\b/i,
  /\bforecast outcomes? (?:in this game|revise)/i,
  /\bthis game[’']s harsher\b/i,
];

describe('no words from retired mechanisms', () => {
  it('in the data a player reads', () => {
    const files = [
      ...listJsonFiles(path.join(DATA_DIR, 'journey')),
      ...listJsonFiles(path.join(DATA_DIR, 'levers')),
      ...listJsonFiles(path.join(DATA_DIR, 'context')),
    ];
    expect(files.length).toBeGreaterThan(100);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of RETIRED) {
        expect(pattern.test(text), `${path.relative(DATA_DIR, file)}: ${pattern}`).toBe(false);
      }
    }
  });

  it('in the methodology', () => {
    const text = readFileSync(path.join(DATA_DIR, '../docs/methodology.md'), 'utf8');
    for (const pattern of RETIRED) expect(pattern.test(text), String(pattern)).toBe(false);
  });
});
