import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

/** Deterministic pretty JSON with a trailing newline, so drift checks compare bytes. */
export function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function listFiles(dir: string, filter: (file: string) => boolean = () => true): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out.sort();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
