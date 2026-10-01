import type { Db } from './db.js';

/** Any number, the same in every instance: who holds it may change the schema. */
const SCHEMA_LOCK = 4_400_442;

/**
 * The leaderboard's tables (ADR-0044). An entry keeps its title and its link, never figures, and
 * each Budget appears once (`budget_key`). Votes and reports are keyed on a device's hashed code;
 * reports also on a network's, so three reports must come from three networks. A trigger keeps an
 * entry's counts in step with its votes. Each statement can run again harmlessly.
 */
export const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS budgets (
    id text PRIMARY KEY,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
    query text NOT NULL,
    budget_key text NOT NULL UNIQUE,
    ups integer NOT NULL DEFAULT 0,
    downs integer NOT NULL DEFAULT 0,
    score integer GENERATED ALWAYS AS (ups - downs) STORED,
    reports integer NOT NULL DEFAULT 0,
    hidden boolean NOT NULL DEFAULT false,
    ip_hash text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS budgets_top ON budgets (score DESC, created_at DESC) WHERE NOT hidden`,
  `CREATE INDEX IF NOT EXISTS budgets_new ON budgets (created_at DESC) WHERE NOT hidden`,
  `CREATE INDEX IF NOT EXISTS budgets_network ON budgets (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS votes (
    budget_id text NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
    voter text NOT NULL,
    value smallint NOT NULL CHECK (value IN (-1, 1)),
    ip_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (budget_id, voter)
  )`,
  `CREATE INDEX IF NOT EXISTS votes_network ON votes (ip_hash, updated_at)`,
  `CREATE TABLE IF NOT EXISTS reports (
    budget_id text NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
    reporter text NOT NULL,
    ip_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (budget_id, reporter),
    UNIQUE (budget_id, ip_hash)
  )`,
  `CREATE INDEX IF NOT EXISTS reports_network ON reports (ip_hash, created_at)`,
  `CREATE OR REPLACE FUNCTION budgets_count_votes() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      UPDATE budgets SET ups = ups - (OLD.value = 1)::int, downs = downs - (OLD.value = -1)::int
        WHERE id = OLD.budget_id;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      UPDATE budgets SET ups = ups + (NEW.value = 1)::int, downs = downs + (NEW.value = -1)::int
        WHERE id = NEW.budget_id;
    END IF;
    RETURN NULL;
  END $$`,
  `CREATE OR REPLACE TRIGGER votes_count AFTER INSERT OR UPDATE OF value OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION budgets_count_votes()`,
];

/**
 * Brings the database up to the schema, under a lock, so two instances starting at once cannot
 * trip over each other.
 */
export async function migrate(db: Db): Promise<void> {
  await db.transaction([
    { text: 'SELECT pg_advisory_xact_lock($1)', params: [SCHEMA_LOCK] },
    ...SCHEMA.map((text) => ({ text })),
  ]);
}
