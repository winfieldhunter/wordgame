import type { GuessEntry } from "@/server/scoring/types";

export interface RunBest {
  normalizedGuess: string;
  percentile: number | null;
  cosine: number;
  guessIndex: number;
}

export interface Run {
  createdAt: string;
  endedAt: string | null;
  isWin: boolean | null;
  guesses: GuessEntry[];
  best: RunBest | null;
}

export interface RunStore {
  getRun(puzzleId: string, sessionId: string): Promise<Run | null>;
  saveRun(puzzleId: string, sessionId: string, run: Run): Promise<void>;
  appendGuess(
    puzzleId: string,
    sessionId: string,
    entry: GuessEntry,
    best: RunBest | null
  ): Promise<void>;
  markEnded(
    puzzleId: string,
    sessionId: string,
    endedAt: string,
    isWin: boolean
  ): Promise<void>;
  isCompleted(puzzleId: string, sessionId: string): Promise<boolean>;
}

export class InMemoryRunStore implements RunStore {
  private runs = new Map<string, Map<string, Run>>();

  private ensurePuzzle(puzzleId: string): Map<string, Run> {
    let map = this.runs.get(puzzleId);
    if (!map) {
      map = new Map();
      this.runs.set(puzzleId, map);
    }
    return map;
  }

  async getRun(puzzleId: string, sessionId: string): Promise<Run | null> {
    return this.ensurePuzzle(puzzleId).get(sessionId) ?? null;
  }

  async saveRun(puzzleId: string, sessionId: string, run: Run): Promise<void> {
    this.ensurePuzzle(puzzleId).set(sessionId, run);
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
  }

  async isCompleted(puzzleId: string, sessionId: string): Promise<boolean> {
    const run = await this.getRun(puzzleId, sessionId);
    return run != null && run.endedAt != null;
  }
}

export const runStore = new InMemoryRunStore();
