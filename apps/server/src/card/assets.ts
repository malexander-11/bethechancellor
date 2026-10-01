import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * What the picture is drawn with, by the name each takes beside the bundle: resvg's WebAssembly,
 * and the site's two typefaces as static WOFF, since satori reads no WOFF2 and no variable font.
 */
export const CARD_FILES = {
  'resvg.wasm': ['@resvg/resvg-wasm', 'index_bg.wasm'],
  'fraunces-600.woff': ['@fontsource/fraunces', 'files/fraunces-latin-600-normal.woff'],
  'source-serif-400.woff': [
    '@fontsource/source-serif-4',
    'files/source-serif-4-latin-400-normal.woff',
  ],
  'source-serif-600.woff': [
    '@fontsource/source-serif-4',
    'files/source-serif-4-latin-600-normal.woff',
  ],
} as const;

export type CardFile = keyof typeof CARD_FILES;

/**
 * Where each file sits in the installed packages, found from the package's entry so that no
 * package's exports map stands in the way: the build copies them from here, and the dev server
 * and the tests read them here.
 */
export function cardAssetFiles(): Record<CardFile, string> {
  const require = createRequire(import.meta.url);
  const at = (pkg: string, file: string) => path.join(path.dirname(require.resolve(pkg)), file);
  return {
    'resvg.wasm': require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
    'fraunces-600.woff': at(...CARD_FILES['fraunces-600.woff']),
    'source-serif-400.woff': at(...CARD_FILES['source-serif-400.woff']),
    'source-serif-600.woff': at(...CARD_FILES['source-serif-600.woff']),
  };
}

export type CardAssets = Record<CardFile, Uint8Array>;

/** The files read, from wherever they sit. */
export function readCardAssets(where: (file: CardFile) => string | URL): CardAssets {
  const read = (file: CardFile) => new Uint8Array(readFileSync(where(file)));
  return {
    'resvg.wasm': read('resvg.wasm'),
    'fraunces-600.woff': read('fraunces-600.woff'),
    'source-serif-400.woff': read('source-serif-400.woff'),
    'source-serif-600.woff': read('source-serif-600.woff'),
  };
}
