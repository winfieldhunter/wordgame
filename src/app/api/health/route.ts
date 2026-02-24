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

  const base = process.env.PUZZLE_CACHE_BASE_URL;
  const puzzleCacheBaseUrlSet =
    typeof base === "string" && base.length > 0;

  const puzzleOffsetDays = parseInt(process.env.PUZZLE_DATE_OFFSET_DAYS ?? "0", 10) || 0;
  const puzzleOffsetUntil = process.env.PUZZLE_OFFSET_APPLY_UNTIL ?? null;

  const puzzleCacheFetchUrl =
    puzzleCacheBaseUrlSet && base
      ? base.replace(/\/$/, "") + "/" + encodeURIComponent(todayPuzzleId) + ".json"
      : null;

  return NextResponse.json({
    todayPuzzleId,
    cacheSourceUsed,
    percentileAvailable,
    cacheSize,
    puzzleCacheBaseUrlSet,
    puzzleCacheFetchUrl,
    puzzleOffset: puzzleOffsetDays || puzzleOffsetUntil ? { days: puzzleOffsetDays, until: puzzleOffsetUntil } : null,
  });
}
