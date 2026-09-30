import type { Lever } from '@btc/engine';
import type { LoadedDataset } from './dataset.js';

/** A lever the game offers: reviewed and not retired. The others stay in data/ for the record. */
export function isLive(lever: Lever): boolean {
  return lever.status === 'reviewed' && !lever.deprecated;
}

/**
 * What the game runs on: the data set with only the levers it offers. Anything the game holds that
 * names a retired lever would break a screen, so this view is validated as well as the whole set.
 */
export function liveView(ds: LoadedDataset): LoadedDataset {
  return { ...ds, levers: ds.levers.filter(isLive) };
}
