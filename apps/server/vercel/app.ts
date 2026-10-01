/**
 * The app function's entry (api/app.js re-exports the bundle `npm run build` makes from it). Its
 * data sits beside the bundle, written by the same build, and is read on the first request.
 */
import { readFileSync } from 'node:fs';
import type { ShippedDataset } from '@btc/engine';
import { clientIp, json, type Handler } from '../src/http.js';
import { createServer } from '../src/server.js';

let server: Handler | undefined;

function serverOnce(): Handler {
  server ??= createServer({
    data: JSON.parse(
      readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'),
    ) as ShippedDataset,
  });
  return server;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await serverOnce()(request, { ip: clientIp(request.headers) });
    } catch (error) {
      // The handlers refuse what a request sends before anything else can fail, so what reaches
      // here is the server's own trouble; it is logged without the request.
      const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
      console.error('server error:', said.slice(0, 300));
      return json({ error: 'server' }, 500);
    }
  },
};
