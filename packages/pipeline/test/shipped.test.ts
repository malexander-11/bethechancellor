import { describe, expect, it } from 'vitest';
import { isLive } from '../src/lib/live.js';
import { shippedDataset } from '../src/lib/shipped.js';

/** Every object in a value, however deep. */
function* objects(value: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(value)) {
    for (const item of value) yield* objects(item);
  } else if (value !== null && typeof value === 'object') {
    yield value as Record<string, unknown>;
    for (const item of Object.values(value)) yield* objects(item);
  }
}

describe('the data the game ships', () => {
  const shipped = shippedDataset();

  it('offers only the levers the game offers, each without what only the pipeline reads', () => {
    expect(shipped.levers.length).toBeGreaterThan(0);
    for (const lever of shipped.levers) {
      expect(isLive(lever), lever.code).toBe(true);
      expect(lever.costing, lever.code).not.toHaveProperty('rawSource');
      expect(lever.costing, lever.code).not.toHaveProperty('baselinePolicy');
      if (lever.headline) expect(lever, lever.code).not.toHaveProperty('description');
    }
  });

  it('keeps no passage quoted from a source, and no source file details', () => {
    for (const object of objects(shipped)) {
      if ('sourceId' in object) expect(object).not.toHaveProperty('quote');
    }
    // A source is what the About page lists: its hash, file and notes serve the pipeline.
    const listed = new Set(['id', 'org', 'title', 'edition', 'url', 'landingUrl', 'retrievedOn']);
    for (const source of shipped.sources.sources) {
      expect(Object.keys(source).filter((key) => !listed.has(key))).toEqual([]);
    }
  });
});
