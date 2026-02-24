/**
 * Validates that a guess is a real English word (full dictionary, validation only).
 * Used to allow real words (faint, fall, etc.) and reject non-words (niquil).
 * Scoring and percentile use the 50k vocabulary only (precomputed puzzle cache).
 */

import { readFile } from "fs/promises";
import { join } from "path";

let cachedSet: Set<string> | null = null;

async function loadValidWords(): Promise<Set<string>> {
  if (cachedSet) return cachedSet;
  const dataDir = join(process.cwd(), "data");
  // Prefer full dictionary; fallback to 50k vocab if valid-words.txt not generated yet
  for (const file of ["valid-words.txt", "vocabulary.txt"]) {
    try {
      const raw = await readFile(join(dataDir, file), "utf-8");
      const words = raw
        .split(/\r?\n/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0 && /^[a-z'-]+$/.test(w));
      cachedSet = new Set(words);
      return cachedSet;
    } catch {
      continue;
    }
  }
  cachedSet = new Set();
  return cachedSet;
}

/**
 * Returns true if the lowercased word is in our dictionary (real word).
 * Always allow the puzzle target so the answer is never rejected.
 */
export async function isValidWord(word: string): Promise<boolean> {
  const w = word.trim().toLowerCase();
  if (!w || !/^[a-z'-]+$/.test(w)) return false;
  const set = await loadValidWords();
  return set.has(w);
}
