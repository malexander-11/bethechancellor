import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

/** The site's page as the server writes it into its own pages: the dev server's, or the build's. */
type PageHtml = (url: URL) => Promise<string>;

/** What `@btc/server/dev` gives: the server's own handlers, behind Node's requests. */
interface DevServer {
  answers: (path: string) => boolean;
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

/**
 * The server is TypeScript that Node cannot load as it stands, so tsx loads it, as the data
 * plugin loads the pipeline: once, when the dev server or the preview first asks it something.
 */
async function started(html: PageHtml): Promise<DevServer> {
  const { tsImport } = await import('tsx/esm/api');
  const module = (await tsImport('@btc/server/dev', import.meta.url)) as {
    devServer: (deps: { html: PageHtml }) => DevServer;
  };
  return module.devServer({ html });
}

/** The server's paths ahead of everything else the dev server or the preview serves. */
function middlewareFor(html: PageHtml): Connect.NextHandleFunction {
  let server: Promise<DevServer> | undefined;
  return (req, res, next) => {
    server ??= started(html);
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    server
      .then((s) => (s.answers(path) ? s.handle(req, res) : next()))
      .catch((error: unknown) => next(error));
  };
}

/**
 * The server's paths in `npm run dev` and in the preview the end-to-end suite runs on (ADR-0044):
 * the same handlers the Vercel functions run, ahead of the single-page app. The pages the server
 * writes are the site's own: in development as Vite transforms it, in the preview as built.
 */
export function serverPlugin(): Plugin {
  return {
    name: 'btc-server',
    configureServer(dev) {
      const source = path.join(dev.config.root, 'index.html');
      dev.middlewares.use(
        middlewareFor((url) =>
          dev.transformIndexHtml(url.pathname + url.search, readFileSync(source, 'utf8')),
        ),
      );
    },
    configurePreviewServer(preview) {
      const built = path.resolve(preview.config.root, preview.config.build.outDir, 'index.html');
      preview.middlewares.use(middlewareFor(async () => readFileSync(built, 'utf8')));
    },
  };
}
