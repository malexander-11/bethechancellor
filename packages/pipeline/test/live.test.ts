import { finetuneItems, validateDataset } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../src/lib/dataset.js';
import { isLive, liveView } from '../src/lib/live.js';

describe('the game as shipped (2026-09-30)', () => {
  const ds = loadDataset();

  it('offers only reviewed levers that are not retired, and holds together on its own', () => {
    const live = liveView(ds);
    expect(live.levers.length).toBeGreaterThan(0);
    expect(live.levers.every(isLive)).toBe(true);
    expect(ds.levers.filter((l) => !isLive(l)).length).toBeGreaterThan(0);
    expect(validateDataset(live)).toEqual([]);
  });

  it('is caught when something the game holds names a retired lever', () => {
    // Retire a lever the fine-tuning screens offer: the whole set still holds it, the game does not.
    const offered = finetuneItems(ds.finetune, 'tax')[0]?.code;
    expect(offered).toBeDefined();
    const retired = {
      ...ds,
      levers: ds.levers.map((l) => (l.code === offered ? { ...l, deprecated: true } : l)),
    };
    const whole = new Set(validateDataset(retired));
    const shipped = validateDataset(liveView(retired)).filter((p) => !whole.has(p));
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped.join('\n')).toContain(offered);
  });
});
