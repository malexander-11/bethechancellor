import type { IncomingMessage, ServerResponse } from 'node:http';
import { clientIp, type Handler } from './http.js';

/** The most of a body the adapter reads; the handlers refuse far less. */
const BODY_LIMIT = 64 * 1024;

/** Node's request as the web's, for the dev server and the preview. */
export async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(key, one);
    }
  }
  if (!headers.has('x-forwarded-for') && req.socket.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }
  const method = req.method ?? 'GET';
  if (method === 'GET' || method === 'HEAD') return new Request(url, { method, headers });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > BODY_LIMIT) break;
    chunks.push(chunk);
  }
  return new Request(url, { method, headers, body: Buffer.concat(chunks) });
}

/** The web's response written to Node's. */
export async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function serveNode(
  handler: Handler,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const request = await toRequest(req);
  await send(res, await handler(request, { ip: clientIp(request.headers) }));
}
