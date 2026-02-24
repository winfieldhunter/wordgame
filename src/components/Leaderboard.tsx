"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  rank: number;
  label: string;
  isYou: boolean;
  isWin: boolean;
  guessCount: number;
  bestPercentile: number | null;
}

interface LeaderboardProps {
  sessionId: string;
  puzzleId: string;
}

export function Leaderboard({ sessionId, puzzleId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !puzzleId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ puzzleId, sessionId });
    fetch(`/api/leaderboard?${params}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [sessionId, puzzleId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Loading today’s leaderboard…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
          No one has completed today’s puzzle yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Today’s leaderboard — best scores for this puzzle.
      </p>
      <ul style={{ margin: 0, paddingLeft: "var(--space-4)", listStyle: "decimal" }}>
        {entries.map((e) => (
          <li key={e.rank} style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
            <span style={{ fontWeight: e.isYou ? 600 : 400, color: e.isYou ? "var(--text)" : "var(--text-muted)" }}>
              {e.label}
            </span>
            {e.isWin ? (
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                — Got it in {e.guessCount} {e.guessCount === 1 ? "guess" : "guesses"}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                — Closest: {e.bestPercentile != null ? `${e.bestPercentile.toFixed(1)}%` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
