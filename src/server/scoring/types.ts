import type { FeedbackBand } from "@/config/gameConfig";

/** Calibrated cosine → 0–100 for bands in cosine-only mode. Easy to tune. */
export const COS_MIN = 0.1;
export const COS_MAX = 0.5;

/**
 * Map raw cosine (0–1) to a 0–100 score for band thresholds in cosine-only mode.
 * cos <= COS_MIN => 0; cos >= COS_MAX => 100; linear in between.
 */
export function cosineToScore100(cos: number): number {
  const t = (cos - COS_MIN) / (COS_MAX - COS_MIN);
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * 100;
}

export interface BandResult {
  label: string;
  emoji: string;
}

export interface ScoreResult {
  cosine: number;
  percentile: number | null;
  band: BandResult;
  percentileUnavailable?: boolean;
}

export interface GuessEntry {
  guess: string;
  normalizedGuess: string;
  cosine: number;
  percentile: number | null;
  band: BandResult;
  guessIndex: number;
  createdAt: string;
  embedding?: number[];
}

export function getBandFromScore(
  cosine: number,
  percentile: number | null,
  feedbackBands: FeedbackBand[],
  scoreMode: "cosine" | "percentile" | "both"
): BandResult {
  // Bands use 0–100 scale; in cosine-only mode use calibrated mapping
  const value =
    scoreMode === "cosine"
      ? cosineToScore100(cosine)
      : (percentile ?? cosineToScore100(cosine));
  const sorted = [...feedbackBands].sort((a, b) => b.min - a.min);
  for (const band of sorted) {
    if (value >= band.min) return { label: band.label, emoji: band.emoji };
  }
  return (
    sorted[sorted.length - 1] ?? { min: 0, label: "Cold", emoji: "" }
  ) as BandResult;
}
