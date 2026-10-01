import { json } from '../http.js';

/** The most a write's body may hold: a title and a link, with room to spare. */
export const BODY_MAX = 4 * 1024;

/** A device's code, as the browser makes it: random, and long enough not to be guessed. */
export const DEVICE_CODE = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Whether a write comes from the site's own pages. A browser names the page a request comes from;
 * one from another site is refused, since nothing else stops a page elsewhere voting for its
 * reader. A request that names none comes from no browser's page.
 */
export function fromThisSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** A write's body: JSON, an object, and small; otherwise the answer that refuses it. */
export async function readBody(
  request: Request,
): Promise<{ body: Record<string, unknown> } | { refused: Response }> {
  if (!fromThisSite(request)) return { refused: json({ error: 'origin' }, 403) };
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) return { refused: json({ error: 'json' }, 415) };
  if (Number(request.headers.get('content-length') ?? 0) > BODY_MAX) {
    return { refused: json({ error: 'size' }, 413) };
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  for (;;) {
    const read = await reader?.read();
    if (!read || read.done) break;
    size += read.value.byteLength;
    if (size > BODY_MAX) {
      await reader?.cancel();
      return { refused: json({ error: 'size' }, 413) };
    }
    chunks.push(read.value);
  }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('shape');
    return { body: body as Record<string, unknown> };
  } catch {
    return { refused: json({ error: 'json' }, 400) };
  }
}
