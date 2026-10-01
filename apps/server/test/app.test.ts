import { describe, expect, it } from 'vitest';
import { shippedDataset } from '@btc/pipeline/shipped';
import { createApp } from '../src/app.js';
import { clientIp, json } from '../src/http.js';
import { createServer } from '../src/server.js';

const ask = (handler: ReturnType<typeof createApp>, path: string, method = 'GET') =>
  handler(new Request(`http://localhost${path}`, { method }), { ip: '' });

describe('the router', () => {
  const app = createApp([
    { method: 'GET', path: /^\/things\/(\w+)$/, handle: async (_r, [id]) => json({ id }) },
    { method: 'POST', path: /^\/things\/(\w+)$/, handle: async () => json({ made: true }, 201) },
  ]);

  it('answers with the route the path and method match, handing on the path’s groups', async () => {
    const got = await ask(app, '/things/abc');
    expect(got.status).toBe(200);
    expect(await got.json()).toEqual({ id: 'abc' });
    expect((await ask(app, '/things/abc', 'POST')).status).toBe(201);
  });

  it('says which methods a known path takes, and that any other path is missing', async () => {
    const wrong = await ask(app, '/things/abc', 'DELETE');
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get('allow')).toBe('GET, POST');
    expect((await ask(app, '/other')).status).toBe(404);
  });

  it('answers a HEAD as the GET, without the body', async () => {
    const head = await ask(app, '/things/abc', 'HEAD');
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('keeps every answer it writes out of shared caches', async () => {
    expect(json({}).headers.get('cache-control')).toBe('no-store');
  });

  it('takes the address the platform reports, else the first forwarded one', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.2, 10.0.0.1' }))).toBe(
      '198.51.100.2',
    );
    expect(clientIp(new Headers())).toBe('');
  });
});

describe('the server', () => {
  const data = shippedDataset();
  const server = createServer({ data });

  it('says it is up and which data it serves', async () => {
    const health = await ask(server, '/api/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, data: data.vintage.permalinkCode });
  });
});
