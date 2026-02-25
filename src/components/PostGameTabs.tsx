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
  hintsUsed: number | null;
  bestGuess: GuessRow | null;
  revealedTarget: string | null;
  onComplete: () => void;
}

type TabId = "path" | "leaderboard" | "friends" | "community" | "map";

export function PostGameTabs({
  sessionId,
  puzzleId,
  guesses,
  isWin,
  maxGuesses,
  hintsUsed,
  bestGuess,
  revealedTarget,
  onComplete,
}: PostGameTabsProps) {
  const [tab, setTab] = useState<TabId>(isWin ? "map" : "path");
  const [shareText, setShareText] = useState<string | null>(null);
  const [completionSent, setCompletionSent] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSaveOrSkip = (skip: boolean) => {
    setSending(true);
    setSendError(null);
    const displayName = skip ? undefined : displayNameInput.trim() || undefined;
    fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        puzzleId,
        displayName,
        hintsUsed: hintsUsed != null && hintsUsed >= 1 && hintsUsed <= 3 ? hintsUsed : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Could not save.");
        return r.json();
      })
      .then((data) => {
        setShareText(data.shareText ?? null);
        setCompletionSent(true);
        onComplete();
      })
      .catch((e) => setSendError(e instanceof Error ? e.message : "Could not save."))
      .finally(() => setSending(false));
  };

  const completed = completionSent;

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

  if (!completionSent) {
    return (
      <section style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-light)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Finish</h2>
        <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-3)" }} role="status" aria-live="polite">
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", color: "var(--text)" }}>
            {isWin ? "You got it!" : "Run finished."}
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Guesses used: {guesses.length}
            {maxGuesses != null && ` / ${maxGuesses}`}
            {hintsUsed != null && hintsUsed >= 1 && ` · Hints used: ${hintsUsed}`}
          </p>
          {!isWin && bestGuess && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Closest: <strong>{bestGuess.normalizedGuess}</strong>
              {bestGuess.percentile != null && ` (${bestGuess.percentile.toFixed(1)}%)`}
            </p>
          )}
          {revealedTarget && !isWin && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              The word was: <strong>{revealedTarget}</strong>
            </p>
          )}
        </div>
        <p id="postgame-name-label" style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Enter your name (optional) to appear on leaderboards:
        </p>
        <input
          type="text"
          value={displayNameInput}
          onChange={(e) => setDisplayNameInput(e.target.value)}
          placeholder="Your name"
          disabled={sending}
          maxLength={100}
          style={{ width: "100%", maxWidth: 280, padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-3)", fontSize: "var(--text-base)" }}
          aria-labelledby="postgame-name-label"
          aria-label="Your display name"
        />
        {sendError && (
          <p role="alert" style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--error)" }}>
            {sendError}
          </p>
        )}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSaveOrSkip(false)}
            disabled={sending}
            style={{ padding: "var(--space-3) var(--space-5)" }}
          >
            {sending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSaveOrSkip(true)}
            disabled={sending}
            style={{ padding: "var(--space-3) var(--space-5)" }}
          >
            Skip
          </button>
        </div>
      </section>
    );
  }

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
          {completed ? (
            <SemanticMap
              sessionId={sessionId}
              puzzleId={puzzleId}
              isWin={isWin}
              clientGuesses={guesses.map((g) => g.normalizedGuess)}
            />
          ) : (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Saving your result…</p>
          )}
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

      {tab === "leaderboard" && (
        completed ? <Leaderboard sessionId={sessionId} puzzleId={puzzleId} /> : <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Saving your result…</p>
      )}

      {tab === "friends" && (
        completed ? <FriendsRanking sessionId={sessionId} puzzleId={puzzleId} /> : <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Saving your result…</p>
      )}

      {tab === "community" && (
        completed ? (
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
        ) : (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Saving your result…</p>
        )
      )}
    </section>
  );
}
