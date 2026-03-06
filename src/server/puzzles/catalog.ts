import { dailyPuzzles } from "./dailyPuzzles";
import type { PuzzleDifficulty } from "./dailyPuzzles";
import type { PuzzleLevel } from "./puzzleId";
import { getPuzzleIdForDate, formatDateKey } from "./puzzleId";

export interface PuzzleDef {
  puzzleId: string;
  hints: string[];
  target: string;
  createdAt: string;
  mode: "daily" | "dev";
  difficulty?: PuzzleDifficulty;
  level?: PuzzleLevel;
}

/** Template week (Sun–Sat) for fallback when exact date not in catalog. */
const TEMPLATE_WEEK_START = "2026-02-22"; // Sunday

/**
 * Get day of week (0=Sun .. 6=Sat) for a date in UTC.
 */
function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Get puzzle for a calendar date and level. Uses UTC date for determinism.
 * Falls back to same-weekday template when date is outside the catalog (e.g. 2025 or far future).
 */
export function getPuzzleForDate(date: Date, level: PuzzleLevel): PuzzleDef | null {
  const key = formatDateKey(date);
  let found = dailyPuzzles.find((p) => p.date === key && p.level === level);
  if (!found) {
    const dow = getDayOfWeek(date);
    const [ty, tm, td] = TEMPLATE_WEEK_START.split("-").map(Number);
    const base = new Date(Date.UTC(ty, tm - 1, td));
    base.setUTCDate(base.getUTCDate() + dow);
    const templateKey = formatDateKey(base);
    found = dailyPuzzles.find((p) => p.date === templateKey && p.level === level);
  }
  if (!found) return null;
  return {
    puzzleId: getPuzzleIdForDate(date, level),
    hints: [...found.hints],
    target: found.target.toLowerCase().trim(),
    createdAt: `${key}T12:00:00Z`,
    mode: "daily",
    difficulty: found.difficulty,
    level: found.level,
  };
}

/**
 * Get puzzle by ID. Supports daily-YYYY-MM-DD-{easy|medium|hard}, legacy daily-YYYY-MM-DD (→ medium), and dev-0001.
 */
export function getPuzzleById(puzzleId: string): PuzzleDef | null {
  const withLevel = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})-(easy|medium|hard)$/);
  if (withLevel) {
    const [, dateStr, level] = withLevel;
    const [y, m, d] = dateStr!.split("-").map(Number);
    return getPuzzleForDate(new Date(Date.UTC(y, m - 1, d)), level as PuzzleLevel);
  }
  const legacyMatch = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
  if (legacyMatch) {
    const [, dateStr] = legacyMatch;
    const [y, m, d] = dateStr!.split("-").map(Number);
    return getPuzzleForDate(new Date(Date.UTC(y, m - 1, d)), "medium");
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
      "The opposite of chaos.",
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
export { getTodayPuzzleId, getTodayPuzzleIds } from "./puzzleId";
export type { PuzzleLevel } from "./puzzleId";
