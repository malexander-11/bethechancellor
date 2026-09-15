# ADR-0001: Vite + React single-page app, not Next.js

**Status:** accepted, 2026-09-15

## Context

The game has no backend, no authentication and no database. All computation runs in the
browser from committed JSON. It must be shareable by URL and deploy on Vercel.

## Decision

Build a Vite + React + TypeScript single-page app. Keep the engine as a DOM-free package so
the shell could be replaced later. Reserve `apps/web/api/` for a small Vercel function that
renders social-preview images per permalink (Phase 4).

## Consequences

- Sub-millisecond recompute on every slider move with no server round trip.
- Permalinks need a rewrite rule in `vercel.json` so `/b?...` survives a hard refresh.
- Social previews cannot be rendered from static HTML; they need the Phase 4 function.
- CI stays fast (Vite and Vitest share configuration).
