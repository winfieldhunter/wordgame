/**
 * Single source of truth for gameplay. All behavior reads from this config.
 * Tune maxGuesses, win threshold, hints, and feedback here.
 */

export type ScoreMode = "cosine" | "percentile" | "both";

export interface FeedbackBand {
  min: number;
  label: string;
  emoji: string;
}

export interface CommunityConfig {
  enabled: boolean;
  revealOnlyAfterComplete: true;
  aggregationFlushMinutes: number;
  publicLists: { topCommon: number; topCloseCommon: number; topClosest: number };
  closestRankBuckets: number[];
  closePercentileMin: number;
  closeBandLabels?: string[];
}

export interface MapConfig {
  enabled: boolean;
  method: "pca";
  crowdTopN: number;
  crowdDownsampleTo: number | null;
  gridBinning: { enabled: boolean; bins: number };
}

export interface ProgressiveHintsConfig {
  revealSecondHintAfterGuesses: number;
}

export interface LetterHelpConfig {
  revealAfterGuesses: number;
  showFirstLetter: boolean;
  showWordLength: boolean;
}

export interface GameConfig {
  maxGuesses: number | null;
  winPercentile: number;
  allowPhrases: boolean;
  maxInputChars: number;
  rateLimitPerMinute: number;
  scoreMode: ScoreMode;
  feedbackBands: FeedbackBand[];
  progressiveHints: ProgressiveHintsConfig;
  letterHelp: LetterHelpConfig;
  community: CommunityConfig;
  map: MapConfig;
}

export const defaultGameConfig: GameConfig = {
  maxGuesses: 8,
  winPercentile: 99.5,
  allowPhrases: false,
  maxInputChars: 40,
  rateLimitPerMinute: 30,
  scoreMode: "both",
  feedbackBands: [
    { min: 99.5, label: "Scorching", emoji: "" },
    { min: 99, label: "On fire", emoji: "" },
    { min: 97, label: "So close", emoji: "" },
    { min: 95, label: "Very hot", emoji: "" },
    { min: 92, label: "Hot", emoji: "" },
    { min: 88, label: "Getting warm", emoji: "" },
    { min: 82, label: "Warmer", emoji: "" },
    { min: 72, label: "Lukewarm", emoji: "" },
    { min: 58, label: "Tepid", emoji: "" },
    { min: 42, label: "Cool", emoji: "" },
    { min: 28, label: "Chilly", emoji: "" },
    { min: 15, label: "Cold", emoji: "" },
    { min: 5, label: "Ice cold", emoji: "" },
    { min: 0, label: "Freezing", emoji: "" },
  ],
  progressiveHints: {
    revealSecondHintAfterGuesses: 3,
  },
  letterHelp: {
    revealAfterGuesses: 4,
    showFirstLetter: true,
    showWordLength: true,
  },
  community: {
    enabled: true,
    revealOnlyAfterComplete: true,
    aggregationFlushMinutes: 10,
    publicLists: { topCommon: 20, topCloseCommon: 20, topClosest: 20 },
    closestRankBuckets: [99.5, 99, 95, 90],
    closePercentileMin: 90,
    closeBandLabels: ["Bullseye", "Scorching", "On fire", "So close", "Very hot", "Hot", "Getting warm"],
  },
  map: {
    enabled: true,
    method: "pca",
    crowdTopN: 300,
    crowdDownsampleTo: null,
    gridBinning: { enabled: true, bins: 60 },
  },
};

/** Safe subset for client (no internal keys). */
export function getPublicConfig(config: GameConfig) {
  return {
    maxGuesses: config.maxGuesses,
    winPercentile: config.winPercentile,
    allowPhrases: config.allowPhrases,
    maxInputChars: config.maxInputChars,
    scoreMode: config.scoreMode,
    feedbackBands: config.feedbackBands,
    progressiveHints: config.progressiveHints,
    letterHelp: config.letterHelp,
    communityEnabled: config.community.enabled,
    mapEnabled: config.map.enabled,
  };
}
