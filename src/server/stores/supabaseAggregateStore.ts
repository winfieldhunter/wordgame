import type {
  PuzzleAggregate,
  ClosestGuessBucket,
  CrowdMapGuess,
  AggregateStore,
} from "@/server/stores/aggregateStore";
import { getSupabase } from "@/server/stores/supabaseClient";

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

function fromRow(row: {
  total_runs: number;
  total_wins: number;
  guess_count_histogram: Record<string, number>;
  guess_counts: Record<string, number>;
  close_guess_counts: Record<string, number>;
  closest_guess_rank_buckets: Record<string, ClosestGuessBucket>;
  crowd_map_guesses: CrowdMapGuess[];
}): PuzzleAggregate {
  const agg = newAggregate();
  agg.totalRuns = row.total_runs ?? 0;
  agg.totalWins = row.total_wins ?? 0;
  if (row.guess_count_histogram && typeof row.guess_count_histogram === "object") {
    for (const [k, v] of Object.entries(row.guess_count_histogram))
      agg.guessCountHistogram.set(Number(k), v);
  }
  if (row.guess_counts && typeof row.guess_counts === "object") {
    for (const [k, v] of Object.entries(row.guess_counts))
      agg.guessCounts.set(k, v);
  }
  if (row.close_guess_counts && typeof row.close_guess_counts === "object") {
    for (const [k, v] of Object.entries(row.close_guess_counts))
      agg.closeGuessCounts.set(k, v);
  }
  if (row.closest_guess_rank_buckets && typeof row.closest_guess_rank_buckets === "object") {
    for (const [k, v] of Object.entries(row.closest_guess_rank_buckets))
      agg.closestGuessRankBuckets.set(k, v as ClosestGuessBucket);
  }
  if (Array.isArray(row.crowd_map_guesses)) agg.crowdMapGuesses = row.crowd_map_guesses;
  return agg;
}

function toRow(agg: PuzzleAggregate): Record<string, unknown> {
  const histogram: Record<string, number> = {};
  agg.guessCountHistogram.forEach((v, k) => (histogram[String(k)] = v));
  const guessCounts: Record<string, number> = {};
  agg.guessCounts.forEach((v, k) => (guessCounts[k] = v));
  const closeGuessCounts: Record<string, number> = {};
  agg.closeGuessCounts.forEach((v, k) => (closeGuessCounts[k] = v));
  const closestGuessRankBuckets: Record<string, ClosestGuessBucket> = {};
  agg.closestGuessRankBuckets.forEach((v, k) => (closestGuessRankBuckets[k] = v));
  return {
    total_runs: agg.totalRuns,
    total_wins: agg.totalWins,
    guess_count_histogram: histogram,
    guess_counts: guessCounts,
    close_guess_counts: closeGuessCounts,
    closest_guess_rank_buckets: closestGuessRankBuckets,
    crowd_map_guesses: agg.crowdMapGuesses,
    updated_at: new Date().toISOString(),
  };
}

export class SupabaseAggregateStore implements AggregateStore {
  async getAggregate(puzzleId: string): Promise<PuzzleAggregate | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("puzzle_aggregates")
      .select("*")
      .eq("puzzle_id", puzzleId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return fromRow(data as Parameters<typeof fromRow>[0]);
  }

  async getOrCreateAggregate(puzzleId: string): Promise<PuzzleAggregate> {
    const existing = await this.getAggregate(puzzleId);
    if (existing) return existing;
    const agg = newAggregate();
    await this.putAggregate(puzzleId, agg);
    return agg;
  }

  private async putAggregate(puzzleId: string, agg: PuzzleAggregate): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from("puzzle_aggregates").upsert(
      { puzzle_id: puzzleId, ...toRow(agg) },
      { onConflict: "puzzle_id" }
    );
    if (error) throw error;
  }

  async incrementRun(puzzleId: string, isWin: boolean): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    agg.totalRuns++;
    if (isWin) agg.totalWins++;
    await this.putAggregate(puzzleId, agg);
  }

  async recordGuessCount(puzzleId: string, count: number): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    const prev = agg.guessCountHistogram.get(count) ?? 0;
    agg.guessCountHistogram.set(count, prev + 1);
    await this.putAggregate(puzzleId, agg);
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
    await this.putAggregate(puzzleId, agg);
  }

  async updateCrowdMapGuesses(
    puzzleId: string,
    guesses: { guess: string; count: number; embedding: number[] }[]
  ): Promise<void> {
    const agg = await this.getOrCreateAggregate(puzzleId);
    agg.crowdMapGuesses = guesses.slice(0, 500);
    await this.putAggregate(puzzleId, agg);
  }
}
