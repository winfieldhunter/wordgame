import { NextRequest, NextResponse } from "next/server";
import { runStore, aggregateStore } from "@/server/stores";
import { defaultGameConfig } from "@/config/gameConfig";
import { computePCA } from "@/server/projection/pca";
import { loadPuzzleCache } from "@/server/puzzles/loadCache";
import { getPuzzleById } from "@/server/puzzles/catalog";
import { getEmbeddingsProvider } from "@/server/embeddings/getProvider";
import { canonicalForComparison } from "@/server/scoring/normalization";

export async function GET(
  request: NextRequest,
  { params }: { params: { puzzleId: string } }
) {
  const puzzleId = params.puzzleId;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
  const clientGuessesRaw = request.nextUrl.searchParams.getAll("clientGuesses");
  const clientGuesses = clientGuessesRaw.length > 0 ? clientGuessesRaw : undefined;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required.", code: "VALIDATION" },
      { status: 400 }
    );
  }

  if (!(await runStore.isCompleted(puzzleId, sessionId))) {
    return NextResponse.json(
      { error: "Complete the puzzle first to see the map.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const run = (await runStore.getRun(puzzleId, sessionId))!;
  let agg = await aggregateStore.getAggregate(puzzleId);
  const config = defaultGameConfig;
  const { cache } = await loadPuzzleCache(puzzleId);

  if (!config.map.enabled) {
    return NextResponse.json({
      puzzleId,
      projection: { method: "pca", dims: 2, points: [], viewport: { minX: 0, maxX: 1, minY: 0, maxY: 1 }, targetWordLength: 0 },
    });
  }

  const vectors: { id: string; vec: number[]; kind: "target" | "your_guess" | "crowd_guess"; label?: string; band?: string; emoji?: string; count?: number; percentile?: number | null; cosine?: number }[] = [];
  const allVecs: number[][] = [];

  const puzzle = getPuzzleById(puzzleId);
  const targetVec = cache?.targetEmbedding ?? new Array(1536).fill(0);
  allVecs.push(targetVec);
  vectors.push({ id: "target", vec: targetVec, kind: "target", label: puzzle?.target });

  const yourGuesses =
    clientGuesses != null && clientGuesses.length > 0
      ? clientGuesses
          .map((norm) => run.guesses.find((g) => canonicalForComparison(g.normalizedGuess) === canonicalForComparison(norm)))
          .filter((g): g is NonNullable<typeof g> => g != null && g.embedding != null && g.embedding.length > 0)
      : run.guesses.filter((g) => g.embedding != null && g.embedding.length > 0);

  for (let i = 0; i < yourGuesses.length; i++) {
    const g = yourGuesses[i];
    const vec = g.embedding!;
    allVecs.push(vec);
    const label = clientGuesses != null && clientGuesses.length > 0 ? clientGuesses[i]! : g.normalizedGuess;
    vectors.push({
      id: `you-${i}`,
      vec,
      kind: "your_guess",
      label,
      band: g.band.label,
      emoji: g.band.emoji,
      percentile: g.percentile ?? undefined,
      cosine: g.cosine,
    });
  }

  let crowdBackfillError: string | undefined;
  const crowdMapEmpty = !agg?.crowdMapGuesses?.length;
  const hasGuessCounts = agg && agg.guessCounts.size > 0;
  if (config.community.enabled && crowdMapEmpty && hasGuessCounts && agg) {
    const aggForBackfill = agg;
    try {
      const topN = Math.min(8, config.map.crowdTopN);
      const topByCount = Array.from(aggForBackfill.guessCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([guess]) => guess);
      if (topByCount.length > 0) {
        const provider = getEmbeddingsProvider();
        const embeddings = provider.embedBatch
          ? await provider.embedBatch.call(provider, topByCount)
          : await Promise.all(topByCount.map((t) => provider.embed(t)));
        const withEmbeddings = topByCount
          .map((guess, i) => ({
            guess,
            count: aggForBackfill.guessCounts.get(guess) ?? 0,
            embedding: embeddings[i] ?? [],
          }))
          .filter((x) => x.embedding.length > 0);
        if (withEmbeddings.length > 0) {
          await aggregateStore.updateCrowdMapGuesses(puzzleId, withEmbeddings);
          agg = await aggregateStore.getAggregate(puzzleId);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const lower = msg.toLowerCase();
      console.warn("Map crowd backfill failed:", e);
      if (msg.includes("OPENAI_API_KEY") || msg.includes("required")) {
        crowdBackfillError = "Embeddings API key not configured for this server. Add OPENAI_API_KEY in your deployment environment variables.";
      } else if (lower.includes("rate") || lower.includes("429") || lower.includes("quota")) {
        crowdBackfillError = "Embeddings rate limit hit. Try again in a minute.";
      } else if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("econnreset")) {
        crowdBackfillError = "Request timed out. Try again in a moment.";
      } else if (lower.includes("invalid") && lower.includes("key")) {
        crowdBackfillError = "Invalid API key. Check OPENAI_API_KEY in your deployment environment.";
      } else {
        crowdBackfillError = "Could not generate crowd map (embeddings failed). Try again later.";
      }
    }
  }

  const crowdSlice = (agg?.crowdMapGuesses ?? []).slice(0, config.map.crowdTopN);
  for (let i = 0; i < crowdSlice.length; i++) {
    const c = crowdSlice[i];
    allVecs.push(c.embedding);
    vectors.push({
      id: `crowd-${i}`,
      vec: c.embedding,
      kind: "crowd_guess",
      count: c.count,
    });
  }

  const { points } = computePCA(allVecs);
  // Center the map on the target (first point) so the red circle is in the middle
  // and every guess is closer or further from center.
  const targetPoint = points[0];
  const cx = targetPoint?.x ?? 0;
  const cy = targetPoint?.y ?? 0;
  const centeredPoints = points.map((p) => ({ x: p.x - cx, y: p.y - cy }));

  let maxAbs = 0;
  for (const p of centeredPoints) {
    maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y));
  }
  const pad = maxAbs * 0.15 || 1;
  const viewport = {
    minX: -maxAbs - pad,
    maxX: maxAbs + pad,
    minY: -maxAbs - pad,
    maxY: maxAbs + pad,
  };

  const targetCanonical = puzzle?.target != null ? canonicalForComparison(puzzle.target) : "";
  const pointsOut = vectors
    .map((v, idx) => {
      const p = centeredPoints[idx];
      if (!p) return null;
      const isTargetGuess =
        v.kind === "your_guess" &&
        targetCanonical !== "" &&
        canonicalForComparison(v.label ?? "") === targetCanonical;
      return {
        id: v.id,
        x: p.x,
        y: p.y,
        kind: v.kind,
        label: v.kind === "target" ? undefined : v.label,
        band: v.band,
        emoji: v.emoji,
        count: v.count,
        percentile: v.kind === "your_guess" ? v.percentile : undefined,
        cosine: v.kind === "your_guess" ? v.cosine : undefined,
        isTarget: isTargetGuess || undefined,
      };
    })
    .filter(Boolean);

  const targetWordLength = puzzle?.target?.length ?? 0;

  const projection = {
    method: "pca" as const,
    dims: 2,
    points: pointsOut,
    viewport,
    targetWordLength,
  };
  const body: { puzzleId: string; projection: typeof projection; crowdBackfillError?: string } = {
    puzzleId,
    projection,
  };
  if (crowdBackfillError) body.crowdBackfillError = crowdBackfillError;
  return NextResponse.json(body);
}
