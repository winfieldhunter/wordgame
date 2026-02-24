import { dailyPuzzles } from "./dailyPuzzles";
import type { PuzzleDifficulty } from "./dailyPuzzles";
import { getPuzzleIdForDate, formatDateKey } from "./puzzleId";

export interface PuzzleDef {
  puzzleId: string;
  hints: string[];
  target: string;
  createdAt: string;
  mode: "daily" | "dev";
  difficulty?: PuzzleDifficulty;
}

/**
 * Get puzzle for a calendar date. Uses UTC date for determinism.
 */
export function getPuzzleForDate(date: Date): PuzzleDef | null {
  const key = formatDateKey(date);
  const found = dailyPuzzles.find((p) => p.date === key);
  if (!found) return null;
  const hintSet = found.hintsRiddle ?? found.hints;
  return {
    puzzleId: getPuzzleIdForDate(date),
    hints: [...hintSet],
    target: found.target.toLowerCase().trim(),
    createdAt: `${key}T12:00:00Z`,
    mode: "daily",
    difficulty: found.difficulty,
  };
}

/**
 * Get puzzle by ID. Supports daily-YYYY-MM-DD and dev-0001 style.
 */
export function getPuzzleById(puzzleId: string): PuzzleDef | null {
  const dailyMatch = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
  if (dailyMatch) {
    const [_, dateStr] = dailyMatch;
    const [y, m, d] = dateStr.split("-").map(Number);
    return getPuzzleForDate(new Date(Date.UTC(y, m - 1, d)));
  }
  if (puzzleId === "dev-0001") {
    return getDevPuzzle();
  }
  return null;
}

/**
 * Single dev puzzle for testing. Hint is human-sounding.
 */
function getDevPuzzle(): PuzzleDef {
  return {
    puzzleId: "dev-0001",
    hints: [
      "The feeling after everyone finally leaves.",
      "When the house is quiet and you can hear yourself think.",
    ],
    target: "peace",
    createdAt: "2026-02-22T12:00:00Z",
    mode: "dev",
    difficulty: "normal",
  };
}

/**
 * Today’s puzzle ID. A new puzzle is used each calendar day at midnight in PUZZLE_TIMEZONE (default America/New_York).
 */
export { getTodayPuzzleId } from "./puzzleId";
