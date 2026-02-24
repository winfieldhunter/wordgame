"use client";

import { useState, useEffect } from "react";
import { CommunitySummary } from "./CommunitySummary";
import { SemanticMap } from "./SemanticMap";
import { ShareButton } from "./ShareButton";
import { FriendsRanking } from "./FriendsRanking";
import { Leaderboard } from "./Leaderboard";

interface GuessRow {
  normalizedGuess: string;
  cosine: number;
  percentile: number | null;
  band: { label: string; emoji: string };
  guessIndex: number;
}

interface PostGameTabsProps {
  sessionId: string;
  puzzleId: string;
  guesses: GuessRow[];
  isWin: boolean;
  maxGuesses: number | null;
  onComplete: () => void;
}

type TabId = "path" | "leaderboard" | "friends" | "community" | "map";

export function PostGameTabs({
  sessionId,
  puzzleId,
  guesses,
  isWin,
  maxGuesses,
  onComplete,
}: PostGameTabsProps) {
  const [tab, setTab] = useState<TabId>(isWin ? "map" : "path");
  const [shareText, setShareText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!completed) {
      fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, puzzleId }),
      })
        .then((r) => r.json())
        .then((data) => {
          setShareText(data.shareText ?? null);
          setCompleted(true);
          onComplete();
        })
        .catch(() => setCompleted(true));
    }
  }, [sessionId, puzzleId, completed, onComplete]);

  const fallbackShare =
    shareText ??
    (maxGuesses != null
      ? `NearWord #${puzzleId}\n${guesses.length}/${maxGuesses} guesses`
      : `NearWord #${puzzleId}\n${guesses.length} guesses`);

  const tabs: { id: TabId; label: string }[] = [
    { id: "map", label: "Map" },
    { id: "path", label: "Your guesses" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "friends", label: "Friends" },
    { id: "community", label: "Community" },
  ];

  return (
    <section style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-light)" }}>
      <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Share & explore</h2>
      <ShareButton shareText={fallbackShare} />
      <div
        className="post-game-tabs"
        style={{
          display: "flex",
          gap: "var(--space-1)",
          marginBottom: "var(--space-3)",
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "var(--space-2)",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "btn-primary post-game-tab post-game-tab--selected" : "btn-secondary post-game-tab"}
            style={{
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-sm)",
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "map" && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <SemanticMap sessionId={sessionId} puzzleId={puzzleId} isWin={isWin} />
        </div>
      )}

      {tab === "path" && (
        <details
          className="card"
          style={{ padding: "var(--space-3) var(--space-4)" }}
          open={true}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "var(--text-base)", listStyle: "none" }}>
            Your guesses
          </summary>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-base)", color: "var(--text)" }}>
            Best guess:{" "}
            <strong>
              {guesses.length > 0
                ? guesses.reduce((best, g) =>
                    (g.percentile ?? 0) > (best.percentile ?? 0) ? g : best
                  ).normalizedGuess
                : ""}
            </strong>
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Band progression: {guesses.map((g) => g.band.label).join(" → ")}
          </p>
        </details>
      )}

      {tab === "leaderboard" && <Leaderboard sessionId={sessionId} puzzleId={puzzleId} />}

      {tab === "friends" && <FriendsRanking sessionId={sessionId} puzzleId={puzzleId} />}

      {tab === "community" && (
        <CommunitySummary
          sessionId={sessionId}
          puzzleId={puzzleId}
          yourBestGuessIndex={
            guesses.length > 0
              ? guesses.reduce((best, g) =>
                  (g.percentile ?? 0) > (best.percentile ?? 0) ? g : best
                ).guessIndex
              : 0
          }
        />
      )}
    </section>
  );
}
