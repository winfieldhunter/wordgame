/**
 * Load precomputed puzzle data. Precompute is NOT run during deploy; artifacts are
 * read from local paths or fetched from PUZZLE_CACHE_BASE_URL at runtime.
 *
 * Lookup order: in-memory → .cache/puzzles → data/puzzle-cache → fetch from blob URL (if set).
 * .cache is dev/build-only; we never write to disk at runtime (fetched caches stay in memory).
 * Parsed result is cached in memory (max 2 entries). Scoring uses 50k vocab only.
 */

import type { SortedSimilarityEntry } from "@/server/scoring/scoring";
import { readFile } from "fs/promises";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), ".cache", "puzzles");
const COMMITTED_CACHE_DIR = join(process.cwd(), "data", "puzzle-cache");

const FETCH_TIMEOUT_MS = 3000;
/** 404: puzzle missing — short TTL so we retry soon after workflow uploads (API returns 404 PUZZLE_NOT_FOUND) */
const NEGATIVE_CACHE_TTL_NOT_FOUND_MS = 2 * 60 * 1000; // 2 min
/** Timeout/5xx/invalid: transient — short TTL, API returns 503 CACHE_UNAVAILABLE */
const NEGATIVE_CACHE_TTL_UNAVAILABLE_MS = 60 * 1000; // 60 sec

export type NegativeCacheType = "not_found" | "unavailable";

/** Thrown when puzzle cache is 404 (puzzle truly missing). API returns 404 { code: "PUZZLE_NOT_FOUND" }. */
export class PuzzleCacheNotFoundError extends Error {
  constructor(message: string = "Puzzle cache not found") {
    super(message);
    this.name = "PuzzleCacheNotFoundError";
  }
}

/** Thrown when puzzle cache fetch fails (timeout, 5xx, invalid JSON). API returns 503 { code: "CACHE_UNAVAILABLE" }. */
export class PuzzleCacheUnavailableError extends Error {
  constructor(message: string = "Puzzle cache temporarily unavailable") {
    super(message);
    this.name = "PuzzleCacheUnavailableError";
  }
}

/** In-memory cache: puzzleId -> parsed cache. Max 2 entries (current + previous); evict oldest when full. */
const memoryCache = new Map<string, PuzzleCache>();
const MAX_CACHE_ENTRIES = 2;

/** Negative cache: puzzleId -> { expiry, type }. On hit we throw so API responds consistently (404 or 503). */
const negativeCache = new Map<string, { expiry: number; type: NegativeCacheType }>();

function getNegativeCacheHit(puzzleId: string): NegativeCacheType | null {
  const entry = negativeCache.get(puzzleId);
  if (entry == null) return null;
  if (Date.now() >= entry.expiry) {
    negativeCache.delete(puzzleId);
    return null;
  }
  return entry.type;
}

function addToNegativeCache(puzzleId: string, type: NegativeCacheType): void {
  const ttl = type === "not_found" ? NEGATIVE_CACHE_TTL_NOT_FOUND_MS : NEGATIVE_CACHE_TTL_UNAVAILABLE_MS;
  negativeCache.set(puzzleId, { expiry: Date.now() + ttl, type });
}

export interface PuzzleCache {
  sortedBySimilarity: SortedSimilarityEntry[];
  targetEmbedding?: number[];
}

function parseCacheData(data: {
  sortedBySimilarity?: unknown;
  targetEmbedding?: unknown;
}): PuzzleCache | null {
  if (!data.sortedBySimilarity || !Array.isArray(data.sortedBySimilarity)) {
    return null;
  }
  return {
    sortedBySimilarity: data.sortedBySimilarity as SortedSimilarityEntry[],
    targetEmbedding: Array.isArray(data.targetEmbedding)
      ? data.targetEmbedding
      : undefined,
  };
}

async function tryReadLocal(path: string): Promise<PuzzleCache | null> {
  try {
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw) as { sortedBySimilarity?: unknown; targetEmbedding?: unknown };
    return parseCacheData(data);
  } catch {
    return null;
  }
}

async function tryFetchFromBlob(puzzleId: string): Promise<PuzzleCache | null> {
  const base = process.env.PUZZLE_CACHE_BASE_URL;
  if (!base || typeof base !== "string") return null;

  const negativeType = getNegativeCacheHit(puzzleId);
  if (negativeType === "not_found") throw new PuzzleCacheNotFoundError("Puzzle cache not found");
  if (negativeType === "unavailable") throw new PuzzleCacheUnavailableError("Puzzle cache temporarily unavailable");

  // Exact URL app fetches; must match R2 object path: {PUZZLE_CACHE_BASE_URL}/{puzzleId}.json (e.g. .../puzzle-cache/daily-YYYY-MM-DD.json)
  const url = base.replace(/\/$/, "") + "/" + encodeURIComponent(puzzleId) + ".json";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    // Temporary debug: verify R2 public URL and response (remove after pipeline verification)
    console.log(`[loadPuzzleCache] blob fetch debug url=${url} status=${res.status}`);
    if (res.status === 404) {
      addToNegativeCache(puzzleId, "not_found");
      throw new PuzzleCacheNotFoundError("Puzzle cache not found");
    }
    if (!res.ok) {
      addToNegativeCache(puzzleId, "unavailable");
      throw new PuzzleCacheUnavailableError(`Puzzle cache fetch failed: ${res.status}`);
    }
    let data: { sortedBySimilarity?: unknown; targetEmbedding?: unknown };
    try {
      data = (await res.json()) as { sortedBySimilarity?: unknown; targetEmbedding?: unknown };
    } catch (parseErr) {
      console.log(`[loadPuzzleCache] blob fetch debug url=${url} status=${res.status} jsonParseOk=false`);
      addToNegativeCache(puzzleId, "unavailable");
      throw new PuzzleCacheUnavailableError("Puzzle cache invalid response");
    }
    const parsed = parseCacheData(data);
    console.log(`[loadPuzzleCache] blob fetch debug url=${url} status=${res.status} jsonParseOk=${parsed != null}`);
    if (!parsed) {
      addToNegativeCache(puzzleId, "unavailable");
      throw new PuzzleCacheUnavailableError("Puzzle cache invalid response");
    }
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof PuzzleCacheNotFoundError || err instanceof PuzzleCacheUnavailableError) throw err;
    addToNegativeCache(puzzleId, "unavailable");
    throw new PuzzleCacheUnavailableError(
      err instanceof Error ? err.message : "Puzzle cache fetch failed"
    );
  }
}

const LOG_SOURCE = "loadPuzzleCache";

export type CacheSource = "memory" | ".cache" | "data/puzzle-cache" | "blob" | "none";

export interface LoadPuzzleCacheResult {
  cache: PuzzleCache | null;
  source: CacheSource;
}

export async function loadPuzzleCache(
  puzzleId: string
): Promise<LoadPuzzleCacheResult> {
  const cached = memoryCache.get(puzzleId);
  if (cached) return { cache: cached, source: "memory" };

  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest != null) memoryCache.delete(oldest);
  }

  const localPath = join(CACHE_DIR, `${puzzleId}.json`);
  let result = await tryReadLocal(localPath);
  if (result) {
    memoryCache.set(puzzleId, result);
    return { cache: result, source: ".cache" };
  }

  const committedPath = join(COMMITTED_CACHE_DIR, `${puzzleId}.json`);
  result = await tryReadLocal(committedPath);
  if (result) {
    memoryCache.set(puzzleId, result);
    return { cache: result, source: "data/puzzle-cache" };
  }

  try {
    result = await tryFetchFromBlob(puzzleId);
    if (result) {
      memoryCache.set(puzzleId, result);
      return { cache: result, source: "blob" };
    }
  } catch (err) {
    console.warn(`[${LOG_SOURCE}] puzzleId=${puzzleId} blob fetch error:`, err instanceof Error ? err.message : err);
    return { cache: null, source: "none" };
  }

  const baseUrl = process.env.PUZZLE_CACHE_BASE_URL;
  const attemptedBlobUrl =
    baseUrl && typeof baseUrl === "string"
      ? `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(puzzleId)}.json`
      : "(PUZZLE_CACHE_BASE_URL not set)";
  console.log(
    `[${LOG_SOURCE}] [debug] source=none puzzleId=${puzzleId} attemptedBlobUrl=${attemptedBlobUrl} PUZZLE_CACHE_BASE_URL=${baseUrl ? "set" : "unset"}`
  );
  return { cache: null, source: "none" };
}
