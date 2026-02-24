/**
 * Deterministic scoring: cosine similarity + percentile from precomputed distribution (50k vocab only).
 * Same target + same guess -> same score forever.
 * Display percentile is capped at 99.9% for non-target guesses in the API; only the exact word shows 100%.
 */

import { defaultGameConfig } from "@/config/gameConfig";
import type { GameConfig } from "@/config/gameConfig";
import { getBandFromScore } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface SortedSimilarityEntry {
  word: string;
  cosine: number;
}

/**
 * Compute percentile from cosine: rank in sorted list (0 = best), then
 * rank = number of vocab words with cosine strictly greater than guess.
 * percentile = 100 * (1 - rank / n). Higher percentile = closer.
 */
export function percentileFromSorted(
  guessCosine: number,
  sorted: SortedSimilarityEntry[]
): number {
  if (sorted.length === 0) return 0;
  const n = sorted.length;
  let lo = 0,
    hi = n;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid].cosine <= guessCosine) hi = mid;
    else lo = mid + 1;
  }
  const rank = lo;
  return 100 * (1 - rank / n);
}

export interface ComputeScoreInput {
  guessEmbedding: number[];
  targetEmbedding: number[];
  sortedDistribution: SortedSimilarityEntry[] | null;
  config: GameConfig;
}

export interface ComputeScoreResult {
  cosine: number;
  percentile: number | null;
  band: { label: string; emoji: string };
  percentileUnavailable?: boolean;
}

export function computeScore(input: ComputeScoreInput): ComputeScoreResult {
  const { guessEmbedding, targetEmbedding, sortedDistribution, config } = input;
  const cosine = cosineSimilarity(guessEmbedding, targetEmbedding);
  let percentile: number | null = null;
  let percentileUnavailable = false;
  if (sortedDistribution && sortedDistribution.length > 0) {
    percentile = percentileFromSorted(cosine, sortedDistribution);
  } else {
    percentileUnavailable = true;
  }
  const band = getBandFromScore(
    cosine,
    percentile,
    config.feedbackBands,
    config.scoreMode === "both" ? "percentile" : config.scoreMode
  );
  return {
    cosine: Math.round(cosine * 10000) / 10000,
    percentile: percentile !== null ? Math.round(percentile * 10) / 10 : null,
    band,
    percentileUnavailable: percentileUnavailable || undefined,
  };
}

export function checkWin(
  normalizedGuess: string,
  target: string,
  percentile: number | null,
  config: GameConfig
): boolean {
  const exactMatch =
    normalizedGuess.toLowerCase().trim() === target.toLowerCase().trim();
  if (exactMatch) return true;
  if (percentile !== null && percentile >= config.winPercentile) return true;
  return false;
}

export function checkLoss(
  guessIndex: number,
  maxGuesses: number | null
): boolean {
  return maxGuesses !== null && guessIndex >= maxGuesses;
}
