import { NextRequest, NextResponse } from "next/server";
import { defaultGameConfig } from "@/config/gameConfig";
import { runStore, aggregateStore } from "@/server/stores";
import { runAggregation } from "@/server/aggregation";
import { formatShareText } from "@/lib/shareText";
import { getEmbeddingsProvider } from "@/server/embeddings/getProvider";
import { hasSupabase, getSupabase } from "@/server/stores/supabaseClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, puzzleId, displayName, hintsUsed } = body ?? {};

    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid or missing sessionId.", code: "VALIDATION" },
        { status: 400 }
      );
    }
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        { error: "Missing puzzleId.", code: "VALIDATION" },
        { status: 400 }
      );
    }

    let run = await runStore.getRun(puzzleId, sessionId);
    if (!run) {
      return NextResponse.json(
        { error: "No run found for this puzzle.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (run.endedAt == null) {
      await runStore.markEnded(
        puzzleId,
        sessionId,
        new Date().toISOString(),
        run.isWin === true
      );
      run = (await runStore.getRun(puzzleId, sessionId))!;
    }

    if (hasSupabase()) {
      const supabase = getSupabase();
      if (typeof hintsUsed === "number" && hintsUsed >= 1 && hintsUsed <= 3) {
        await supabase
          .from("runs")
          .update({ hints_used: hintsUsed })
          .eq("puzzle_id", puzzleId)
          .eq("session_id", sessionId);
      }
      if (typeof displayName === "string" && displayName.trim().length > 0) {
        await supabase.from("session_profiles").upsert(
          {
            session_id: sessionId,
            display_name: displayName.trim().slice(0, 100),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );
      }
    }

    await runAggregation(puzzleId, sessionId);

    const agg = await aggregateStore.getAggregate(puzzleId);
    const config = defaultGameConfig;
    if (agg && config.map.enabled && config.community.enabled) {
      const topByCount = Array.from(agg.guessCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, config.map.crowdTopN)
        .map(([guess]) => guess);
      if (topByCount.length > 0) {
        try {
          const provider = getEmbeddingsProvider();
          const embeddings = provider.embedBatch
            ? await provider.embedBatch.call(provider, topByCount)
            : await Promise.all(topByCount.map((t) => provider.embed(t)));
          const withEmbeddings = topByCount
            .map((guess, i) => ({
              guess,
              count: agg.guessCounts.get(guess) ?? 0,
              embedding: embeddings[i] ?? [],
            }))
            .filter((x) => x.embedding.length > 0);
          await aggregateStore.updateCrowdMapGuesses(puzzleId, withEmbeddings);
        } catch (e) {
          console.warn("Could not update crowd map embeddings:", e);
        }
      }
    }

    const shareText = formatShareText({
      puzzleId,
      guessCount: run.guesses.length,
      maxGuesses: defaultGameConfig.maxGuesses,
    });

    const runSummary = {
      totalGuesses: run.guesses.length,
      isWin: run.isWin === true,
      endedAt: run.endedAt,
      bestGuess: run.best
        ? {
            guess: run.best.normalizedGuess,
            percentile: run.best.percentile,
            guessIndex: run.best.guessIndex,
          }
        : null,
    };

    return NextResponse.json({
      runSummary,
      shareText,
      unlocked: true,
    });
  } catch (err) {
    console.error("POST /api/complete", err);
    return NextResponse.json(
      { error: "Something went wrong.", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
