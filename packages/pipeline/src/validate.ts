/** Validate everything under data/: schemas, consistency checks, cross-file references, raw file hashes. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DataError, validateDataset } from '@btc/engine';
import { loadDataset } from './lib/dataset.js';
import { sha256 } from './lib/io.js';
import { REPO_ROOT } from './lib/paths.js';

function main(): void {
  const problems: string[] = [];
  let ds: ReturnType<typeof loadDataset>;
  try {
    ds = loadDataset();
  } catch (error) {
    if (error instanceof DataError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
  problems.push(...validateDataset(ds));
  for (const source of ds.sources.sources) {
    if (!source.localPath) continue;
    const target = path.join(REPO_ROOT, source.localPath);
    if (!existsSync(target)) {
      problems.push(
        `source ${source.id}: ${source.localPath} is missing (run npm run fetch:sources)`,
      );
      continue;
    }
    if (source.sha256) {
      const digest = sha256(new Uint8Array(readFileSync(target)));
      if (digest !== source.sha256)
        problems.push(`source ${source.id}: sha256 mismatch for ${source.localPath}`);
    } else {
      problems.push(`source ${source.id}: committed file has no sha256 in the registry`);
    }
  }
  if (problems.length > 0) {
    process.stderr.write(`data validation failed:\n - ${problems.join('\n - ')}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `data ok: ${ds.vintages.length} vintage(s), ${ds.ruleSets.length} rule set(s), ${ds.levers.length} lever(s), ${ds.presets.presets.length} preset(s), ${ds.sources.sources.length} source(s)\n`,
  );
}

main();
