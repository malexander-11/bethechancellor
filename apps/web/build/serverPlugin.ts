import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';

/** What `@btc/server/dev` gives: the server's own handlers, behind Node's requests. */
interface DevServer {
  answers: (path: string) => boolean;
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

/**
 * The server is TypeScript that Node cannot load as it stands, so tsx loads it, as the data
 * plugin loads the pipeline: once, when the dev server or the preview starts.
 */
async function started(): Promise<DevServer> {
  const { tsImport } = await import('tsx/esm/api');
  const module = (await tsImport('@btc/server/dev', import.meta.url)) as {
    devServer: () => DevServer;
  };
  return module.devServer();
}

/**
 * The server's paths in `npm run dev` and in the preview the end-to-end suite runs on (ADR-0044):
 * the same handlers the Vercel functions run, ahead of the single-page app.
 */
export function serverPlugin(): Plugin {
  let server: Promise<DevServer> | undefined;
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    server ??= started();
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    server
      .then((s) => (s.answers(path) ? s.handle(req, res) : next()))
      .catch((error: unknown) => next(error));
  };
  return {
    name: 'btc-server',
    configureServer(dev) {
      dev.middlewares.use(middleware);
    },
    configurePreviewServer(preview) {
      preview.middlewares.use(middleware);
    },
  };
}
