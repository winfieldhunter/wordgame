import { NextRequest, NextResponse } from "next/server";
import { getPuzzleById } from "@/server/puzzles/catalog";
import { runStore } from "@/server/stores";
import { defaultGameConfig, getPublicConfig } from "@/config/gameConfig";
import { getThemeForDateKey, getFormattedDateForDisplay } from "@/server/puzzles/puzzleId";

export async function GET(
  request: NextRequest,
  { params }: { params: { puzzleId: string } }
) {
  const puzzleId = params.puzzleId;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) {
    return NextResponse.json(
      { error: "Puzzle not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const config = defaultGameConfig;
  const hints = [...puzzle.hints];
  const firstWord = puzzle.target.trim().split(/\s+/)[0] ?? "";
  const firstLetter = firstWord[0]?.toUpperCase() ?? "";
  const wordLength = firstWord.length;
  if (hints.length >= 3 && wordLength > 0) {
    hints[2] = `Starts with "${firstLetter}", ${wordLength} letter${wordLength === 1 ? "" : "s"}.`;
  }
  let letterHelp: { firstLetter: string; wordLength: number } | undefined;
  const trimmed = puzzle.target.trim();
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && trimmed.length > 0) {
    letterHelp = {
      firstLetter: trimmed[0].toLowerCase(),
      wordLength: trimmed.length,
    };
  }

  const targetWordLength = puzzle.target.trim().split(/\s+/)[0]?.length ?? 0;

  const dateMatch = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})-/);
  const dateKey = dateMatch?.[1] ?? "";
  const theme = dateKey ? getThemeForDateKey(dateKey) : "";
  const formattedDate = dateKey ? getFormattedDateForDisplay(dateKey) : "";

  const response: Record<string, unknown> = {
    hints,
    config: getPublicConfig(config),
    createdAt: puzzle.createdAt,
    mode: puzzle.mode,
    targetWordLength,
    difficulty: puzzle.difficulty ?? "normal",
    level: puzzle.level,
    theme,
    formattedDate,
  };
  if (letterHelp) response.letterHelp = letterHelp;

  if (sessionId) {
    const run = await runStore.getRun(puzzleId, sessionId);
    if (run?.endedAt != null && run.isWin === false) {
      response.revealedTarget = puzzle.target;
    }
  }

  return NextResponse.json(response);
}
