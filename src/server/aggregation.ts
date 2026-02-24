import { defaultGameConfig } from "@/config/gameConfig";
import { runStore, aggregateStore } from "@/server/stores";

function getRankBucket(percentile: number | null, buckets: number[]): string | null {
  if (percentile == null) return null;
  const sorted = [...buckets].sort((a, b) => b - a);
  for (const b of sorted) {
    if (percentile >= b) return `Top ${100 - b}%`;
  }
  return null;
}

function isCloseGuess(
  percentile: number | null,
  bandLabel: string,
  config: typeof defaultGameConfig
): boolean {
  if (percentile != null && percentile >= config.community.closePercentileMin)
    return true;
  const labels = config.community.closeBandLabels;
  return labels != null && labels.includes(bandLabel);
}

export async function runAggregation(puzzleId: string, sessionId: string): Promise<void> {
  const run = await runStore.getRun(puzzleId, sessionId);
  if (!run || run.endedAt == null) return;

  const config = defaultGameConfig;
  await aggregateStore.getOrCreateAggregate(puzzleId);

  await aggregateStore.incrementRun(puzzleId, run.isWin === true);
  await aggregateStore.recordGuessCount(puzzleId, run.guesses.length);

  const seenGuesses = new Set<string>();
  for (const g of run.guesses) {
    if (seenGuesses.has(g.normalizedGuess)) continue;
    seenGuesses.add(g.normalizedGuess);
    const rankBucket = getRankBucket(
      g.percentile,
      config.community.closestRankBuckets
    );
    const close = isCloseGuess(g.percentile, g.band.label, config);
    await aggregateStore.recordGuess(
      puzzleId,
      g.normalizedGuess,
      g.percentile,
      g.band.label,
      g.band.emoji,
      rankBucket,
      close
    );
  }

  // crowdMapGuesses is updated separately when we have embeddings (e.g. in complete handler after fetching)
}
