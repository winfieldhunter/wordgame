import { NextRequest, NextResponse } from "next/server";
import { getSupabase, hasSupabase } from "@/server/stores/supabaseClient";
import { runStore } from "@/server/stores";

export interface GroupRankingEntry {
  sessionId: string;
  isYou: boolean;
  isWin: boolean;
  guessCount: number;
  bestPercentile: number | null;
  bestGuess: string | null;
  rank: number;
}

export async function GET(request: NextRequest) {
  const puzzleId = request.nextUrl.searchParams.get("puzzleId") ?? undefined;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
  const code = request.nextUrl.searchParams.get("code")?.trim()?.toUpperCase();

  if (!puzzleId || !sessionId || !code) {
    return NextResponse.json(
      { error: "puzzleId, sessionId, and code are required." },
      { status: 400 }
    );
  }
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Groups require server storage." }, { status: 503 });
  }

  try {
    const supabase = getSupabase();
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("session_id")
      .eq("code", code);
    if (membersError) throw membersError;
    if (!members?.length) {
      return NextResponse.json({ rankings: [], youRank: null, inGroup: false });
    }

    const sessionIds = members.map((m) => m.session_id as string);
    const entries: GroupRankingEntry[] = [];

    for (const sid of sessionIds) {
      const run = await runStore.getRun(puzzleId, sid);
      if (!run?.endedAt) continue;
      const guessCount = run.guesses.length;
      const bestPercentile = run.best?.percentile ?? null;
      const bestGuess = run.best?.normalizedGuess ?? null;
      const isWin = run.isWin === true;
      entries.push({
        sessionId: sid,
        isYou: sid === sessionId,
        isWin,
        guessCount,
        bestPercentile,
        bestGuess,
        rank: 0,
      });
    }

    entries.sort((a, b) => {
      if (a.isWin !== b.isWin) return a.isWin ? -1 : 1;
      if (a.isWin && b.isWin) return a.guessCount - b.guessCount;
      const pa = a.bestPercentile ?? 0;
      const pb = b.bestPercentile ?? 0;
      return pb - pa;
    });

    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    const youRank = entries.findIndex((e) => e.isYou) + 1 || null;

    return NextResponse.json({
      rankings: entries,
      youRank,
      inGroup: true,
    });
  } catch (e) {
    console.error("Group ranking error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load ranking." },
      { status: 500 }
    );
  }
}
