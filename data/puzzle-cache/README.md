# Puzzle cache (percentile data)

This directory holds precomputed puzzle caches: `daily-YYYY-MM-DD.json` (one per day, UTC).

- **Runtime:** The app loads from `data/puzzle-cache/` then `.cache/puzzles/` then `PUZZLE_CACHE_BASE_URL` (see `src/server/puzzles/loadCache.ts`).
- **Production:** Either commit files here (e.g. via the GitHub Action at 00:05 UTC) or set `PUZZLE_CACHE_BASE_URL` and upload the same JSON to blob/S3.
- **Generate:** `npm run precompute:export -- --today` writes today’s file here.
