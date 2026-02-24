/**
 * Build script: runs next build only. Precompute is NOT run during deploy.
 *
 * Precompute artifacts (puzzle caches) must be provided separately:
 * - Dev: committed files in data/puzzle-cache/<puzzleId>.json, or run precompute locally.
 * - Production: set PUZZLE_CACHE_BASE_URL to a public base URL; artifacts are fetched at runtime.
 *
 * To run precompute before a local build (e.g. full dev with today's puzzle):
 *   RUN_PRECOMPUTE=1 npm run build
 */
const { execSync } = require("child_process");

const runPrecompute = process.env.RUN_PRECOMPUTE === "1";

if (runPrecompute) {
  console.log("RUN_PRECOMPUTE=1: running precompute then next build.");
  execSync("npm run precompute -- --today", { stdio: "inherit" });
}
execSync("next build", { stdio: "inherit" });
