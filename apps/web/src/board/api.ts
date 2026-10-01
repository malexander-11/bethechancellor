import { deviceCode } from './voter';

/** An entry as the server sends it (apps/server/src/board/store.ts). */
export interface Entry {
  id: string;
  title: string;
  query: string;
  ups: number;
  downs: number;
  score: number;
  createdAt: string;
}

export interface Counts {
  ups: number;
  downs: number;
  score: number;
}

/**
 * What the server answered: the body when it agreed, or why not. `closed` is a leaderboard with no
 * database yet; `down`, one that cannot be reached, which is also what a dropped connection is.
 */
export type Answer<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; error: string; reason?: string };

async function send<T>(path: string, init?: RequestInit): Promise<Answer<T>> {
  try {
    const response = await fetch(path, init);
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return { ok: true, status: response.status, body: body as T };
    return {
      ok: false,
      status: response.status,
      error: typeof body.error === 'string' ? body.error : 'down',
      ...(typeof body.reason === 'string' ? { reason: body.reason } : {}),
    };
  } catch {
    return { ok: false, status: 0, error: 'down' };
  }
}

/** A write: JSON, from this page, so the server knows it is the site's own. */
const write = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * The leaderboard's server (ADR-0044). Reading it carries nothing of the reader; only a vote or a
 * report sends this browser's code.
 */
export const leaderboard = {
  /** Whether the leaderboard is open: its database answers. */
  open: async () => {
    const answer = await send<{ db?: string }>('/api/health');
    return answer.ok && answer.body.db === 'ok';
  },
  list: (sort: 'top' | 'new', offset: number) =>
    send<{ entries: Entry[]; more: boolean }>(`/api/budgets?sort=${sort}&offset=${offset}`),
  entry: (id: string) => send<{ entry: Entry }>(`/api/budgets/${encodeURIComponent(id)}`),
  post: (query: string, title: string) =>
    send<{ entry: Entry; created: boolean }>('/api/budgets', write({ query, title })),
  vote: (id: string, value: 1 | -1 | 0) =>
    send<Counts>(
      `/api/budgets/${encodeURIComponent(id)}/vote`,
      write({ voter: deviceCode(), value }),
    ),
  report: (id: string) =>
    send<{ reported: boolean }>(
      `/api/budgets/${encodeURIComponent(id)}/report`,
      write({ voter: deviceCode() }),
    ),
};
