/**
 * Single source of truth for daily puzzle IDs.
 * "Today" uses PUZZLE_TIMEZONE (midnight in that zone); calendar lookups use UTC date.
 * Runtime and precompute must both use these helpers so cache keys match.
 */

/** Timezone for when the day flips (midnight). Set PUZZLE_TIMEZONE env to override. */
const PUZZLE_TIMEZONE = process.env.PUZZLE_TIMEZONE ?? "America/New_York";

/** One-time shift: add this many days to "today" when today <= PUZZLE_OFFSET_APPLY_UNTIL (or hardcoded fallback). */
const PUZZLE_DATE_OFFSET_DAYS = parseInt(process.env.PUZZLE_DATE_OFFSET_DAYS ?? "0", 10) || 0;
/** Only apply offset when today (in zone) is <= this date. Env override; hardcoded one-time fallback 2026-02-24 so that day shows 2/25's puzzle. Set to "" to disable. */
const PUZZLE_OFFSET_APPLY_UNTIL = (process.env.PUZZLE_OFFSET_APPLY_UNTIL ?? "2026-02-24").trim();

/**
 * Format a UTC date as YYYY-MM-DD (no time component). Used for calendar lookups (e.g. getPuzzleById).
 */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Today's date (YYYY-MM-DD) in the puzzle timezone. New puzzle at midnight in that zone.
 */
function getTodayDateKeyInZone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PUZZLE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Add N calendar days to a YYYY-MM-DD string. Returns YYYY-MM-DD. */
function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type PuzzleLevel = "easy" | "medium" | "hard";

const LEVELS: PuzzleLevel[] = ["easy", "medium", "hard"];

/**
 * Puzzle ID for a given calendar day (UTC). Format: daily-YYYY-MM-DD or daily-YYYY-MM-DD-{level}.
 */
export function getPuzzleIdForDate(date: Date, level?: PuzzleLevel): string {
  const key = formatDateKey(date);
  if (level) return `daily-${key}-${level}`;
  return `daily-${key}`;
}

/**
 * Today's date key (with optional offset). Used to derive today's puzzle IDs.
 */
function getTodayKeyWithOffset(): string {
  let todayKey = getTodayDateKeyInZone();
  const offsetDays = PUZZLE_DATE_OFFSET_DAYS || 1;
  if (PUZZLE_OFFSET_APPLY_UNTIL && todayKey <= PUZZLE_OFFSET_APPLY_UNTIL) {
    todayKey = addDaysToDateKey(todayKey, offsetDays);
  }
  return todayKey;
}

/**
 * Today's three puzzle IDs (easy, medium, hard). A new set each calendar day at midnight in PUZZLE_TIMEZONE.
 */
export function getTodayPuzzleIds(): { easy: string; medium: string; hard: string } {
  const key = getTodayKeyWithOffset();
  return {
    easy: `daily-${key}-easy`,
    medium: `daily-${key}-medium`,
    hard: `daily-${key}-hard`,
  };
}

/**
 * Today's puzzle ID (legacy: returns easy). Use getTodayPuzzleIds() for three-per-day.
 */
export function getTodayPuzzleId(): string {
  return getTodayPuzzleIds().easy;
}

/** Day-of-week themes: Sun=Time, Mon=Emotions, Tue=Nature, Wed=Places, Thu=Actions, Fri=People, Sat=Senses */
const DAY_OF_WEEK_THEMES: Record<number, string> = {
  0: "Time",
  1: "Emotions",
  2: "Nature",
  3: "Places",
  4: "Actions",
  5: "People",
  6: "Senses",
};

/**
 * Get theme for a puzzle date (YYYY-MM-DD). Uses day of week in PUZZLE_TIMEZONE.
 */
export function getThemeForDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: PUZZLE_TIMEZONE, weekday: "short" });
  const dayName = formatter.format(date);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dayMap[dayName] ?? 0;
  return DAY_OF_WEEK_THEMES[dow] ?? "General";
}

/**
 * Format date key for display (e.g. "Feb 28, 2026").
 */
export function getFormattedDateForDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PUZZLE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
