import { NextRequest, NextResponse } from "next/server";
import { getPuzzleById, getTodayPuzzleIds } from "@/server/puzzles/catalog";
import { runStore } from "@/server/stores";
import { defaultGameConfig, getPublicConfig } from "@/config/gameConfig";
import type { PuzzleLevel } from "@/server/puzzles/puzzleId";

const LEVEL_ORDER: PuzzleLevel[] = ["easy", "medium", "hard"];

export async function GET(request: NextRequest) {
  const ids = getTodayPuzzleIds();
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  const todayPuzzleIds = { easy: ids.easy, medium: ids.medium, hard: ids.hard };

  let currentPuzzleId: string;
  const completedLevels: PuzzleLevel[] = [];

  if (sessionId) {
    for (const level of LEVEL_ORDER) {
      const puzzleId = ids[level];
      const completed = await runStore.isCompleted(puzzleId, sessionId);
      if (completed) completedLevels.push(level);
    }
    const firstIncomplete = LEVEL_ORDER.find((level) => !completedLevels.includes(level));
    currentPuzzleId = firstIncomplete ? ids[firstIncomplete]! : ids.hard;
  } else {
    currentPuzzleId = ids.easy;
  }

  const puzzle = getPuzzleById(currentPuzzleId);
  if (!puzzle) {
    return NextResponse.json(
      { error: "No puzzle for today.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const level = puzzle.level ?? "easy";
  const config = defaultGameConfig;

  const hints = [...puzzle.hints];
  const firstWord = puzzle.target.trim().split(/\s+/)[0] ?? "";
  const firstLetter = firstWord[0]?.toUpperCase() ?? "";
  const wordLength = firstWord.length;
  if (hints.length >= 3 && wordLength > 0) {
    hints[2] = `Starts with "${firstLetter}", ${wordLength} letter${wordLength === 1 ? "" : "s"}.`;
  }
  let letterHelp: { firstLetter: string; wordLength: number } | undefined;

  if (sessionId) {
    const run = await runStore.getRun(currentPuzzleId, sessionId);
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
    puzzleId: currentPuzzleId,
    todayPuzzleIds,
    currentPuzzleId,
    completedLevels,
    level,
    hints,
    config: getPublicConfig(config),
    createdAt: puzzle.createdAt,
    mode: puzzle.mode,
    targetWordLength,
    difficulty: puzzle.difficulty ?? "normal",
  };
  if (letterHelp) response.letterHelp = letterHelp;

  if (sessionId) {
    const run = await runStore.getRun(currentPuzzleId, sessionId);
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
