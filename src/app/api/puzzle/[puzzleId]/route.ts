import { NextRequest, NextResponse } from "next/server";
import { getPuzzleById } from "@/server/puzzles/catalog";
import { runStore } from "@/server/stores";
import { defaultGameConfig, getPublicConfig } from "@/config/gameConfig";

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
  let letterHelp: { firstLetter: string; wordLength: number } | undefined;

  if (sessionId) {
    const run = await runStore.getRun(puzzleId, sessionId);
    const guessCount = run?.guesses.length ?? 0;
    if (
      config.letterHelp.revealAfterGuesses != null &&
      guessCount >= config.letterHelp.revealAfterGuesses
    ) {
      const trimmed = puzzle.target.trim();
      const words = trimmed.split(/\s+/);
      if (words.length === 1 && trimmed.length > 0) {
        letterHelp = {
          firstLetter: trimmed[0].toLowerCase(),
          wordLength: trimmed.length,
        };
      }
    }
  }

  const targetWordLength = puzzle.target.trim().split(/\s+/)[0]?.length ?? 0;

  const response: Record<string, unknown> = {
    hints,
    config: getPublicConfig(config),
    createdAt: puzzle.createdAt,
    mode: puzzle.mode,
    targetWordLength,
    difficulty: puzzle.difficulty ?? "normal",
    level: puzzle.level,
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
