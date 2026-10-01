/**
 * `npm run build -w @btc/server`, after the site's build: the server's functions as bundles Vercel
 * deploys beside the static site (ADR-0044). Each bundle holds the engine and everything it needs
 * but its files, which are written beside it: the data the browser gets, and the picture's
 * WebAssembly and typefaces. Then the bundles are asked what Vercel will ask them: a build whose
 * server does not answer fails, so it never replaces the live site.
 */
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { shippedDataset } from '@btc/pipeline/shipped';
import { CARD_FILES, cardAssetFiles, type CardFile } from '../src/card/assets.js';
import { CARD_HEIGHT, CARD_WIDTH } from '../src/card/layout.js';
import { pngSize } from '../src/card/png.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');

/** The functions, by the name api/<name>.js re-exports. */
const FUNCTIONS = ['app', 'card'] as const;
type Name = (typeof FUNCTIONS)[number];

function fail(problem: string): never {
  console.error(`server build: ${problem}`);
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const data = shippedDataset();
writeFileSync(path.join(dist, 'dataset.json'), JSON.stringify(data));
const files = cardAssetFiles();
for (const name of Object.keys(CARD_FILES) as CardFile[]) {
  copyFileSync(files[name], path.join(dist, name));
}
// harfbuzz reads its own WebAssembly from beside the code that loads it: the bundle.
copyFileSync(
  createRequire(import.meta.url).resolve('harfbuzzjs/hb.wasm'),
  path.join(dist, 'hb.wasm'),
);

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
  // What a CommonJS dependency expects of Node inside an ES module bundle: require(), and the
  // bundle's own folder, where harfbuzz (satori's text shaper) looks for its WebAssembly. The
  // imports take names no dependency's own imports can collide with.
  banner: {
    js: [
      "import { createRequire as requireFrom } from 'node:module';",
      "import { fileURLToPath as pathOfUrl } from 'node:url';",
      "import { dirname as folderOf } from 'node:path';",
      'const require = requireFrom(import.meta.url);',
      'const __filename = pathOfUrl(import.meta.url);',
      'const __dirname = folderOf(__filename);',
    ].join(' '),
  },
});

/** One function's answer to a request, as Vercel would ask it. */
async function ask(name: Name, url: string): Promise<Response> {
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

// The game's own picture, and a finished Budget's: a game at Budget day that moved nothing.
for (const query of ['', '?v=1&g=st.5']) {
  const card = await ask('card', `http://localhost/api/card${query}`);
  if (card.status !== 200 || card.headers.get('content-type') !== 'image/png') {
    fail(`/api/card${query} answered ${card.status} ${card.headers.get('content-type')}`);
  }
  const size = pngSize(new Uint8Array(await card.arrayBuffer()));
  if (size?.width !== CARD_WIDTH || size.height !== CARD_HEIGHT) {
    fail(`/api/card${query} drew ${JSON.stringify(size)}`);
  }
}

console.log(
  `server build: ${FUNCTIONS.join(', ')} bundled and answering in ${path.relative(process.cwd(), dist)}`,
);
