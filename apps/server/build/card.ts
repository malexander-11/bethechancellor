/**
 * `npm run card -w @btc/server -- "<a Budget's link>" out.png`: draw the picture for a link, to look
 * at while working on it. With no link, the game's own picture.
 */
import { writeFileSync } from 'node:fs';
import { gameOutcomeOf, readFinishedBudget, summariseBudget } from '@btc/engine';
import { shippedDataset } from '@btc/pipeline/shipped';
import { cardAssetFiles, readCardAssets } from '../src/card/assets.js';
import { cardLayout } from '../src/card/layout.js';
import { createRenderer } from '../src/card/render.js';

const [link = '', out = 'card.png'] = process.argv.slice(2);
const data = shippedDataset();
const files = cardAssetFiles();
const render = createRenderer(readCardAssets((file) => files[file]));
const budget = readFinishedBudget(data, link.includes('?') ? link.slice(link.indexOf('?')) : link);
const summary = budget ? summariseBudget(data, budget, gameOutcomeOf(data)) : null;
writeFileSync(out, await render(cardLayout(summary, 'bethechancellor-web.vercel.app')));
console.log(`${out}: ${summary ? 'a finished Budget' : 'the game’s own picture'}`);
