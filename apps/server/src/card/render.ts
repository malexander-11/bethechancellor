import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';
import type { CardAssets } from './assets.js';
import { CARD_HEIGHT, CARD_WIDTH, type CardElement } from './layout.js';

/** resvg's WebAssembly can be started once in a process, however many renderers ask. */
let started: Promise<void> | undefined;

/** A picture drawn: its PNG, and its pixels as RGBA, row by row. */
export interface Drawn {
  png: Uint8Array;
  width: number;
  height: number;
  pixels: Uint8Array;
}

/**
 * Draws a picture: satori lays it out and turns its words into outlines in the site's typefaces,
 * and resvg draws the result.
 */
export function createDrawing(assets: CardAssets): (card: CardElement) => Promise<Drawn> {
  const fonts = (
    [
      { name: 'Fraunces', file: 'fraunces-600.woff', weight: 600 },
      { name: 'Source Serif 4', file: 'source-serif-400.woff', weight: 400 },
      { name: 'Source Serif 4', file: 'source-serif-600.woff', weight: 600 },
    ] as const
  ).map((f) => ({
    name: f.name,
    data: Buffer.from(assets[f.file]),
    weight: f.weight,
    style: 'normal' as const,
  }));
  return async (card) => {
    started ??= initWasm(assets['resvg.wasm']);
    await started;
    const svg = await satori(card as Parameters<typeof satori>[0], {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts,
    });
    const image = new Resvg(svg, { fitTo: { mode: 'original' } }).render();
    return { png: image.asPng(), width: image.width, height: image.height, pixels: image.pixels };
  };
}

export type RenderCard = (card: CardElement) => Promise<Uint8Array>;

/** Draws a picture as a PNG. */
export function createRenderer(assets: CardAssets): RenderCard {
  const draw = createDrawing(assets);
  return async (card) => (await draw(card)).png;
}
