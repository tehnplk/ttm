# TEAM_007 – Fix src/App Router structure

## Context
- Date: 2025-11-30
- Goal: Clean up and verify Next.js App Router structure under `src/app`, ensure paths and config (`tsconfig`, aliases, legacy `_source`) are consistent.

## Initial Notes
- App Router is located under `src/app`.
- `tsconfig.json` is configured with `@/* -> ./src/*` and excludes `_source`.
- Need to inspect `_source` legacy directory and align with current structure.

## Plan
- Inspect `src` and `_source` trees.
- Run `npm run lint` and possibly `npm run build` before any code changes.
- Fix any structural issues (duplicate routes, misplaced components, incorrect imports, dead legacy directories).
- Re-run checks and document changes.
