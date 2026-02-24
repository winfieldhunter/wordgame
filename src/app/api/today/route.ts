import { NextRequest, NextResponse } from "next/server";
import { getPuzzleById, getTodayPuzzleId } from "@/server/puzzles/catalog";
import { runStore } from "@/server/stores";
import { defaultGameConfig, getPublicConfig } from "@/config/gameConfig";

export async function GET(request: NextRequest) {
  const puzzleId = getTodayPuzzleId();
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) {
    return NextResponse.json(
      { error: "No puzzle for today.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const config = defaultGameConfig;
  let hints = [puzzle.hints[0]];
  let letterHelp: { firstLetter: string; wordLength: number } | undefined;

  if (sessionId) {
    const run = await runStore.getRun(puzzleId, sessionId);
    const guessCount = run?.guesses.length ?? 0;
    if (guessCount >= config.progressiveHints.revealSecondHintAfterGuesses && puzzle.hints[1]) {
      hints = [...puzzle.hints];
    }
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
    puzzleId,
    hints,
    config: getPublicConfig(config),
    createdAt: puzzle.createdAt,
    mode: puzzle.mode,
    targetWordLength,
    difficulty: puzzle.difficulty ?? "normal",
  };
  if (letterHelp) response.letterHelp = letterHelp;

  if (sessionId) {
    const run = await runStore.getRun(puzzleId, sessionId);
    if (run?.endedAt != null) {
      response.runEnded = true;
      response.revealedTarget = puzzle.target;
      response.isWin = run.isWin === true;
      response.isLoss = run.isWin === false;
      response.guesses = run.guesses.map((g) => ({
        normalizedGuess: g.normalizedGuess,
        cosine: g.cosine,
        percentile: g.percentile,
        band: g.band,
        guessIndex: g.guessIndex,
      }));
    }
  }

  return NextResponse.json(response);
}
