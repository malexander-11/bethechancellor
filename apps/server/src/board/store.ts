import { randomBytes } from 'node:crypto';
import type { Db, Row } from './db.js';
import { NETWORK_DAYS, REPORTS_TO_HIDE, type Limits } from './limits.js';

/** An entry as the leaderboard shows it. */
export interface Entry {
  id: string;
  title: string;
  /** The Budget's link, as the server wrote it when the entry was posted. */
  query: string;
  ups: number;
  downs: number;
  score: number;
  createdAt: string;
}

/** An entry as the owner sees it, reports and all. */
export interface AdminEntry extends Entry {
  reports: number;
  hidden: boolean;
}

/** One device's vote: for, against, or none. */
export type VoteValue = 1 | -1 | 0;

/** The entries a page of the leaderboard holds. */
export const PAGE_SIZE = 20;

const ENTRY = 'id, title, query, ups, downs, score, created_at';

function entryOf(row: Row): Entry {
  return {
    id: String(row.id),
    title: String(row.title),
    query: String(row.query),
    ups: Number(row.ups),
    downs: Number(row.downs),
    score: Number(row.score),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  };
}

function adminEntryOf(row: Row): AdminEntry {
  return { ...entryOf(row), reports: Number(row.reports), hidden: Boolean(row.hidden) };
}

/** A new entry's address: eight characters, safe in a link. */
export function newEntryId(): string {
  return randomBytes(6).toString('base64url');
}

/**
 * The leaderboard's reads and writes (ADR-0044), each one statement or a few, every value a
 * parameter. Limits are counted in the database, per network, over the hour or the day before.
 */
export function boardStore(db: Db, limits: Limits) {
  return {
    async list(sort: 'top' | 'new', offset: number): Promise<{ entries: Entry[]; more: boolean }> {
      const order = sort === 'top' ? 'score DESC, created_at DESC, id' : 'created_at DESC, id';
      const rows = await db.query(
        `SELECT ${ENTRY} FROM budgets WHERE NOT hidden ORDER BY ${order} LIMIT $1 OFFSET $2`,
        [PAGE_SIZE + 1, offset],
      );
      return { entries: rows.slice(0, PAGE_SIZE).map(entryOf), more: rows.length > PAGE_SIZE };
    },

    async get(id: string): Promise<Entry | null> {
      const [row] = await db.query(`SELECT ${ENTRY} FROM budgets WHERE id = $1 AND NOT hidden`, [
        id,
      ]);
      return row ? entryOf(row) : null;
    },

    /**
     * A Budget put on the leaderboard under a title; the entry already there when the same Budget
     * was posted before, whatever its title.
     */
    async post(entry: {
      title: string;
      query: string;
      key: string;
      network: string;
    }): Promise<{ entry: Entry; created: boolean } | { hidden: true } | { limited: true }> {
      const [count] = await db.query(
        `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hour,
                count(*)::int AS day
           FROM budgets WHERE ip_hash = $1 AND created_at > now() - interval '1 day'`,
        [entry.network],
      );
      if (Number(count?.hour) >= limits.postsPerHour || Number(count?.day) >= limits.postsPerDay) {
        return { limited: true };
      }
      const [made] = await db.query(
        `INSERT INTO budgets (id, title, query, budget_key, ip_hash) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (budget_key) DO NOTHING RETURNING ${ENTRY}`,
        [newEntryId(), entry.title, entry.query, entry.key, entry.network],
      );
      if (made) return { entry: entryOf(made), created: true };
      const [there] = await db.query(`SELECT ${ENTRY}, hidden FROM budgets WHERE budget_key = $1`, [
        entry.key,
      ]);
      if (!there || there.hidden) return { hidden: true };
      return { entry: entryOf(there), created: false };
    },

    /** A device's vote on an entry, made, changed or taken back; the entry's counts after it. */
    async vote(v: {
      id: string;
      voter: string;
      network: string;
      value: VoteValue;
    }): Promise<
      | { ups: number; downs: number; score: number; mine: VoteValue }
      | { missing: true }
      | { limited: true }
    > {
      const [state] = await db.query(
        `SELECT
           EXISTS (SELECT 1 FROM budgets WHERE id = $2 AND NOT hidden) AS open,
           EXISTS (SELECT 1 FROM votes WHERE budget_id = $2 AND voter = $3) AS voted,
           (SELECT count(*)::int FROM votes
              WHERE ip_hash = $1 AND updated_at > now() - interval '1 hour') AS changes,
           (SELECT count(*)::int FROM votes
              WHERE ip_hash = $1 AND budget_id = $2 AND created_at > now() - interval '1 day') AS newcomers`,
        [v.network, v.id, v.voter],
      );
      if (!state?.open) return { missing: true };
      if (
        Number(state.changes) >= limits.voteChangesPerHour ||
        (!state.voted && v.value !== 0 && Number(state.newcomers) >= limits.newVotersPerEntryPerDay)
      ) {
        return { limited: true };
      }
      if (v.value === 0) {
        await db.query('DELETE FROM votes WHERE budget_id = $1 AND voter = $2', [v.id, v.voter]);
      } else {
        await db.query(
          `INSERT INTO votes (budget_id, voter, value, ip_hash) VALUES ($1, $2, $3, $4)
             ON CONFLICT (budget_id, voter) DO UPDATE
               SET value = EXCLUDED.value, ip_hash = EXCLUDED.ip_hash, updated_at = now()
               WHERE votes.value <> EXCLUDED.value`,
          [v.id, v.voter, v.value, v.network],
        );
      }
      const [counts] = await db.query('SELECT ups, downs, score FROM budgets WHERE id = $1', [
        v.id,
      ]);
      if (!counts) return { missing: true };
      return {
        ups: Number(counts.ups),
        downs: Number(counts.downs),
        score: Number(counts.score),
        mine: v.value,
      };
    },

    /**
     * A device's report of an entry's title, counted once a device and once a network; reports
     * from enough networks hide it until the owner looks.
     */
    async report(r: {
      id: string;
      reporter: string;
      network: string;
    }): Promise<{ hidden: boolean } | { missing: true } | { limited: true }> {
      const [count] = await db.query(
        `SELECT count(*)::int AS day FROM reports
           WHERE ip_hash = $1 AND created_at > now() - interval '1 day'`,
        [r.network],
      );
      if (Number(count?.day) >= limits.reportsPerDay) return { limited: true };
      const [after] = await db.query(
        `WITH added AS (
           INSERT INTO reports (budget_id, reporter, ip_hash)
             SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM budgets WHERE id = $1 AND NOT hidden)
             ON CONFLICT DO NOTHING RETURNING 1
         )
         UPDATE budgets
           SET reports = reports + (SELECT count(*)::int FROM added),
               hidden = hidden OR reports + (SELECT count(*)::int FROM added) >= $4
           WHERE id = $1 AND NOT hidden
           RETURNING hidden`,
        [r.id, r.reporter, r.network, REPORTS_TO_HIDE],
      );
      return after ? { hidden: Boolean(after.hidden) } : { missing: true };
    },

    /** What the owner sees and does. */
    admin: {
      async list(filter: 'hidden' | 'reported' | 'all', offset: number): Promise<AdminEntry[]> {
        const where =
          filter === 'hidden' ? 'WHERE hidden' : filter === 'reported' ? 'WHERE reports > 0' : '';
        const rows = await db.query(
          `SELECT ${ENTRY}, reports, hidden FROM budgets ${where}
             ORDER BY created_at DESC, id LIMIT 50 OFFSET $1`,
          [offset],
        );
        return rows.map(adminEntryOf);
      },
      /** Shown again with its count cleared: the reporters so far cannot hide it again. */
      async show(id: string): Promise<boolean> {
        const rows = await db.query(
          'UPDATE budgets SET hidden = false, reports = 0 WHERE id = $1 RETURNING id',
          [id],
        );
        return rows.length > 0;
      },
      async hide(id: string): Promise<boolean> {
        const rows = await db.query('UPDATE budgets SET hidden = true WHERE id = $1 RETURNING id', [
          id,
        ]);
        return rows.length > 0;
      },
      async remove(id: string): Promise<boolean> {
        const rows = await db.query('DELETE FROM budgets WHERE id = $1 RETURNING id', [id]);
        return rows.length > 0;
      },
    },

    /** Networks' hashes past their month, forgotten. */
    async forgetNetworks(): Promise<void> {
      const old = `now() - interval '${NETWORK_DAYS} days'`;
      await db.transaction([
        {
          text: `UPDATE budgets SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ${old}`,
        },
        {
          text: `UPDATE votes SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND updated_at < ${old}`,
        },
        {
          text: `UPDATE reports SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ${old}`,
        },
      ]);
    },
  };
}

export type BoardStore = ReturnType<typeof boardStore>;
