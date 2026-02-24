# NearWord

A Wordle-like semantic distance game: you get a short, human-written hint and try to guess the secret word (or get close enough in meaning). One puzzle per day, finite guesses, and optional community stats + 2D semantic map after you finish.

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Get an OpenAI API key and set it**
   - Go to [OpenAI Platform](https://platform.openai.com/) and sign in (or create an account).
   - Open [API keys](https://platform.openai.com/api-keys), click **Create new secret key**, name it (e.g. “NearWord”), and copy the key (it starts with `sk-`). You won’t see it again.
   - In the project root, create a file named `.env.local` and add:
     ```bash
     OPENAI_API_KEY=sk-your-key-here
     ```
   - The app uses OpenAI embeddings (`text-embedding-3-small`) for scoring. Without the key, guessing will not work.

3. **Vocabulary and precompute (for percentile ranking)**
   - The repo includes a small `data/vocabulary.txt`. For good percentile rankings, use a larger list (e.g. tens of thousands of words).
   - **Option A — Download a word list:** Run the fetch script, then precompute:
     ```bash
     npm run fetch-vocabulary
     npm run precompute
     ```
     This downloads a common English word list and writes it to `data/vocabulary.txt` (see script for source and limit).
   - **Option B — Use your own list:** Put one word per line in `data/vocabulary.txt` (lowercase, letters only or with `'` and `-`). Then run:
     ```bash
     npm run precompute
     ```
   - Precompute embeds the vocabulary and builds per-puzzle similarity data. After that, the game shows percentile (e.g. “top 5%”) and reuses cached embeddings so scoring is faster.

## Running

- **Dev server**
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000).

- **Mobile app (iOS / Android via home screen)**  
  The app is a PWA: install it from the browser to your home screen — no app store. Deploy to HTTPS (e.g. Vercel, Netlify), then on your phone:
  - **iOS:** Open the site in **Safari**, tap the Share button (square with arrow), then **Add to Home Screen**. Name it and add; it opens full-screen like an app.
  - **Android:** Open the site in **Chrome**, tap the menu (⋮), then **Install app** or **Add to Home screen**.
  Once installed, it opens in its own window with no browser UI. Icons (192 and 512) are in `public/`; run `npm run generate-icons` to regenerate them (requires `sharp`).

- **Precompute (percentile + faster scoring)**
  ```bash
  npm run precompute
  ```
  - Writes `.cache/embeddings.jsonl` and `.cache/puzzles/<puzzleId>.json`. Options: `--today`, `--from YYYY-MM-DD --to YYYY-MM-DD`, `--output-dir <dir>`. See **Deploy pipeline** for runtime cache loading.
    - `npm run precompute -- --today` — only today’s puzzle
  - Without today's puzzle cache at runtime, the guess API returns `503 CACHE_UNAVAILABLE` and the UI shows a friendly message; ensure the cache is committed or available via `PUZZLE_CACHE_BASE_URL`.

- **Tests**
  ```bash
  npm test
  ```

## Deploy pipeline

**Precompute (embeddings + puzzle caches) is not run during Vercel build.** Build runs `next build` only. **In production, today's puzzle cache must be available** or the guess API returns `503 CACHE_UNAVAILABLE` and users see a friendly "cache temporarily unavailable" message instead of percentile. Use either committed cache or blob storage.

**Today's puzzle ID** is `daily-YYYY-MM-DD` (UTC). The cache file must be named **`<puzzleId>.json`** (e.g. `daily-2026-02-22.json`) in `data/puzzle-cache/` or at `{PUZZLE_CACHE_BASE_URL}/{puzzleId}.json`.

- **Option A — Committed cache (dev / small deploys)**  
  Run precompute locally and export puzzle JSONs into the repo so the app can read them at runtime:
  ```bash
  npm run fetch-vocabulary
  npm run precompute:export
  ```
  This writes `data/puzzle-cache/<puzzleId>.json` (e.g. today’s `daily-2026-02-22.json` for today). **Commit at least `data/puzzle-cache/daily-<today>.json`** so production has today's cache. At runtime the app loads from `data/puzzle-cache/` (then `.cache/puzzles/` if present). Good for dev or a single puzzle; avoid committing many large files.

- **Option B — External blob storage (recommended for production)**  
  1. Run precompute locally or in CI; upload `.cache/puzzles/<puzzleId>.json` to a public or signed URL (e.g. S3, R2, Vercel Blob). **Ensure today's file is uploaded** (e.g. `daily-YYYY-MM-DD.json`).
  2. Set the base URL in your deployment env:
     ```bash
     PUZZLE_CACHE_BASE_URL=https://your-bucket.s3.amazonaws.com/puzzle-cache
     ```
     (No trailing slash; the app fetches `{PUZZLE_CACHE_BASE_URL}/{puzzleId}.json`.)
  3. At runtime, if a puzzle cache is not found under `.cache/puzzles/` or `data/puzzle-cache/`, the app fetches it from this URL and caches it in memory.

- **Local full build with precompute:**  
  To run precompute then build (e.g. to test a full build locally):  
  `RUN_PRECOMPUTE=1 npm run build`

- **Automated daily cache (GitHub Action)**  
  `.github/workflows/daily-puzzle-cache.yml` runs at **00:05 UTC** every day: `npm ci` → `npm run fetch-vocabulary` → `npm run precompute:export -- --today`. Then either **upload to R2/S3** or **commit and push** (see below). Set **`OPENAI_API_KEY`** in repo secrets. Puzzle ID uses UTC only (see `src/server/puzzles/puzzleId.ts`).

- **Cloudflare R2 (Option B)**  
  In the repo: **Secrets** — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL` (R2 S3 API endpoint, e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`). **Variables** — `S3_BUCKET=nearword-cache`, `S3_PREFIX=puzzle-cache`, `AWS_REGION=auto`. When these are set, the workflow uploads to R2 at key `puzzle-cache/daily-YYYY-MM-DD.json`; otherwise it commits and pushes. In **Vercel** (Production) set:
  ```bash
  PUZZLE_CACHE_BASE_URL=https://pub-b8b83d145fa34d339c1fea39c5391cd.r2.dev/puzzle-cache
  ```
  (No trailing slash; R2 public dev URL serves object keys directly under this path.) After redeploy and running the Daily puzzle cache workflow, **GET /api/health** should show `cacheSourceUsed: "blob"` and `percentileAvailable: true`. Verify the blob directly: `https://pub-b8b83d145fa34d339c1fea39c5391cd.r2.dev/puzzle-cache/daily-YYYY-MM-DD.json` (today UTC) should return JSON.

- **Health check**  
  **GET /api/health** returns `{ todayPuzzleId, cacheSourceUsed: "memory"|"local"|"blob"|"none", percentileAvailable }` so you can verify production at a glance.

## How scoring works

- **Cosine similarity** — Embeddings for your guess and the target are compared; same target + same guess always gives the same score (0–1).
- **Percentile** — When precompute has run, we have a sorted list of the vocabulary by similarity to the target. Your guess’s cosine is ranked in that list; percentile = 100 × (1 − rank/vocabSize). Guesses not in the vocab get an interpolated rank from the sorted list.
- **Bands** — Configurable bands (e.g. Bullseye, So close, Getting warm) are driven by `feedbackBands` in config; the band is chosen from your percentile (or cosine if `scoreMode` is cosine).
- **Win** — You win if you type the exact target word or reach the top percentile (e.g. 99.5%). You lose when you use all guesses (e.g. 8) without winning; the answer is then revealed.

## Configuration

Edit `src/config/gameConfig.ts`:

- `maxGuesses` — e.g. 8 (or `null` for unlimited).
- `winPercentile` — e.g. 99.5 (top 0.5% counts as win).
- `allowPhrases` — allow multi-word guesses.
- `feedbackBands` — thresholds and labels for feedback (e.g. Bullseye, So close, Cold).
- `progressiveHints.revealSecondHintAfterGuesses` — after how many guesses the second hint appears.
- `letterHelp.revealAfterGuesses` — after how many guesses to show first letter and word length (single-word targets only).
- `community` / `map` — toggles and limits for post-game community and 2D map.

## Hints and copy

Hints and UI copy are written to sound **human and natural** — short, concrete, like how you’d describe a word to a friend. No robotic or AI-style phrasing. Daily hints live in `src/server/puzzles/dailyPuzzles.ts`; add or edit entries there.

## Supabase (persisted data + sharing)

To persist everyone’s guesses and power the community stats and 2D map with real data — and to share a URL with friends so they can play on their phones — use Supabase.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and get:
   - Project URL (e.g. `https://xxxx.supabase.co`)
   - Service role key (Settings → API → `service_role` secret) or anon key for public read/write

2. **Run migrations**
   - In the Supabase SQL editor, run the contents of `supabase/migrations/20260222000000_initial.sql` (creates `runs` and `puzzle_aggregates` with RLS policies).

3. **Set env in your app**
   - In `.env.local` (or your host’s env) add:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```
   - If both are set, the app uses Supabase for runs and aggregates; otherwise it falls back to in-memory (no persistence across restarts).

4. **Deploy and share**
   - Deploy to HTTPS (e.g. Vercel, Netlify). Share the deployed URL with friends; they can open it on their phone and add it to the home screen (PWA). All guesses are stored in Supabase and feed into the community summary and 2D semantic map. A **new puzzle is used every day at midnight UTC** (see `getTodayPuzzleId()` in `src/server/puzzles/catalog.ts` to change timezone).

## Swapping embeddings or stores

- **Embeddings** — Implement `EmbeddingsProvider` in `src/server/embeddings/` and wire it in `getProvider.ts` (or via env) so you can switch to another provider without changing the rest of the app.
- **Stores** — `RunStore` and `AggregateStore` are interfaces. If Supabase env vars are set, the app uses `SupabaseRunStore` and `SupabaseAggregateStore`; otherwise it uses in-memory implementations. You can add other backends by implementing the same interfaces and selecting them in `src/server/stores/index.ts`.
