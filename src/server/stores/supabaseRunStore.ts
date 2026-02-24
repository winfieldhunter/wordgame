import type { Run, RunBest } from "@/server/stores/runStore";
import type { GuessEntry } from "@/server/scoring/types";
import type { RunStore } from "@/server/stores/runStore";
import { getSupabase } from "@/server/stores/supabaseClient";

export class SupabaseRunStore implements RunStore {
  async getRun(puzzleId: string, sessionId: string): Promise<Run | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .eq("puzzle_id", puzzleId)
      .eq("session_id", sessionId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return {
      createdAt: data.created_at,
      endedAt: data.ended_at,
      isWin: data.is_win,
      guesses: (data.guesses ?? []) as GuessEntry[],
      best: data.best as RunBest | null,
    };
  }

  async saveRun(puzzleId: string, sessionId: string, run: Run): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from("runs").upsert(
      {
        puzzle_id: puzzleId,
        session_id: sessionId,
        created_at: run.createdAt,
        ended_at: run.endedAt,
        is_win: run.isWin,
        guesses: run.guesses,
        best: run.best,
      },
      { onConflict: "puzzle_id,session_id" }
    );
    if (error) throw error;
  }

  async appendGuess(
    puzzleId: string,
    sessionId: string,
    entry: GuessEntry,
    best: RunBest | null
  ): Promise<void> {
    const run = await this.getRun(puzzleId, sessionId);
    if (!run) return;
    run.guesses.push(entry);
    run.best = best;
    await this.saveRun(puzzleId, sessionId, run);
  }

  async markEnded(
    puzzleId: string,
    sessionId: string,
    endedAt: string,
    isWin: boolean
  ): Promise<void> {
    const run = await this.getRun(puzzleId, sessionId);
    if (!run) return;
    run.endedAt = endedAt;
    run.isWin = isWin;
    await this.saveRun(puzzleId, sessionId, run);
  }

  async isCompleted(puzzleId: string, sessionId: string): Promise<boolean> {
    const run = await this.getRun(puzzleId, sessionId);
    return run != null && run.endedAt != null;
  }
}
