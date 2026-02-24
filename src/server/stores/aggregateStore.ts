/**
 * Per-puzzle public aggregations. Updated only when a run completes.
 */

export interface ClosestGuessBucket {
  bandLabel: string;
  emoji: string;
  bestRankBucket: string;
  count: number;
}

export interface CrowdMapGuess {
  guess: string;
  count: number;
  embedding: number[];
}

export interface PuzzleAggregate {
  totalRuns: number;
  totalWins: number;
  guessCountHistogram: Map<number, number>;
  guessCounts: Map<string, number>;
  closeGuessCounts: Map<string, number>;
  closestGuessRankBuckets: Map<string, ClosestGuessBucket>;
  crowdMapGuesses: CrowdMapGuess[];
}

export interface AggregateStore {
  getAggregate(puzzleId: string): Promise<PuzzleAggregate | null>;
  getOrCreateAggregate(puzzleId: string): Promise<PuzzleAggregate>;
  incrementRun(puzzleId: string, isWin: boolean): Promise<void>;
  recordGuessCount(puzzleId: string, count: number): Promise<void>;
  recordGuess(
    puzzleId: string,
    normalizedGuess: string,
    percentile: number | null,
    bandLabel: string,
    emoji: string,
    rankBucket: string | null,
    isClose: boolean
  ): Promise<void>;
  updateCrowdMapGuesses(
    puzzleId: string,
    guesses: { guess: string; count: number; embedding: number[] }[]
  ): Promise<void>;
}

function newAggregate(): PuzzleAggregate {
  return {
    totalRuns: 0,
    totalWins: 0,
    guessCountHistogram: new Map(),
    guessCounts: new Map(),
    closeGuessCounts: new Map(),
    closestGuessRankBuckets: new Map(),
    crowdMapGuesses: [],
  };
}

export class InMemoryAggregateStore implements AggregateStore {
  private aggregates = new Map<string, PuzzleAggregate>();

  async getAggregate(puzzleId: string): Promise<PuzzleAggregate | null> {
    return this.aggregates.get(puzzleId) ?? null;
  }

  async getOrCreateAggregate(puzzleId: string): Promise<PuzzleAggregate> {
    let agg = this.aggregates.get(puzzleId);
    if (!agg) {
      agg = newAggregate();
      this.aggregates.set(puzzleId, agg);
    }
    return agg;
  }

  async incrementRun(puzzleId: string, isWin: boolean): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    agg.totalRuns++;
    if (isWin) agg.totalWins++;
  }

  async recordGuessCount(puzzleId: string, count: number): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    const prev = agg.guessCountHistogram.get(count) ?? 0;
    agg.guessCountHistogram.set(count, prev + 1);
  }

  async recordGuess(
    puzzleId: string,
    normalizedGuess: string,
    percentile: number | null,
    bandLabel: string,
    emoji: string,
    rankBucket: string | null,
    isClose: boolean
  ): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    const gc = agg.guessCounts.get(normalizedGuess) ?? 0;
    agg.guessCounts.set(normalizedGuess, gc + 1);
    if (isClose) {
      const cc = agg.closeGuessCounts.get(normalizedGuess) ?? 0;
      agg.closeGuessCounts.set(normalizedGuess, cc + 1);
    }
    if (rankBucket) {
      const existing = agg.closestGuessRankBuckets.get(normalizedGuess);
      if (!existing || rankBucket < existing.bestRankBucket) {
        agg.closestGuessRankBuckets.set(normalizedGuess, {
          bandLabel,
          emoji,
          bestRankBucket: rankBucket,
          count: (existing?.count ?? 0) + 1,
        });
      } else if (existing.bestRankBucket === rankBucket) {
        existing.count++;
      }
    }
  }

  async updateCrowdMapGuesses(
    puzzleId: string,
    guesses: { guess: string; count: number; embedding: number[] }[]
  ): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    agg.crowdMapGuesses = guesses.slice(0, 500);
  }
}

export const aggregateStore = new InMemoryAggregateStore();
