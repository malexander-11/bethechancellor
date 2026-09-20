import { describe, expect, it } from 'vitest';
import { ministerFor, ministerLine } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const lever = (code: string) => {
  const l = ds.levers.find((x) => x.code === code);
  if (!l) throw new Error(`no lever ${code}`);
  return l;
};

describe('ministers on the folders', () => {
  it('gives every spending and welfare lever a role to speak for it', () => {
    for (const l of ds.levers) {
      if (l.deprecated || (l.category !== 'spend' && l.category !== 'welfare')) continue;
      expect(ministerFor(l.code, ds.ministers), `${l.code} has no minister`).toBeDefined();
    }
  });

  it('asks while the lever is untouched, and changes its tune as it moves', () => {
    const dfe = lever('dfe');
    const minister = ministerFor('dfe', ds.ministers)!;
    expect(ministerLine(minister, dfe, 0).mood).toBe('asking');
    expect(ministerLine(minister, dfe, 0).line.text).toMatch(/718,838/);
    const cut = ministerLine(minister, dfe, -1);
    expect(cut.mood).toBe('cut');
    expect(cut.line.text).toMatch(/classroom/);
    // A deeper cut has its own, harsher band, read before the general one.
    const deep = ministerLine(minister, dfe, -5);
    expect(deep.mood).toBe('cut');
    expect(deep.line.text).toMatch(/£4\.3 to £4\.9 billion/);
    expect(ministerLine(minister, dfe, 2).mood).toBe('raised');
    expect(ministerLine(minister, dfe, 5).line.text).toMatch(/special needs settlement/);
  });

  it('treats a toggle switched on as the move it is', () => {
    const rv2ch = lever('rv2ch');
    const minister = ministerFor('rv2ch', ds.ministers)!;
    expect(ministerLine(minister, rv2ch, 0).mood).toBe('asking');
    const on = ministerLine(minister, rv2ch, 1);
    expect(on.mood).toBe('raised');
    expect(on.line.text).toMatch(/450,000 children/);
  });

  it('never invents a number: every line is simulated and every figure it quotes is sourced', () => {
    for (const m of ds.ministers.ministers) {
      const lines = [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)];
      for (const line of lines) {
        expect(line.badge).toBe('simulated');
        for (const text of [line.text, line.short]) {
          if (text !== undefined && /[£%]|\d{2,}/.test(text)) {
            expect(
              line.sources.length,
              `${m.code}: "${text}" quotes a figure without a source`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
