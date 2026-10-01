import {
  FINAL_STAGE,
  GAME_SETTINGS,
  encodePermalink,
  gameImplementationYear,
  readFinishedBudget,
} from '@btc/engine';
import { shippedDataset } from '@btc/pipeline/shipped';
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/board/db.js';
import { hashKeyFrom, hasher, networkOf } from '../src/board/hash.js';
import { LIMITS, REPORTS_TO_HIDE } from '../src/board/limits.js';
import { pgliteDb } from '../src/board/pglite.js';
import { BODY_MAX } from '../src/board/requests.js';
import { budgetKey, type Board } from '../src/board/routes.js';
import { migrate } from '../src/board/schema.js';
import { PAGE_SIZE, boardStore, type Entry } from '../src/board/store.js';
import { TITLE_MAX, checkTitle } from '../src/board/titles.js';
import { createServer } from '../src/server.js';

const data = shippedDataset();
const TOKEN = 'a-test-token-long-enough-to-moderate-with';
const DEVICE = (n: number) => `device-${String(n).padStart(12, '0')}`;
const IP = (n: number) => `203.0.113.${n}`;

/** A finished Budget's link, as the web writes one. */
function link(values: Record<string, number>, priorities: readonly string[] = []): string {
  return encodePermalink(
    {
      vintageCode: data.vintage.permalinkCode,
      rulesCode: data.rules.permalinkCode,
      implementationYear: gameImplementationYear(data.vintage),
      leverValues: values,
      ...GAME_SETTINGS,
      game: { reached: FINAL_STAGE, priorities: [...priorities] },
    },
    data.levers,
  );
}
const ids = data.pm.priorities.map((p) => p.id);
/** A different finished Budget for each n: one priority, or two. */
const budget = (n: number) =>
  link(
    { moj: 10 },
    n < ids.length ? [ids[n] ?? ''] : [ids[0] ?? '', ids[n - ids.length + 1] ?? ''],
  );

let db: Db;
beforeAll(async () => {
  db = await pgliteDb();
});
beforeEach(async () => {
  await migrate(db);
  await db.query('TRUNCATE budgets CASCADE');
});

function serverWith(board: Partial<Board> = {}) {
  return createServer({
    data,
    board: { db: async () => db, hashKey: 'test', adminToken: TOKEN, ...board },
  });
}

interface Ask {
  method?: string;
  body?: unknown;
  ip?: string;
  headers?: Record<string, string>;
}
function asker(server: ReturnType<typeof createServer>) {
  return (path: string, { method, body, ip = IP(1), headers = {} }: Ask = {}) =>
    server(
      new Request(`https://example.test${path}`, {
        method: method ?? (body === undefined ? 'GET' : 'POST'),
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined
          ? {}
          : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
      }),
      { ip },
    );
}

const server = serverWith();
const ask = asker(server);
const post = (query: string, title: string, ip = IP(1)) =>
  ask('/api/budgets', { body: { query, title }, ip });
const vote = (id: string, voter: string, value: number, ip = IP(1)) =>
  ask(`/api/budgets/${id}/vote`, { body: { voter, value }, ip });
const report = (id: string, voter: string, ip: string) =>
  ask(`/api/budgets/${id}/report`, { body: { voter }, ip });
const owner = { authorization: `Bearer ${TOKEN}` };

async function posted(query: string, title = 'A title', ip = IP(1)): Promise<Entry> {
  const answer = await post(query, title, ip);
  expect(answer.status, await answer.clone().text()).toBe(201);
  return ((await answer.json()) as { entry: Entry }).entry;
}
const listed = async (sort = 'top', offset = 0) =>
  (await (await ask(`/api/budgets?sort=${sort}&offset=${offset}`)).json()) as {
    entries: Entry[];
    more: boolean;
  };

describe('posting a Budget to the leaderboard', () => {
  it('keeps its title as shown and its link as every link to it is written', async () => {
    const query = budget(0);
    const entry = await posted(query, '  Defence   first​ ');
    expect(entry.title).toBe('Defence first');
    expect(entry.query).toBe(readFinishedBudget(data, query)?.query);
    expect(entry.id).toMatch(/^[A-Za-z0-9_-]{8}$/);
    expect({ ups: entry.ups, downs: entry.downs, score: entry.score }).toEqual({
      ups: 0,
      downs: 0,
      score: 0,
    });
    expect(
      ((await (await ask(`/api/budgets/${entry.id}`)).json()) as { entry: Entry }).entry,
    ).toEqual(entry);
    expect((await listed()).entries).toEqual([entry]);
  });

  it('keeps one entry a Budget: posting it again, however linked, finds the one there', async () => {
    const first = await posted(budget(0), 'First');
    const again = await post(link({ moj: 10.2 }, [ids[0] ?? '']), 'Second');
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ entry: first, created: false });
  });

  it('refuses a link that is not a finished Budget', async () => {
    for (const query of [link({ moj: 10 }).replace('st.5', 'st.3'), '', 'nonsense']) {
      const answer = await post(query, 'A title');
      expect(answer.status, query).toBe(400);
      expect(await answer.json()).toEqual({ error: 'budget' });
    }
    expect((await ask('/api/budgets', { body: { title: 'No link' } })).status).toBe(400);
  });

  it('refuses a title for what is wrong with it, and says what', async () => {
    const refused = {
      '': 'empty',
      ' ​‮ ': 'empty',
      ['x'.repeat(TITLE_MAX + 1)]: 'long',
      'Follow @someone': 'handle',
      'See www.example.org': 'link',
      'https://example.org': 'link',
      'mybudget.com': 'link',
      'Fuck the deficit': 'swearing',
      'f u c k it': 'swearing',
      '\u{1d41f}\u{1d42e}\u{1d41c}\u{1d424}': 'swearing',
      'Sh1t budget': 'swearing',
      'Tosser tax': 'swearing',
    };
    for (const [title, reason] of Object.entries(refused)) {
      const answer = await post(budget(1), title);
      expect(answer.status, title).toBe(422);
      expect(await answer.json(), title).toEqual({ error: 'title', reason });
    }
    expect((await listed()).entries).toEqual([]);
  });

  it('allows the places and the ordinary words a filter could mistake for swearing', () => {
    for (const title of [
      'Scunthorpe first',
      'A Budget for Penistone',
      'Essex, Sussex and Middlesex',
      'Tax assessment reform',
      'Cockermouth flood defences',
      'A trade deal with Pakistan',
      'Analysis of the class sizes',
      'Raise tax on the U.K. banks',
      'Prisons, courts & the NHS',
      'x'.repeat(TITLE_MAX),
    ]) {
      expect(checkTitle(title), title).toEqual({ title });
    }
  });

  it('lets one network post a few Budgets an hour, not a flood', async () => {
    for (let n = 0; n < LIMITS.postsPerHour; n += 1) await posted(budget(n), `Budget ${n}`, IP(9));
    const over = await post(budget(LIMITS.postsPerHour), 'One too many', IP(9));
    expect(over.status).toBe(429);
    expect(over.headers.get('retry-after')).toBeTruthy();
    // Another network is not held to the first's count.
    await posted(budget(LIMITS.postsPerHour), 'From elsewhere', IP(10));
  });
});

describe('the leaderboard’s order', () => {
  it('lists the best liked first, or the newest first', async () => {
    const a = await posted(budget(0), 'Older');
    const b = await posted(budget(1), 'Newer');
    await db.query(`UPDATE budgets SET created_at = now() - interval '1 minute' WHERE id = $1`, [
      a.id,
    ]);
    await vote(a.id, DEVICE(1), 1);
    await vote(a.id, DEVICE(2), 1, IP(2));
    await vote(b.id, DEVICE(1), 1);
    expect((await listed('top')).entries.map((e) => e.id)).toEqual([a.id, b.id]);
    expect((await listed('new')).entries.map((e) => e.id)).toEqual([b.id, a.id]);
  });

  it('comes a page at a time, saying whether there is more', async () => {
    await db.query(
      `INSERT INTO budgets (id, title, query, budget_key)
         SELECT lpad(n::text, 8, '0'), 'Entry ' || n, 'q', 'k' || n FROM generate_series(1, $1) n`,
      [PAGE_SIZE + 3],
    );
    const first = await listed('new');
    expect(first.entries).toHaveLength(PAGE_SIZE);
    expect(first.more).toBe(true);
    const second = await listed('new', PAGE_SIZE);
    expect(second.entries).toHaveLength(3);
    expect(second.more).toBe(false);
    expect(new Set([...first.entries, ...second.entries].map((e) => e.id)).size).toBe(
      PAGE_SIZE + 3,
    );
  });
});

describe('votes', () => {
  it('counts one vote a device, which it may change or take back', async () => {
    const { id } = await posted(budget(0));
    expect(await (await vote(id, DEVICE(1), 1)).json()).toEqual({
      ups: 1,
      downs: 0,
      score: 1,
      mine: 1,
    });
    expect(await (await vote(id, DEVICE(1), 1)).json()).toMatchObject({ ups: 1, downs: 0 });
    expect(await (await vote(id, DEVICE(1), -1)).json()).toEqual({
      ups: 0,
      downs: 1,
      score: -1,
      mine: -1,
    });
    expect(await (await vote(id, DEVICE(1), 0)).json()).toEqual({
      ups: 0,
      downs: 0,
      score: 0,
      mine: 0,
    });
    await vote(id, DEVICE(2), 1, IP(2));
    expect(await (await vote(id, DEVICE(3), 1, IP(3))).json()).toMatchObject({ ups: 2, score: 2 });
  });

  it('keeps the counts exact when fifty devices vote at once', async () => {
    const { id } = await posted(budget(0));
    await Promise.all(
      Array.from({ length: 50 }, (_, n) => vote(id, DEVICE(n), n % 2 === 0 ? 1 : -1, IP(n + 1))),
    );
    const [row] = await db.query('SELECT ups, downs, score FROM budgets WHERE id = $1', [id]);
    expect(row).toEqual({ ups: 25, downs: 25, score: 0 });
    const [counted] = await db.query(
      `SELECT count(*) FILTER (WHERE value = 1)::int AS ups, count(*) FILTER (WHERE value = -1)::int AS downs
         FROM votes WHERE budget_id = $1`,
      [id],
    );
    expect(counted).toEqual({ ups: 25, downs: 25 });
  });

  it('refuses a vote without a proper device code or value, and on no entry', async () => {
    const { id } = await posted(budget(0));
    expect((await vote(id, 'short', 1)).status).toBe(400);
    expect((await vote(id, DEVICE(1), 2)).status).toBe(400);
    expect((await vote('nothing1', DEVICE(1), 1)).status).toBe(404);
  });

  it('stops one network bringing more than its share of new devices to an entry in a day', async () => {
    const { id } = await posted(budget(0));
    for (let n = 0; n < LIMITS.newVotersPerEntryPerDay; n += 1) {
      expect((await vote(id, DEVICE(n), 1, IP(7))).status).toBe(200);
    }
    expect((await vote(id, DEVICE(999), 1, IP(7))).status).toBe(429);
    // A device that has voted may still change its mind.
    expect((await vote(id, DEVICE(0), -1, IP(7))).status).toBe(200);
  });

  it('keeps of a device and a network only their hashes', async () => {
    const { id } = await posted(budget(0), 'A title', '198.51.100.23');
    await vote(id, DEVICE(1), 1, '198.51.100.23');
    const stored = JSON.stringify([
      ...(await db.query('SELECT * FROM budgets')),
      ...(await db.query('SELECT * FROM votes')),
    ]);
    expect(stored).not.toContain('198.51.100.23');
    expect(stored).not.toContain(DEVICE(1));
  });
});

describe('reports', () => {
  it(`hides a title reported from ${REPORTS_TO_HIDE} networks until the owner shows it again`, async () => {
    const { id } = await posted(budget(0));
    // Two devices on one network count once.
    expect(await (await report(id, DEVICE(1), IP(1))).json()).toEqual({ reported: true });
    await report(id, DEVICE(2), IP(1));
    for (let n = 2; n <= REPORTS_TO_HIDE; n += 1) {
      expect((await ask(`/api/budgets/${id}`)).status).toBe(200);
      await report(id, DEVICE(n + 1), IP(n));
    }
    expect((await ask(`/api/budgets/${id}`)).status).toBe(404);
    expect((await listed()).entries).toEqual([]);
    // Posting it again does not bring it back.
    expect((await post(budget(0), 'Again')).status).toBe(409);

    const hidden = await ask('/api/admin/budgets?filter=hidden', { headers: owner });
    expect(
      ((await hidden.json()) as { entries: { id: string; reports: number }[] }).entries,
    ).toEqual([expect.objectContaining({ id, reports: REPORTS_TO_HIDE, hidden: true })]);
    expect(
      (await ask(`/api/admin/budgets/${id}/show`, { method: 'POST', headers: owner })).status,
    ).toBe(200);
    expect((await ask(`/api/budgets/${id}`)).status).toBe(200);
    // The same reporters cannot hide it again; a new one counts afresh.
    for (let n = 1; n <= REPORTS_TO_HIDE; n += 1) await report(id, DEVICE(n + 1), IP(n));
    expect((await ask(`/api/budgets/${id}`)).status).toBe(200);
    await report(id, DEVICE(50), IP(50));
    const [row] = await db.query('SELECT reports, hidden FROM budgets WHERE id = $1', [id]);
    expect(row).toEqual({ reports: 1, hidden: false });
  });
});

describe('the owner’s moderation', () => {
  it('does not exist without a token', async () => {
    const closed = asker(serverWith({ adminToken: undefined }));
    expect((await closed('/api/admin/budgets', { headers: owner })).status).toBe(404);
  });

  it('refuses anyone without the token', async () => {
    const { id } = await posted(budget(0));
    const strangers: Record<string, string>[] = [
      {},
      { authorization: 'Bearer wrong' },
      { authorization: TOKEN },
    ];
    for (const headers of strangers) {
      expect((await ask('/api/admin/budgets', { headers })).status).toBe(401);
      expect((await ask(`/api/admin/budgets/${id}`, { method: 'DELETE', headers })).status).toBe(
        401,
      );
    }
    expect((await ask(`/api/budgets/${id}`)).status).toBe(200);
  });

  it('hides, shows and deletes an entry, its votes with it', async () => {
    const { id } = await posted(budget(0));
    await vote(id, DEVICE(1), 1);
    const act = (path: string, method = 'POST') => ask(path, { method, headers: owner });
    expect((await act(`/api/admin/budgets/${id}/hide`)).status).toBe(200);
    expect((await listed()).entries).toEqual([]);
    expect((await act(`/api/admin/budgets/${id}/show`)).status).toBe(200);
    expect((await listed()).entries).toHaveLength(1);
    expect((await act(`/api/admin/budgets/${id}`, 'DELETE')).status).toBe(200);
    expect((await ask(`/api/budgets/${id}`)).status).toBe(404);
    expect(await db.query('SELECT * FROM votes')).toEqual([]);
    expect((await act(`/api/admin/budgets/${id}`, 'DELETE')).status).toBe(404);
  });
});

describe('what a write must be', () => {
  it('comes from this site’s pages, as JSON, and small', async () => {
    const body = JSON.stringify({ query: budget(0), title: 'A title' });
    const write = (headers: Record<string, string>, text = body) =>
      ask('/api/budgets', { body: text, headers });
    expect((await write({ origin: 'https://elsewhere.test' })).status).toBe(403);
    expect((await write({ 'content-type': 'text/plain' })).status).toBe(415);
    expect((await write({}, '{"query":')).status).toBe(400);
    expect((await write({}, '[1, 2]')).status).toBe(400);
    expect(
      (await write({}, JSON.stringify({ query: budget(0), title: 'x'.repeat(BODY_MAX) }))).status,
    ).toBe(413);
    expect((await write({ origin: 'https://example.test' })).status).toBe(201);
  });
});

describe('without its database', () => {
  it('is closed, and says so, while the rest of the server answers', async () => {
    const closed = asker(createServer({ data, board: { db: null, hashKey: 'test' } }));
    for (const [path, method] of [
      ['/api/budgets', 'GET'],
      ['/api/budgets', 'POST'],
      ['/api/budgets/abcd1234', 'GET'],
      ['/api/budgets/abcd1234/vote', 'POST'],
    ] as const) {
      const answer = await closed(path, { method });
      expect(answer.status, path).toBe(503);
      expect(await answer.json()).toEqual({ error: 'closed' });
    }
    expect(await (await closed('/api/health')).json()).toMatchObject({
      ok: true,
      db: 'none',
      admin: false,
    });
    // The owner's paths, with a token but no database, say the same.
    const owned = asker(
      createServer({ data, board: { db: null, hashKey: 'test', adminToken: TOKEN } }),
    );
    const listing = await owned('/api/admin/budgets', { headers: owner });
    expect(listing.status).toBe(503);
    expect(await listing.json()).toEqual({ error: 'closed' });
  });

  it('answers a write that was made, even when forgetting old networks then fails', async () => {
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    // The real database, but for forgetting networks, which fails.
    const forgetful: Db = {
      query: (text, params) => db.query(text, params),
      transaction: async (statements) => {
        if (statements.some((s) => s.text.includes('ip_hash = NULL'))) {
          throw new Error('forgetting failed');
        }
        return db.transaction(statements);
      },
    };
    const flaky = asker(serverWith({ db: async () => forgetful }));
    const answer = await flaky('/api/budgets', { body: { query: budget(0), title: 'Made' } });
    expect(answer.status).toBe(201);
    expect(JSON.stringify(said.mock.calls)).toContain('forgetting');
    said.mockRestore();
  });

  it('says the database is down when it cannot be reached, and logs nothing a player sent', async () => {
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    const down = asker(
      serverWith({
        db: async () => {
          throw new Error('connection refused');
        },
      }),
    );
    const answer = await down('/api/budgets', {
      body: { query: budget(0), title: 'A private title' },
    });
    expect(answer.status).toBe(503);
    expect(await answer.json()).toEqual({ error: 'down' });
    expect(await (await down('/api/health')).json()).toMatchObject({ db: 'down', admin: true });
    expect(JSON.stringify(said.mock.calls)).not.toMatch(/private title|203\.0\.113/);
    said.mockRestore();
  });
});

describe('what the leaderboard keeps, and for how long', () => {
  afterEach(() => vi.useRealTimers());

  it('forgets a network after a month', async () => {
    const { id } = await posted(budget(0));
    await vote(id, DEVICE(1), 1);
    await report(id, DEVICE(1), IP(1));
    await db.query(`UPDATE budgets SET created_at = now() - interval '31 days'`);
    await db.query(`UPDATE votes SET updated_at = now() - interval '31 days'`);
    await db.query(`UPDATE reports SET created_at = now() - interval '31 days'`);
    await boardStore(db, LIMITS).forgetNetworks();
    for (const table of ['budgets', 'votes', 'reports']) {
      expect(await db.query(`SELECT ip_hash FROM ${table}`), table).toEqual([{ ip_hash: null }]);
    }
  });

  it('can bring its schema up again without harm', async () => {
    await posted(budget(0));
    await migrate(db);
    expect((await listed()).entries).toHaveLength(1);
  });
});

describe('an entry’s page', () => {
  const SITE = readFileSync(new URL('../../web/index.html', import.meta.url), 'utf8');
  const withPages = asker(
    createServer({
      data,
      html: async () => SITE,
      board: { db: async () => db, hashKey: 'test', adminToken: TOKEN },
    }),
  );
  const tag = (html: string, key: string) =>
    new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(html)?.[1];

  it('previews the Budget’s picture under the player’s title, kept out of search engines', async () => {
    const entry = await posted(budget(0), 'Guns & "butter"');
    const page = await withPages(`/leaderboard/${entry.id}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('cache-control')).toMatch(/s-maxage=60\b/);
    const html = await page.text();
    expect(html).toContain('<title>Guns &amp; &quot;butter&quot; · What’s your Budget?</title>');
    expect(tag(html, 'og:image')?.replace(/&amp;/g, '&')).toBe(
      `https://example.test/api/card?${entry.query}`,
    );
    expect(tag(html, 'og:url')).toBe(`https://example.test/leaderboard/${entry.id}`);
    expect(tag(html, 'robots')).toBe('noindex');
  });

  it('previews the game, not a title, once the entry is taken down or the board is closed', async () => {
    const entry = await posted(budget(0), 'Soon gone');
    await ask(`/api/admin/budgets/${entry.id}/hide`, { method: 'POST', headers: owner });
    for (const html of [
      await (await withPages(`/leaderboard/${entry.id}`)).text(),
      await (
        await asker(
          createServer({ data, html: async () => SITE, board: { db: null, hashKey: 'test' } }),
        )(`/leaderboard/${entry.id}`)
      ).text(),
    ]) {
      expect(html).not.toContain('Soon gone');
      expect(tag(html, 'og:image')).toBe('https://example.test/api/card');
      expect(tag(html, 'robots')).toBe('noindex');
    }
  });
});

describe('devices, networks and Budgets, as the leaderboard tells them apart', () => {
  it('takes an IPv4 address whole and an IPv6 address by its first 64 bits', () => {
    expect(networkOf('203.0.113.7')).toBe('203.0.113.7');
    expect(networkOf('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(networkOf('2001:db8:1:2:3:4:5:6')).toBe(networkOf('2001:0db8:0001:0002::9'));
    expect(networkOf('2001:db8:1:2::9')).not.toBe(networkOf('2001:db8:1:3::9'));
    expect(networkOf('')).toBe('unknown');
    expect(networkOf('not an address')).toBe('unknown');
  });

  it('hashes with a key: the same thing alike, different things and keys apart', () => {
    const hash = hasher('one');
    expect(hash('device', 'abc')).toBe(hash('device', 'abc'));
    expect(hash('device', 'abc')).not.toBe(hash('network', 'abc'));
    expect(hash('device', 'abc')).not.toBe(hasher('two')('device', 'abc'));
    expect(hashKeyFrom({ HASH_SECRET: 's', DATABASE_URL: 'postgres://x' })).toBe('s');
    const derived = hashKeyFrom({ DATABASE_URL: 'postgres://user:secret@host/db' });
    expect(derived).not.toContain('secret');
    expect(derived).toBe(hashKeyFrom({ DATABASE_URL: 'postgres://user:secret@host/db' }));
  });

  it('knows a Budget by its choices and priorities, whatever data it was read on', () => {
    const query = readFinishedBudget(data, budget(0))?.query ?? '';
    const elsewhere = query.replace(/f=[^&]+/, 'f=older').replace(/M=[^&]+/, 'M=rate.1');
    expect(budgetKey(elsewhere)).toBe(budgetKey(query));
    expect(budgetKey(readFinishedBudget(data, budget(1))?.query ?? '')).not.toBe(budgetKey(query));
  });
});
