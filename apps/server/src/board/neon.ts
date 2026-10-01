import { neon } from '@neondatabase/serverless';
import type { Db, Row } from './db.js';

/**
 * Neon's database over HTTP: a request a statement, no connection to keep open, which suits a
 * function that may be started afresh for any request. The address is Vercel's `DATABASE_URL`.
 */
export function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    query: async (text, params = []) => (await sql.query(text, [...params])) as Row[],
    transaction: async (statements) =>
      (await sql.transaction(
        statements.map((s) => sql.query(s.text, [...(s.params ?? [])])),
      )) as Row[][],
  };
}
