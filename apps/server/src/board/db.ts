/**
 * The leaderboard's database (ADR-0044), as the server uses it: one parameterised statement at a
 * time, or several as one transaction. Neon's driver over HTTP in production (`neon.ts`); PGlite,
 * Postgres compiled to WebAssembly, in the tests, `npm run dev` and the preview (`pglite.ts`).
 */
export type Row = Record<string, unknown>;

export interface Statement {
  text: string;
  params?: readonly unknown[];
}

export interface Db {
  query: (text: string, params?: readonly unknown[]) => Promise<Row[]>;
  /** The statements in order as one transaction: all of them, or none. */
  transaction: (statements: readonly Statement[]) => Promise<Row[][]>;
}
