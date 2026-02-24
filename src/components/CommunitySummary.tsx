"use client";

import { useEffect, useState } from "react";

interface CommunitySummaryProps {
  sessionId: string;
  puzzleId: string;
  yourBestGuessIndex?: number;
}

interface CommunityData {
  stats: { totalRuns: number; winRate: number; guessCountHistogram: Array<{ guessCount: number; runs: number }> };
  commonGuesses: Array<{ guess: string; count: number; band: string; emoji: string }>;
  commonTopGuesses: Array<{ guess: string; count: number; band: string; emoji: string }>;
  closestGuessesPublic: Array<{ guess: string; band: string; emoji: string; rankBucket: string }>;
  yourVsCrowd: {
    yourBestGuessIndex: number;
    medianBestGuessIndex: number;
    percentileOfYourEfficiency?: number;
    youWere: string;
  };
}

export function CommunitySummary({
  sessionId,
  puzzleId,
  yourBestGuessIndex = 0,
}: CommunitySummaryProps) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/community/${puzzleId}?sessionId=${sessionId}`)
      .then((r) => {
        if (r.status === 403) throw new Error("Complete the puzzle first.");
        if (!r.ok) throw new Error("Could not load community data.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, puzzleId]);

  if (loading) return <p style={{ color: "var(--text-subtle)" }}>Loading…</p>;
  if (err) return <p style={{ color: "var(--error)" }}>{err}</p>;
  if (!data) return null;

  const { stats, commonGuesses, closestGuessesPublic, yourVsCrowd } = data;

  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", color: "var(--text)" }}>
        {stats.totalRuns} runs · {(stats.winRate * 100).toFixed(0)}% win rate
      </p>
      <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
        You reached your best guess in {yourVsCrowd.yourBestGuessIndex} tries.
        {typeof yourVsCrowd.percentileOfYourEfficiency === "number" &&
          ` You finished faster than ${yourVsCrowd.percentileOfYourEfficiency.toFixed(0)}% of players.`}
      </p>

      <h3 style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Most common guesses</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--space-4)" }}>
        {(commonGuesses ?? []).slice(0, 10).map((g) => (
          <li key={g.guess} style={{ padding: "var(--space-1) 0", fontSize: "var(--text-base)" }}>
            {g.guess} <span style={{ color: "var(--text-subtle)" }}>({g.count})</span>
          </li>
        ))}
      </ul>

      <h3 style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Closest guesses (band only)</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {(closestGuessesPublic ?? []).slice(0, 10).map((g) => (
          <li key={g.guess} style={{ padding: "var(--space-1) 0", fontSize: "var(--text-base)" }}>
            {g.guess} — {g.rankBucket}
          </li>
        ))}
      </ul>
    </div>
  );
}
