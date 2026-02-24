import { NextRequest, NextResponse } from "next/server";
import { getSupabase, hasSupabase } from "@/server/stores/supabaseClient";

export interface LeaderboardEntry {
  rank: number;
  label: string; // "Player 1", "Player 2", "You"
  isYou: boolean;
  isWin: boolean;
  guessCount: number;
  bestPercentile: number | null;
}

export async function GET(request: NextRequest) {
  const puzzleId = request.nextUrl.searchParams.get("puzzleId") ?? undefined;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  if (!puzzleId) {
    return NextResponse.json({ error: "puzzleId required." }, { status: 400 });
  }
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Leaderboard requires server storage." }, { status: 503 });
  }

  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from("runs")
      .select("session_id, is_win, guesses, best")
      .eq("puzzle_id", puzzleId)
      .not("ended_at", "is", null);

    if (error) throw error;

    const entries: { sessionId: string; isWin: boolean; guessCount: number; bestPercentile: number | null }[] =
      (rows ?? []).map((r) => {
        const best = r.best as { percentile?: number } | null;
        const guesses = Array.isArray(r.guesses) ? r.guesses as { percentile?: number | null }[] : [];
        const fromBest = best?.percentile ?? null;
        const fromGuesses =
          fromBest != null
            ? fromBest
            : guesses.length > 0
              ? Math.max(...guesses.map((g) => g.percentile ?? 0))
              : null;
        const bestPercentile = fromBest ?? (fromGuesses != null && fromGuesses > 0 ? fromGuesses : null);
        return {
          sessionId: r.session_id as string,
          isWin: r.is_win === true,
          guessCount: guesses.length,
          bestPercentile,
        };
      });

    entries.sort((a, b) => {
      if (a.isWin !== b.isWin) return a.isWin ? -1 : 1;
      if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount;
      const pa = a.bestPercentile ?? 0;
      const pb = b.bestPercentile ?? 0;
      return pb - pa; // higher percentile = better
    });

    const top = entries.slice(0, 20).map((e, i) => {
      const rank = i + 1;
      return {
        rank,
        label: e.sessionId === sessionId ? "You" : `Player ${rank}`,
        isYou: e.sessionId === sessionId,
      isWin: e.isWin,
      guessCount: e.guessCount,
      bestPercentile: e.bestPercentile,
      };
    });

    return NextResponse.json({ entries: top });
  } catch (e) {
    console.error("Leaderboard error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load leaderboard." },
      { status: 500 }
    );
  }
}
