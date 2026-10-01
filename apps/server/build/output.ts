/**
 * `npm run build -w @btc/server`, after the site's build: the server's functions as bundles Vercel
 * deploys beside the static site (ADR-0044). Each bundle holds the engine and everything it needs
 * but its files, which are written beside it: the data the browser gets, the site's built page,
 * and the picture's WebAssembly and typefaces. Then the bundles are asked what Vercel will ask
 * them: a build whose server does not answer fails, so it never replaces the live site.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { shippedDataset } from '@btc/pipeline/shipped';
import { CARD_FILES, cardAssetFiles, type CardFile } from '../src/card/assets.js';
import { CARD_HEIGHT, CARD_WIDTH } from '../src/card/layout.js';
import { pngSize } from '../src/card/png.js';
import { META_END, META_START } from '../src/pages.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');
/** The site's page, as its build wrote it: the pages the server writes are this one. */
const sitePage = path.resolve(root, '../web/dist/index.html');

/** The functions, by the name api/<name>.js re-exports. */
const FUNCTIONS = ['app', 'card'] as const;
type Name = (typeof FUNCTIONS)[number];

function fail(problem: string): never {
  console.error(`server build: ${problem}`);
  process.exit(1);
}

if (!existsSync(sitePage)) fail('the site is not built: run `npm run build` from the root');
const page = readFileSync(sitePage, 'utf8');
if (!page.includes(META_START) || !page.includes(META_END)) {
  fail(`the site's index.html has lost the markers ${META_START} … ${META_END}`);
}
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(path.join(dist, 'index.html'), page);
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

// A shared Budget's page: the site's own, previewing that Budget's picture; and any other link's,
// previewing the game's.
for (const [query, title] of [
  ['?v=1&g=st.5', 'My Budget'],
  ['?nonsense', 'What’s your Budget?'],
] as const) {
  const shared = await ask('app', `https://example.test/shared${query}`);
  const html = await shared.text();
  if (shared.status !== 200 || !shared.headers.get('content-type')?.startsWith('text/html')) {
    fail(`/shared${query} answered ${shared.status} ${shared.headers.get('content-type')}`);
  }
  const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? '';
  if (!html.includes('<div id="root">') || !image.startsWith('https://example.test/api/card')) {
    fail(`/shared${query} is not the site's page with a picture to preview`);
  }
  if (!html.includes(`<title>${title}`)) fail(`/shared${query} is not titled ${title}`);
}

console.log(
  `server build: ${FUNCTIONS.join(', ')} bundled and answering in ${path.relative(process.cwd(), dist)}`,
);
