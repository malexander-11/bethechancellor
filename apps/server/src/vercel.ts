import { clientIp, json, type Handler } from './http.js';

/**
 * A server as a Vercel function: Vercel calls `fetch` with the web's own Request. The server is
 * made on the first request, from files beside the bundle.
 */
export function vercelFunction(make: () => Handler): {
  fetch: (request: Request) => Promise<Response>;
} {
  let server: Handler | undefined;
  return {
    async fetch(request) {
      try {
        server ??= make();
        return await server(request, { ip: clientIp(request.headers) });
      } catch (error) {
        // The handlers refuse what a request sends before anything else can fail, so what reaches
        // here is the server's own trouble; it is logged without the request.
        const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
        console.error('server error:', said.slice(0, 300));
        return json({ error: 'server' }, 500);
      }
    },
  };
}
