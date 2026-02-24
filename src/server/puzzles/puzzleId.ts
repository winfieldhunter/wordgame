/**
 * Single source of truth for daily puzzle IDs. Uses UTC date only (no local timezone).
 * Runtime and precompute must both use these helpers so cache keys match.
 */

/**
 * Format a UTC date as YYYY-MM-DD (no time component).
 */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Puzzle ID for a given calendar day (UTC). Format: daily-YYYY-MM-DD.
 */
export function getPuzzleIdForDate(date: Date): string {
  return `daily-${formatDateKey(date)}`;
}

/**
 * Today's puzzle ID. A new puzzle is used each calendar day at midnight UTC.
 * Runtime and precompute scripts must both call this (or getPuzzleIdForDate with today) so the cache key matches.
 */
export function getTodayPuzzleId(): string {
  return getPuzzleIdForDate(new Date());
}
