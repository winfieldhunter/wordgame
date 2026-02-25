import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, getSupabase } from "@/server/stores/supabaseClient";
import { getPuzzleById } from "@/server/puzzles/catalog";
import type { PuzzleLevel } from "@/server/puzzles/puzzleId";

const LEVEL_ORDER: PuzzleLevel[] = ["easy", "medium", "hard"];

function parsePuzzleId(puzzleId: string): { date: string; level: PuzzleLevel } | null {
  const m = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})-(easy|medium|hard)$/);
  if (m) return { date: m[1]!, level: m[2] as PuzzleLevel };
  const legacy = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
  if (legacy) return { date: legacy[1]!, level: "medium" };
  return null;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required." }, { status: 400 });
  }
  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "History requires server storage." },
      { status: 503 }
    );
  }

  try {
    const supabase = getSupabase();

    const [profileRes, runsRes] = await Promise.all([
      supabase
        .from("session_profiles")
        .select("display_name")
        .eq("session_id", sessionId)
        .single(),
      supabase
        .from("runs")
        .select("puzzle_id, is_win, guesses, best, hints_used")
        .eq("session_id", sessionId)
        .not("ended_at", "is", null),
    ]);

    const displayName = profileRes.data?.display_name ?? null;
    const runs = runsRes.data ?? [];
    const runsByDate = new Map<
      string,
      { level: PuzzleLevel; isWin: boolean; guessCount: number; hintsUsed: number | null; bestPercentile: number | null; bestGuess: string | null }[]
    >();

    for (const r of runs) {
      const parsed = parsePuzzleId(r.puzzle_id);
      if (!parsed) continue;
      const { date, level } = parsed;
      const guesses = Array.isArray(r.guesses) ? r.guesses : [];
      const best = r.best as { percentile?: number | null; normalizedGuess?: string } | null;
      const bestPercentile = best?.percentile ?? null;
      const bestGuess = best?.normalizedGuess ?? null;
      if (!runsByDate.has(date)) runsByDate.set(date, []);
      runsByDate.get(date)!.push({
        level,
        isWin: r.is_win === true,
        guessCount: guesses.length,
        hintsUsed: r.hints_used ?? null,
        bestPercentile,
        bestGuess,
      });
    }

    const days: {
      date: string;
      dailyScore: number;
      levels: {
        level: PuzzleLevel;
        isWin: boolean;
        guessCount: number;
        hintsUsed: number | null;
        bestPercentile: number | null;
        bestGuess: string | null;
        target: string | null;
        hints: string[];
      }[];
    }[] = [];

    for (const [date, levelRuns] of runsByDate.entries()) {
      const levelMap = new Map(levelRuns.map((r) => [r.level, r]));
      let dailyScore = 0;
      const levels = LEVEL_ORDER.map((level) => {
        const run = levelMap.get(level);
        const puzzle = getPuzzleById(`daily-${date}-${level}`);
        if (run) {
          dailyScore += run.bestPercentile ?? 0;
          return {
            level,
            isWin: run.isWin,
            guessCount: run.guessCount,
            hintsUsed: run.hintsUsed,
            bestPercentile: run.bestPercentile,
            bestGuess: run.bestGuess,
            target: puzzle?.target ?? null,
            hints: puzzle?.hints ?? [],
          };
        }
        return {
          level,
          isWin: false,
          guessCount: 0,
          hintsUsed: null,
          bestPercentile: null,
          bestGuess: null,
          target: puzzle?.target ?? null,
          hints: puzzle?.hints ?? [],
        };
      });
      days.push({ date, dailyScore, levels });
    }

    days.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ displayName, days });
  } catch (e) {
    console.error("GET /api/history", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load history." },
      { status: 500 }
    );
  }
}
