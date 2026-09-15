import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of the repository root. */
export const REPO_ROOT = path.resolve(here, '../../../..');
export const DATA_DIR = path.join(REPO_ROOT, 'data');
export const RAW_DIR = path.join(DATA_DIR, 'raw');
export const DERIVED_DIR = path.join(DATA_DIR, 'derived');
export const SOURCES_FILE = path.join(DATA_DIR, 'sources', 'sources.json');
