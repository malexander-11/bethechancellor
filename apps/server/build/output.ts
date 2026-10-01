/**
 * `npm run build -w @btc/server`, after the site's build: the server's functions as bundles Vercel
 * deploys beside the static site (ADR-0044). Each bundle holds the engine and everything it needs
 * but its data, which is written beside it from the same data the browser gets. Then the bundles
 * are asked what Vercel will ask them: a build whose server does not answer fails, so it never
 * replaces the live site.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { shippedDataset } from '@btc/pipeline/shipped';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');

/** The functions, by the name api/<name>.js re-exports. */
const FUNCTIONS = ['app'] as const;

function fail(problem: string): never {
  console.error(`server build: ${problem}`);
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const data = shippedDataset();
writeFileSync(path.join(dist, 'dataset.json'), JSON.stringify(data));

await build({
  entryPoints: Object.fromEntries(
    FUNCTIONS.map((name) => [name, path.join(root, 'vercel', `${name}.ts`)]),
  ),
  outdir: dist,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  logLevel: 'warning',
  // A CommonJS dependency's require() inside an ES module bundle.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

/** One function's answer to a request, as Vercel would ask it. */
async function ask(name: (typeof FUNCTIONS)[number], url: string): Promise<Response> {
  const module = (await import(pathToFileURL(path.join(dist, `${name}.mjs`)).href)) as {
    default: { fetch: (request: Request) => Promise<Response> };
  };
  return module.default.fetch(new Request(url));
}

const health = await ask('app', 'http://localhost/api/health');
if (health.status !== 200) fail(`/api/health answered ${health.status}`);
const said = (await health.json()) as { ok?: boolean; data?: string };
if (!said.ok || said.data !== data.vintage.permalinkCode) {
  fail(`/api/health said ${JSON.stringify(said)}`);
}

console.log(
  `server build: ${FUNCTIONS.join(', ')} bundled and answering in ${path.relative(process.cwd(), dist)}`,
);
