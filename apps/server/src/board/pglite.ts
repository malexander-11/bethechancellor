import { PGlite } from '@electric-sql/pglite';
import type { Db, Row } from './db.js';

/**
 * Postgres in memory, for the tests, `npm run dev` and the preview: the same SQL as production,
 * forgotten when the process ends. Never bundled for Vercel.
 */
export async function pgliteDb(): Promise<Db> {
  const pg = await PGlite.create();
  return {
    query: async (text, params = []) => (await pg.query<Row>(text, [...params])).rows,
    transaction: (statements) =>
      pg.transaction(async (tx) => {
        const results: Row[][] = [];
        for (const s of statements) {
          results.push((await tx.query<Row>(s.text, [...(s.params ?? [])])).rows);
        }
        return results;
      }),
  };
}
