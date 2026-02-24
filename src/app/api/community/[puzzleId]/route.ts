import { NextRequest, NextResponse } from "next/server";
import { runStore, aggregateStore } from "@/server/stores";
import { defaultGameConfig } from "@/config/gameConfig";

export async function GET(
  request: NextRequest,
  { params }: { params: { puzzleId: string } }
) {
  const puzzleId = params.puzzleId;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required.", code: "VALIDATION" },
      { status: 400 }
    );
  }

  if (!(await runStore.isCompleted(puzzleId, sessionId))) {
    return NextResponse.json(
      { error: "Complete the puzzle first to see community data.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const run = (await runStore.getRun(puzzleId, sessionId))!;
  const agg = await aggregateStore.getAggregate(puzzleId);
  const config = defaultGameConfig;

  if (!agg || !config.community.enabled) {
    return NextResponse.json({
      puzzleId,
      stats: { totalRuns: 0, winRate: 0, guessCountHistogram: [] },
      commonGuesses: [],
      commonTopGuesses: [],
      closestGuessesPublic: [],
      yourVsCrowd: {
        yourBestGuessIndex: run.best?.guessIndex ?? 0,
        medianBestGuessIndex: 0,
        youWere: "about_average" as const,
      },
    });
  }

  const totalRuns = agg.totalRuns;
  const winRate = totalRuns > 0 ? agg.totalWins / totalRuns : 0;
  const guessCountHistogram = Array.from(agg.guessCountHistogram.entries()).map(
    ([guessCount, runs]) => ({ guessCount, runs })
  );

  const commonGuesses = Array.from(agg.guessCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.community.publicLists.topCommon)
    .map(([guess, count]) => {
      const bucket = agg.closestGuessRankBuckets.get(guess);
      return {
        guess,
        count,
        band: bucket?.bandLabel ?? "—",
        emoji: bucket?.emoji ?? "",
      };
    });

  const commonTopGuesses = Array.from(agg.closeGuessCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.community.publicLists.topCloseCommon)
    .map(([guess, count]) => {
      const bucket = agg.closestGuessRankBuckets.get(guess);
      return {
        guess,
        count,
        band: bucket?.bandLabel ?? "—",
        emoji: bucket?.emoji ?? "",
      };
    });

  const closestGuessesPublic = Array.from(
    agg.closestGuessRankBuckets.entries()
  )
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, config.community.publicLists.topClosest)
    .map(([guess, data]) => ({
      guess,
      band: data.bandLabel,
      emoji: data.emoji,
      rankBucket: data.bestRankBucket,
    }));

  const myBestIndex = run.best?.guessIndex ?? 0;
  const counts = Array.from(agg.guessCountHistogram.entries())
    .sort((a, b) => a[0] - b[0]);
  let medianBestGuessIndex = 0;
  let acc = 0;
  const half = totalRuns / 2;
  for (const [idx, runs] of counts) {
    acc += runs;
    if (acc >= half) {
      medianBestGuessIndex = idx;
      break;
    }
  }

  let percentileOfYourEfficiency: number | undefined;
  let youWere: "ahead" | "behind" | "about_average" = "about_average";
  if (totalRuns > 1) {
    let behind = 0;
    for (const [guessCount, runs] of agg.guessCountHistogram) {
      if (guessCount > myBestIndex) behind += runs;
    }
    percentileOfYourEfficiency = 100 * (1 - behind / totalRuns);
    if (myBestIndex < medianBestGuessIndex) youWere = "ahead";
    else if (myBestIndex > medianBestGuessIndex) youWere = "behind";
  }

  return NextResponse.json({
    puzzleId,
    stats: {
      totalRuns,
      winRate,
      guessCountHistogram,
    },
    commonGuesses,
    commonTopGuesses,
    closestGuessesPublic,
    yourVsCrowd: {
      yourBestGuessIndex: myBestIndex,
      medianBestGuessIndex,
      percentileOfYourEfficiency,
      youWere,
    },
  });
}
