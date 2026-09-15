/** Validate everything under data/: schemas, consistency checks, cross-file references, raw file hashes. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  checkRawSourceConsistency,
  DataError,
  parseHmrcExtract,
  parseScorecardExtract,
  parseSr25Extract,
  validateDataset,
  type ExtractedSources,
} from '@btc/engine';
import { HMRC_EXTRACT_FILE, SCORECARD_EXTRACT_FILE, SR25_EXTRACT_FILE } from './derive.js';
import { loadDataset } from './lib/dataset.js';
import { readJson, sha256 } from './lib/io.js';
import { DERIVED_DIR, REPO_ROOT } from './lib/paths.js';

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

  // Every direct costing must reproduce from the extracted published tables.
  const extracted: ExtractedSources = {};
  const hmrcFile = path.join(DERIVED_DIR, HMRC_EXTRACT_FILE);
  const scorecardFile = path.join(DERIVED_DIR, SCORECARD_EXTRACT_FILE);
  if (existsSync(hmrcFile)) extracted.hmrc = parseHmrcExtract(readJson(hmrcFile));
  else problems.push(`${HMRC_EXTRACT_FILE} is missing (run npm run derive -w @btc/pipeline)`);
  if (existsSync(scorecardFile))
    extracted.scorecard = parseScorecardExtract(readJson(scorecardFile));
  else problems.push(`${SCORECARD_EXTRACT_FILE} is missing (run npm run derive -w @btc/pipeline)`);
  const sr25File = path.join(DERIVED_DIR, SR25_EXTRACT_FILE);
  if (existsSync(sr25File)) extracted.sr25 = parseSr25Extract(readJson(sr25File));
  else problems.push(`${SR25_EXTRACT_FILE} is missing (run npm run derive -w @btc/pipeline)`);
  for (const lever of ds.levers) problems.push(...checkRawSourceConsistency(lever, extracted));

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
