import { createHash, timingSafeEqual } from 'node:crypto';
import { readFinishedBudget, type ShippedDataset } from '@btc/engine';
import type { Route } from '../app.js';
import { json } from '../http.js';
import { SERVER_PATHS } from '../paths.js';
import type { Db } from './db.js';
import { hasher, networkOf } from './hash.js';
import { LIMITS, type Limits } from './limits.js';
import { DEVICE_CODE, readBody } from './requests.js';
import { migrate } from './schema.js';
import { boardStore, type BoardStore, type Entry, type VoteValue } from './store.js';
import { checkTitle } from './titles.js';

/** The leaderboard's side of the server (ADR-0044). */
export interface Board {
  /** The database, made when first needed; none until the owner connects one. */
  db: (() => Promise<Db>) | null;
  /** The key the leaderboard hashes devices and networks with. */
  hashKey: string;
  /** The owner's secret for moderating; without one there is no moderation by request. */
  adminToken?: string;
  limits?: Partial<Limits>;
}

/** Networks are forgotten after their month, checked at most this often by any one instance. */
const FORGET_EVERY_MS = 60 * 60 * 1000;

/** The leaderboard as the server serves it: its paths, and its entries for the pages that show one. */
export interface OpenBoard {
  routes: Route[];
  /** A visible entry, or none: missing, hidden, or the leaderboard closed or down. */
  entry: (id: string) => Promise<Entry | null>;
}

/**
 * The paths the leaderboard answers. Its link alone says what a Budget is: an entry keeps the link
 * written the one way every link to it is, and one Budget is one entry whatever its title. Without
 * a database the leaderboard is closed and says so; the rest of the server is unaffected.
 */
export function openBoard(data: ShippedDataset, board: Board): OpenBoard {
  const paths = [
    SERVER_PATHS.budgets,
    SERVER_PATHS.budget,
    SERVER_PATHS.vote,
    SERVER_PATHS.report,
  ] as const;
  const { db } = board;
  if (!db) {
    const closed: Route['handle'] = async () => json({ error: 'closed' }, 503);
    const owners = board.adminToken
      ? [SERVER_PATHS.adminBudgets, SERVER_PATHS.adminBudget, SERVER_PATHS.adminAction]
      : [];
    return {
      routes: [...paths, ...owners].flatMap((path) =>
        (['GET', 'POST', 'DELETE'] as const).map((method) => ({ method, path, handle: closed })),
      ),
      entry: async () => null,
    };
  }

  const hash = hasher(board.hashKey);
  const limits = { ...LIMITS, ...board.limits };
  let ready: Promise<BoardStore> | undefined;
  let forgotten = 0;
  /** The store, its database brought up to the schema on first use; tried afresh after a failure. */
  const store = (): Promise<BoardStore> => {
    ready ??= (async () => {
      const connected = await db();
      await migrate(connected);
      return boardStore(connected, limits);
    })().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
    return ready;
  };
  /**
   * After a write, now and then: forget the networks past their month. Its trouble is logged, never
   * the player's: the write it follows has been made.
   */
  const tidy = async (s: BoardStore) => {
    if (Date.now() - forgotten < FORGET_EVERY_MS) return;
    forgotten = Date.now();
    await s.forgetNetworks().catch((error: unknown) => {
      const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
      console.error('leaderboard forgetting networks:', said.slice(0, 300));
    });
  };
  /** A handler whose database trouble is said as such, without what the request carried. */
  const guarded =
    (name: string, handle: Route['handle']): Route['handle'] =>
    async (request, groups, context) => {
      try {
        return await handle(request, groups, context);
      } catch (error) {
        const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
        console.error(`leaderboard ${name}:`, said.slice(0, 300));
        return json({ error: 'down' }, 503);
      }
    };
  const network = (ip: string) => hash('network', networkOf(ip));
  const limited = () => json({ error: 'limit' }, 429, { 'retry-after': '3600' });

  const routes: Route[] = [
    {
      method: 'GET',
      path: SERVER_PATHS.budgets,
      handle: guarded('list', async (request) => {
        const url = new URL(request.url);
        const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'top';
        const offset = Math.min(Math.max(Number(url.searchParams.get('offset')) || 0, 0), 10_000);
        return json(await (await store()).list(sort, Math.floor(offset)));
      }),
    },
    {
      method: 'GET',
      path: SERVER_PATHS.budget,
      handle: guarded('entry', async (_request, [id = '']) => {
        const entry = await (await store()).get(id);
        return entry ? json({ entry }) : json({ error: 'missing' }, 404);
      }),
    },
    {
      method: 'POST',
      path: SERVER_PATHS.budgets,
      handle: guarded('post', async (request, _groups, { ip }) => {
        const read = await readBody(request);
        if ('refused' in read) return read.refused;
        const budget = readFinishedBudget(
          data,
          typeof read.body.query === 'string' ? read.body.query : '',
        );
        if (!budget) return json({ error: 'budget' }, 400);
        const checked = checkTitle(read.body.title);
        if ('problem' in checked) return json({ error: 'title', reason: checked.problem }, 422);
        const s = await store();
        const posted = await s.post({
          title: checked.title,
          query: budget.query,
          key: budgetKey(budget.query),
          network: network(ip),
        });
        if ('limited' in posted) return limited();
        if ('hidden' in posted) return json({ error: 'hidden' }, 409);
        await tidy(s);
        return json(posted, posted.created ? 201 : 200);
      }),
    },
    {
      method: 'POST',
      path: SERVER_PATHS.vote,
      handle: guarded('vote', async (request, [id = ''], { ip }) => {
        const read = await readBody(request);
        if ('refused' in read) return read.refused;
        const { voter, value } = read.body;
        if (typeof voter !== 'string' || !DEVICE_CODE.test(voter)) {
          return json({ error: 'voter' }, 400);
        }
        if (value !== 1 && value !== -1 && value !== 0) return json({ error: 'value' }, 400);
        const s = await store();
        const voted = await s.vote({
          id,
          voter: hash('device', voter),
          network: network(ip),
          value: value as VoteValue,
        });
        if ('missing' in voted) return json({ error: 'missing' }, 404);
        if ('limited' in voted) return limited();
        await tidy(s);
        return json(voted);
      }),
    },
    {
      method: 'POST',
      path: SERVER_PATHS.report,
      handle: guarded('report', async (request, [id = ''], { ip }) => {
        const read = await readBody(request);
        if ('refused' in read) return read.refused;
        const { voter } = read.body;
        if (typeof voter !== 'string' || !DEVICE_CODE.test(voter)) {
          return json({ error: 'voter' }, 400);
        }
        const s = await store();
        const reported = await s.report({
          id,
          reporter: hash('device', voter),
          network: network(ip),
        });
        if ('missing' in reported) return json({ error: 'missing' }, 404);
        if ('limited' in reported) return limited();
        await tidy(s);
        // Whether it is now hidden is the owner's business, not the reporter's.
        return json({ reported: true });
      }),
    },
  ];
  return {
    routes: board.adminToken
      ? [...routes, ...adminRoutes(board.adminToken, store, guarded)]
      : routes,
    entry: async (id) => {
      try {
        return await (await store()).get(id);
      } catch (error) {
        const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
        console.error('leaderboard entry:', said.slice(0, 300));
        return null;
      }
    },
  };
}

/**
 * The owner's moderation, by request with the secret token: what is hidden or reported, and
 * showing, hiding or deleting an entry. Without a token these paths do not exist.
 */
function adminRoutes(
  token: string,
  store: () => Promise<BoardStore>,
  guarded: (name: string, handle: Route['handle']) => Route['handle'],
): Route[] {
  const digest = (text: string) => createHash('sha256').update(text).digest();
  const owner = (request: Request) => {
    const given = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
    return timingSafeEqual(digest(given), digest(token));
  };
  const allowed = (name: string, handle: Route['handle']): Route['handle'] =>
    guarded(`admin ${name}`, async (request, groups, context) =>
      owner(request)
        ? handle(request, groups, context)
        : json({ error: 'owner' }, 401, { 'www-authenticate': 'Bearer' }),
    );
  const done = (found: boolean) => (found ? json({ done: true }) : json({ error: 'missing' }, 404));
  return [
    {
      method: 'GET',
      path: SERVER_PATHS.adminBudgets,
      handle: allowed('list', async (request) => {
        const url = new URL(request.url);
        const asked = url.searchParams.get('filter');
        const filter = asked === 'hidden' || asked === 'reported' ? asked : 'all';
        const offset = Math.min(Math.max(Number(url.searchParams.get('offset')) || 0, 0), 100_000);
        return json({ entries: await (await store()).admin.list(filter, Math.floor(offset)) });
      }),
    },
    {
      method: 'POST',
      path: SERVER_PATHS.adminAction,
      handle: allowed('action', async (_request, [id = '', action]) => {
        const s = await store();
        return done(action === 'show' ? await s.admin.show(id) : await s.admin.hide(id));
      }),
    },
    {
      method: 'DELETE',
      path: SERVER_PATHS.adminBudget,
      handle: allowed('delete', async (_request, [id = '']) =>
        done(await (await store()).admin.remove(id)),
      ),
    },
  ];
}

/**
 * What makes two links the same Budget: its choices and its priorities, without the codes of the
 * data and the economy it was read on, which change when the data does.
 */
export function budgetKey(query: string): string {
  const params = new URLSearchParams(query);
  return ['L', 'g'].map((key) => `${key}=${params.get(key) ?? ''}`).join('&');
}

/** How the leaderboard's database is, for /api/health: open, closed or down. */
export async function boardHealth(board: Board | undefined): Promise<'ok' | 'none' | 'down'> {
  if (!board?.db) return 'none';
  try {
    await (await board.db()).query('SELECT 1');
    return 'ok';
  } catch {
    return 'down';
  }
}
