/** Regenerate data/derived into a temporary directory and fail if it differs from the commit. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { derive } from './derive.js';
import { listFiles } from './lib/io.js';
import { DERIVED_DIR, REPO_ROOT } from './lib/paths.js';

function main(): void {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'btc-derived-'));
  try {
    derive({ outDir: tmp });
    const fresh = listFiles(tmp).map((f) => path.relative(tmp, f));
    const committed = listFiles(DERIVED_DIR).map((f) => path.relative(DERIVED_DIR, f));
    const problems: string[] = [];
    for (const rel of fresh) {
      if (!committed.includes(rel)) {
        problems.push(`${rel} is generated but not committed`);
        continue;
      }
      const a = readFileSync(path.join(tmp, rel));
      const b = readFileSync(path.join(DERIVED_DIR, rel));
      if (!a.equals(b)) problems.push(`${rel} differs from the committed file`);
    }
    for (const rel of committed) {
      if (!fresh.includes(rel)) problems.push(`${rel} is committed but no longer generated`);
    }
    if (problems.length > 0) {
      process.stderr.write(
        `derived data drift in ${path.relative(REPO_ROOT, DERIVED_DIR)}:\n - ${problems.join('\n - ')}\nRun: npm run derive -w @btc/pipeline\n`,
      );
      process.exit(1);
    }
    process.stdout.write(`derived data up to date (${fresh.length} file(s))\n`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();
