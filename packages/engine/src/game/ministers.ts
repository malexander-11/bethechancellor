import type { Lever, Minister, MinisterBand, MinistersFile, SimulatedLine } from '../types/data.js';

/**
 * Ministers on the folders. Each spending lever has a role who speaks for it: what they are
 * asking for while the lever is untouched, what stops happening at a cut, the case they made for
 * more. The line is a game judgement and wears the badge; the fact inside it carries its source.
 * Nothing here produces a number: the bands are read against the lever's value, that is all.
 */

export type MinisterMood = 'asking' | 'cut' | 'raised';

export interface MinisterSay {
  minister: Minister;
  mood: MinisterMood;
  line: SimulatedLine;
}

export function ministerFor(code: string, ministers: MinistersFile): Minister | undefined {
  return ministers.ministers.find((m) => m.code === code);
}

function applies(band: MinisterBand, value: number): boolean {
  const { above, below } = band.appliesWhen;
  if (above !== undefined && !(value > above)) return false;
  if (below !== undefined && !(value < below)) return false;
  return true;
}

/**
 * What the minister says at this setting. At the default they ask; below it the first `whenCut`
 * band that applies speaks, above it the first `whenRaised` band. A move with no band to meet it
 * falls back to the ask, so a lever never goes silent.
 */
export function ministerLine(minister: Minister, lever: Lever, value: number): MinisterSay {
  const base = lever.control.default;
  if (value === base) return { minister, mood: 'asking', line: minister.asking };
  const bands = value < base ? minister.whenCut : minister.whenRaised;
  const band = bands.find((b) => applies(b, value));
  if (!band) return { minister, mood: 'asking', line: minister.asking };
  return { minister, mood: value < base ? 'cut' : 'raised', line: band.line };
}
