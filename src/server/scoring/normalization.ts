/**
 * Normalize and validate guess input. Same rules everywhere for determinism.
 * Trim, lowercase, strip trailing punctuation; reject empty. Keeps validation and scoring consistent.
 */

export interface NormalizeOptions {
  allowPhrases: boolean;
  maxInputChars: number;
  allowedPunctuation?: string; // e.g. "'-" for apostrophe and hyphen
}

const DEFAULT_ALLOWED_PUNCTUATION = "'-";

/**
 * Strip trailing non-letter characters (punctuation, quotes, brackets, etc.).
 * One run from the end only; does NOT touch internal apostrophes/hyphens (e.g. can't, well-being).
 */
const TRAILING_NON_LETTERS = /[^a-zA-Z]+$/;

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: "EMPTY" | "NO_PHRASES" | "TOO_LONG" | "INVALID_CHARS"
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Canonical form for exact-match and target comparison.
 * Only: trim + strip trailing non-letters + lowercase. No mid-word changes.
 * Invalid characters inside the word are still rejected by validation (normalizeGuess).
 */
export function canonicalForComparison(word: string): string {
  const t = word.trim().replace(TRAILING_NON_LETTERS, "").trim();
  return t.toLowerCase();
}

/**
 * Trim, strip trailing non-letters, lowercase, collapse whitespace. Reject empty, phrases (if disallowed),
 * over length, and invalid characters (digits / punctuation except allowed). Internal apostrophes/hyphens kept.
 */
export function normalizeGuess(
  input: string,
  options: NormalizeOptions
): string {
  const allowed = options.allowedPunctuation ?? DEFAULT_ALLOWED_PUNCTUATION;
  const trimmed = input.trim().replace(TRAILING_NON_LETTERS, "").trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Guess cannot be empty.", "EMPTY");
  }
  const collapsed = trimmed.replace(/\s+/g, " ").toLowerCase();
  if (!options.allowPhrases && /\s/.test(collapsed)) {
    throw new ValidationError("Single word only.", "NO_PHRASES");
  }
  if (collapsed.length > options.maxInputChars) {
    throw new ValidationError(
      `Must be ${options.maxInputChars} characters or fewer.`,
      "TOO_LONG"
    );
  }
  const allowedSet = new Set(allowed.split(""));
  for (let i = 0; i < collapsed.length; i++) {
    const c = collapsed[i];
    if (/\d/.test(c)) {
      throw new ValidationError("No digits allowed.", "INVALID_CHARS");
    }
    if (/[^\w\s]/.test(c) && !allowedSet.has(c)) {
      throw new ValidationError(
        `Only letters, spaces, and ${allowed} are allowed.`,
        "INVALID_CHARS"
      );
    }
  }
  return collapsed;
}
