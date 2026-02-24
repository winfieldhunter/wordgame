import { NextRequest, NextResponse } from "next/server";
import { defaultGameConfig, getPublicConfig } from "@/config/gameConfig";
import { normalizeGuess, canonicalForComparison, ValidationError } from "@/server/scoring/normalization";
import { computeScore, checkLoss } from "@/server/scoring/scoring";
import type { GuessEntry } from "@/server/scoring/types";
import { runStore } from "@/server/stores";
import { checkRateLimit } from "@/server/stores/rateLimit";
import { getPuzzleById } from "@/server/puzzles/catalog";
import { loadPuzzleCache } from "@/server/puzzles/loadCache";
import { getEmbeddingsProvider } from "@/server/embeddings/getProvider";
import { isValidWord } from "@/server/validation/validWords";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, puzzleId, guess } = body ?? {};

    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid or missing sessionId (UUID required).", code: "VALIDATION" },
        { status: 400 }
      );
    }
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        { error: "Missing puzzleId.", code: "VALIDATION" },
        { status: 400 }
      );
    }
    if (typeof guess !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid guess.", code: "VALIDATION" },
        { status: 400 }
      );
    }

    const config = defaultGameConfig;
    const rate = checkRateLimit(sessionId, config.rateLimitPerMinute);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many guesses. Slow down.",
          code: "RATE_LIMIT",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    let normalized: string;
    try {
      normalized = normalizeGuess(guess, {
        allowPhrases: config.allowPhrases,
        maxInputChars: config.maxInputChars,
      });
    } catch (e) {
      if (e instanceof ValidationError) {
        return NextResponse.json(
          { error: e.message, code: e.code },
          { status: 400 }
        );
      }
      throw e;
    }

    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    let run = await runStore.getRun(puzzleId, sessionId);
    if (run?.endedAt != null) {
      return NextResponse.json(
        { error: "This run is already over.", code: "RUN_ENDED" },
        { status: 400 }
      );
    }

    let cacheResult = await loadPuzzleCache(puzzleId);
    const cache = cacheResult.cache;

    const puzzleTargetNormalized = canonicalForComparison(puzzle.target);
    // Real words only: full dictionary (valid-words.txt). Puzzle target always allowed.
    const allowed = normalized === puzzleTargetNormalized || (await isValidWord(normalized));
    if (!allowed) {
      return NextResponse.json(
        {
          error: "That word isn't in our dictionary.",
          code: "VALIDATION",
        },
        { status: 400 }
      );
    }

    let targetEmbedding: number[];
    let guessEmbedding: number[];
    let scoreResult: ReturnType<typeof computeScore>;
    try {
      targetEmbedding =
        cache?.targetEmbedding ??
        (await getEmbeddingsProvider().embed(puzzle.target));
      guessEmbedding = await getEmbeddingsProvider().embed(normalized);
      scoreResult = computeScore({
        guessEmbedding,
        targetEmbedding,
        sortedDistribution: cache?.sortedBySimilarity ?? null,
        config,
      });
    } catch (err) {
      console.error("POST /api/guess embedding or scoring failed", err);
      return NextResponse.json(
        { error: "Scoring is temporarily unavailable. Please try again in a minute.", code: "EMBEDDING_UNAVAILABLE" },
        { status: 503, headers: { "Retry-After": "60" } }
      );
    }

    const guessIndex = run ? run.guesses.length + 1 : 1;
    const exactMatch = normalized === puzzleTargetNormalized;
    const isLoss = checkLoss(guessIndex, config.maxGuesses);

    // Stable cap: non-target guesses never exceed 99.9%; 100% reserved for exact answer only
    const MAX_PERCENTILE_NON_TARGET = 99.9;
    const displayPercentile = exactMatch
      ? (scoreResult.percentile ?? 100)
      : scoreResult.percentile != null
        ? Math.min(MAX_PERCENTILE_NON_TARGET, scoreResult.percentile)
        : null;

    // Win is based only on normalized guess === normalized target; not percentile
    const isWin = exactMatch;
    const runEnded = isLoss || exactMatch;

    // "Bullseye" only when they hit the exact word; top tier otherwise is "Scorching"
    const band = exactMatch ? { label: "Bullseye", emoji: "" } : scoreResult.band;

    const entry: GuessEntry = {
      guess,
      normalizedGuess: normalized,
      cosine: scoreResult.cosine,
      percentile: displayPercentile,
      band,
      guessIndex,
      createdAt: new Date().toISOString(),
      embedding: guessEmbedding,
    };

    if (!run) {
      run = {
        createdAt: new Date().toISOString(),
        endedAt: null,
        isWin: null,
        guesses: [],
        best: null,
      };
      await runStore.saveRun(puzzleId, sessionId, run);
    }

    const cosineOnly = cache == null || scoreResult.percentileUnavailable;
    const prevBestCosine = run.best?.cosine ?? null;
    const newBest =
      run.best == null
        ? { normalizedGuess: normalized, percentile: displayPercentile, cosine: scoreResult.cosine, guessIndex }
        : cosineOnly
          ? scoreResult.cosine > (prevBestCosine ?? 0)
            ? { normalizedGuess: normalized, percentile: null, cosine: scoreResult.cosine, guessIndex }
            : run.best
          : displayPercentile != null && displayPercentile >= (run.best.percentile ?? 0)
            ? { normalizedGuess: normalized, percentile: displayPercentile, cosine: scoreResult.cosine, guessIndex }
            : run.best;

    const warmerOrColder =
      cosineOnly
        ? prevBestCosine == null
          ? "same"
          : scoreResult.cosine > prevBestCosine
            ? "warmer"
            : scoreResult.cosine < prevBestCosine
              ? "colder"
              : "same"
        : displayPercentile == null || run.best?.percentile == null
          ? "same"
          : displayPercentile > (run.best.percentile ?? 0)
            ? "warmer"
            : displayPercentile < (run.best.percentile ?? 0)
              ? "colder"
              : "same";

    await runStore.appendGuess(puzzleId, sessionId, entry, newBest);

    if (runEnded) {
      await runStore.markEnded(
        puzzleId,
        sessionId,
        new Date().toISOString(),
        exactMatch
      );
    }

    const allGuesses = [...(run.guesses ?? []), entry];
    const topGuesses = [...allGuesses]
      .sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))
      .slice(0, 3)
      .map((g) => ({
        normalizedGuess: g.normalizedGuess,
        percentile: g.percentile,
        cosine: g.cosine,
        guessIndex: g.guessIndex,
      }));

    const percentileLabel = exactMatch
      ? "Exact match"
      : displayPercentile != null
        ? `Closer than ${displayPercentile.toFixed(1)}% of words`
        : null;

    const response: Record<string, unknown> = {
      normalizedGuess: normalized,
      cosine: scoreResult.cosine,
      percentile: displayPercentile,
      percentileLabel: percentileLabel ?? undefined,
      band,
      warmerOrColder,
      isWin,
      isLoss,
      runEnded,
      guessIndex,
      topGuesses,
    };
    if (cosineOnly) {
      response.percentileUnavailable = true;
      response.scoringMode = "cosine_only";
      response.code = "COSINE_ONLY";
      response.message = "Ranking temporarily unavailable — showing similarity only.";
    }
    if (runEnded) {
      response.revealedTarget = puzzle.target;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("POST /api/guess", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Something went wrong.", code: "INTERNAL", details: message },
      { status: 500 }
    );
  }
}
