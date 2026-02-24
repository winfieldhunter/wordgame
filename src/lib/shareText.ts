/**
 * Spoiler-safe share text: puzzle id and guess count. No guessed words or bands.
 */

export interface ShareInput {
  puzzleId: string;
  guessCount: number;
  maxGuesses: number | null;
  bands?: string[];
}

export function formatShareText(input: ShareInput): string {
  const { puzzleId, guessCount, maxGuesses } = input;
  const attemptStr =
    maxGuesses != null ? `${guessCount}/${maxGuesses} guesses` : `${guessCount} guesses`;
  return `NearWord #${puzzleId}\n${attemptStr}`;
}
