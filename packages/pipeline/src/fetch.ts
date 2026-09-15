/**
 * Download every registered source that has a `localPath` into data/raw, record its sha256 and
 * retrieval date in the registry. Idempotent: existing files are kept unless --force is given.
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 so Node's fetch honours HTTPS_PROXY.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseSources, type SourceDoc } from '@btc/engine';
import { readJson, sha256, todayIso, writeJson } from './lib/io.js';
import { REPO_ROOT, SOURCES_FILE } from './lib/paths.js';

const force = process.argv.includes('--force');

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { 'user-agent': 'bethechancellor-pipeline/0.1' } });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const file = parseSources(readJson(SOURCES_FILE));
  const updated: SourceDoc[] = [];
  let changed = false;
  for (const source of file.sources) {
    if (!source.localPath) {
      updated.push(source);
      continue;
    }
    const target = path.join(REPO_ROOT, source.localPath);
    let bytes: Uint8Array;
    if (existsSync(target) && !force) {
      bytes = new Uint8Array(readFileSync(target));
      process.stdout.write(`kept     ${source.localPath}\n`);
    } else {
      bytes = await download(source.url);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      process.stdout.write(`fetched  ${source.localPath} (${bytes.length} bytes)\n`);
      changed = true;
    }
    const digest = sha256(bytes);
    if (source.sha256 !== digest) {
      if (source.sha256)
        process.stdout.write(
          `warning  ${source.id}: sha256 changed from ${source.sha256.slice(0, 12)}… to ${digest.slice(0, 12)}…\n`,
        );
      updated.push({ ...source, sha256: digest, retrievedOn: todayIso() });
      changed = true;
    } else {
      updated.push(source);
    }
  }
  if (changed) {
    writeJson(SOURCES_FILE, { ...file, sources: updated });
    process.stdout.write(`updated  ${path.relative(REPO_ROOT, SOURCES_FILE)}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
