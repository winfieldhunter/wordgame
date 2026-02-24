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

/**
 * Puzzle ID for a given calendar day (UTC). Format: daily-YYYY-MM-DD.
 */
export function getPuzzleIdForDate(date: Date): string {
  return `daily-${formatDateKey(date)}`;
}

/**
 * Today's puzzle ID. A new puzzle is used each calendar day at midnight in PUZZLE_TIMEZONE (default America/New_York).
 * Optional one-time shift: set PUZZLE_DATE_OFFSET_DAYS=1 and PUZZLE_OFFSET_APPLY_UNTIL=YYYY-MM-DD so that for dates <= that day we show the next day's puzzle (fresh for everyone). After that date, no offset.
 * Runtime and precompute must both call this so the cache key matches.
 */
export function getTodayPuzzleId(): string {
  let todayKey = getTodayDateKeyInZone();
  const offsetDays = PUZZLE_DATE_OFFSET_DAYS || 1; // default 1 for one-time shift when until is set
  if (PUZZLE_OFFSET_APPLY_UNTIL && todayKey <= PUZZLE_OFFSET_APPLY_UNTIL) {
    todayKey = addDaysToDateKey(todayKey, offsetDays);
  }
  return `daily-${todayKey}`;
}
