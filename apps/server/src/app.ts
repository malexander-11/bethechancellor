import { json, type Context, type Handler } from './http.js';

export type Method = 'GET' | 'POST' | 'DELETE';

/** One thing the server answers: a method, a path, and what it does. */
export interface Route {
  method: Method;
  /** Matched against the whole path; its groups are handed on. */
  path: RegExp;
  handle: (request: Request, groups: readonly string[], context: Context) => Promise<Response>;
}

/**
 * A small router: the first route whose path and method match answers. A path the server knows
 * asked with the wrong method is told which methods it takes; any other path is missing. A HEAD
 * is answered as a GET without the body.
 */
export function createApp(routes: readonly Route[]): Handler {
  return async (request, context) => {
    const { pathname } = new URL(request.url);
    const head = request.method === 'HEAD';
    const method = head ? 'GET' : request.method;
    const onPath = routes.filter((r) => r.path.test(pathname));
    if (onPath.length === 0) return json({ error: 'missing' }, 404);
    const route = onPath.find((r) => r.method === method);
    if (!route) {
      return json({ error: 'method' }, 405, {
        allow: [...new Set(onPath.map((r) => r.method))].join(', '),
      });
    }
    const groups = pathname.match(route.path)?.slice(1) ?? [];
    const response = await route.handle(request, groups, context);
    return head
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  };
}
