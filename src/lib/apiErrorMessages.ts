/**
 * Friendly UI messages for API error codes (guess, map, etc.).
 */

const MESSAGES: Record<string, string> = {
  PUZZLE_NOT_FOUND: "This puzzle isn't available right now.",
  CACHE_UNAVAILABLE: "Scoring is temporarily unavailable. Please try again in a minute.",
  EMBEDDING_UNAVAILABLE: "Scoring is temporarily unavailable. Please try again in a minute.",
  VALIDATION: "That word isn't in our dictionary.",
  RATE_LIMIT: "Too many guesses. Slow down.",
  RUN_ENDED: "This game is already over.",
};

export function getFriendlyErrorMessage(code: string | undefined, fallback: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback;
}
