/**
 * The app function's entry (api/app.js re-exports the bundle `npm run build` makes from it). Its
 * data and the site's page sit beside the bundle, written by the same build; the leaderboard's
 * database and the owner's token come from the project's environment (README, "Run the
 * leaderboard").
 */
import { readFileSync } from 'node:fs';
import type { ShippedDataset } from '@btc/engine';
import { hashKeyFrom } from '../src/board/hash.js';
import { neonDb } from '../src/board/neon.js';
import { createServer } from '../src/server.js';
import { vercelFunction } from '../src/vercel.js';

const beside = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');

/** A token shorter than this is too easily guessed to moderate with, and is ignored. */
const TOKEN_MIN = 24;

export default vercelFunction(() => {
  const page = beside('index.html');
  const { DATABASE_URL, ADMIN_TOKEN } = process.env;
  return createServer({
    data: JSON.parse(beside('dataset.json')) as ShippedDataset,
    html: async () => page,
    board: {
      db: DATABASE_URL ? async () => neonDb(DATABASE_URL) : null,
      hashKey: hashKeyFrom(process.env),
      ...(ADMIN_TOKEN && ADMIN_TOKEN.length >= TOKEN_MIN ? { adminToken: ADMIN_TOKEN } : {}),
    },
  });
});
