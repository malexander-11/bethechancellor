/**
 * The server's handlers are the web's own: a Request in, a Response out. Vercel calls them as
 * they are (ADR-0044); the Vite plugin adapts Node's to them for the dev server and the preview.
 */
export interface Context {
  /** The address the request came from, as the platform reports it; empty when unknown. */
  ip: string;
}

export type Handler = (request: Request, context: Context) => Promise<Response>;

/** Answers the browser asks for and nothing between may keep. */
export const NO_STORE = 'no-store';

export function json(
  body: unknown,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': NO_STORE,
      ...headers,
    },
  });
}

/**
 * Where a request came from: the platform's own header, else the first of the forwarded ones.
 * Vercel sets both and overwrites what a client sends.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
}
