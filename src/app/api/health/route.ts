import { NextResponse } from "next/server";
import { getTodayPuzzleId } from "@/server/puzzles/puzzleId";
import { loadPuzzleCache } from "@/server/puzzles/loadCache";

/**
 * GET /api/health — Production health check.
 * Returns today's puzzle ID, where the cache was loaded from, and whether percentile is available.
 */
export async function GET() {
  const todayPuzzleId = getTodayPuzzleId();
  const { cache, source } = await loadPuzzleCache(todayPuzzleId);
  const cacheSize = cache?.sortedBySimilarity?.length ?? 0;
  const percentileAvailable = cache != null && cacheSize > 0;
  const cacheSourceUsed =
    source === ".cache" || source === "data/puzzle-cache" ? "local" : source;

  const puzzleCacheBaseUrlSet =
    typeof process.env.PUZZLE_CACHE_BASE_URL === "string" &&
    process.env.PUZZLE_CACHE_BASE_URL.length > 0;

  return NextResponse.json({
    todayPuzzleId,
    cacheSourceUsed,
    percentileAvailable,
    cacheSize,
    puzzleCacheBaseUrlSet,
  });
}
