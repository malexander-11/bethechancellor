import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SERVED_BY, SERVER_PATHS, type ServerPath } from '../src/paths.js';

interface VercelConfig {
  buildCommand: string;
  outputDirectory: string;
  functions: Record<string, { includeFiles?: string }>;
  rewrites: { source: string; destination: string }[];
}

const config = JSON.parse(
  readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;
const root = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as {
  scripts: Record<string, string>;
};

/** A rewrite's source as a regular expression: `:name`, `:name*` and raw groups, as Vercel reads them. */
function sourcePattern(source: string): RegExp {
  const pattern = source
    .replace(/:\w+\*/g, '(.*)')
    .replace(/:\w+(\([^)]*\))/g, '$1')
    .replace(/:\w+/g, '([^/]+)');
  return new RegExp(`^${pattern}$`);
}

/** Where Vercel sends a path the site has no file for: the first rewrite that matches. */
function destinationOf(path: string): string | undefined {
  return config.rewrites.find((r) => sourcePattern(r.source).test(path))?.destination;
}

/** A path each of the server's routes answers. */
const SAMPLES: Record<ServerPath, string> = {
  health: '/api/health',
  card: '/api/card',
};

describe('the site on Vercel (ADR-0044)', () => {
  it('builds the server with the site, and ships the bundles with the functions', () => {
    expect(config.buildCommand).toBe('npm run build');
    expect(root.scripts.build).toContain('-w @btc/web');
    expect(root.scripts.build).toContain('-w @btc/server');
    expect(config.outputDirectory).toBe('apps/web/dist');
    expect(config.functions['api/*.js']?.includeFiles).toBe('apps/server/dist/**');
  });

  it('sends every path the server answers to its function, before the single-page app', () => {
    for (const [route, sample] of Object.entries(SAMPLES) as [ServerPath, string][]) {
      expect(SERVER_PATHS[route].test(sample), route).toBe(true);
      const fn = SERVED_BY[route];
      expect(existsSync(new URL(`../../../api/${fn}.js`, import.meta.url)), fn).toBe(true);
      // A function answers its own path; any other reaches it by a rewrite.
      if (sample !== `/api/${fn}`) expect(destinationOf(sample), sample).toBe(`/api/${fn}`);
    }
  });

  it('hands every other path to the single-page app, and never one under /api', () => {
    for (const path of ['/', '/budget-day', '/review', '/about']) {
      expect(destinationOf(path), path).toBe('/index.html');
    }
    expect(destinationOf('/api/anything-else')).toBeUndefined();
  });
});
